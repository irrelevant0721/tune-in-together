/**
 * 按全站封禁条目踢出匹配的在线连接。
 * 供管理后台手动封禁与自动建房拉黑共用。
 */
import { sanitizeDeviceId } from './deviceIdentity.js';

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

/**
 * @returns {{ kicked: number }}
 */
export function kickConnectionsMatchingBan(ban, ctx = {}) {
  const {
    io,
    socketToRoom,
    socketToUserId,
    getClientIp,
    getRoomInternal,
    removeUser,
    prepareRoomBroadcast,
    roomUpdateForViewer,
  } = ctx;

  if (!ban || !io || !socketToRoom || !socketToUserId) {
    return { kicked: 0 };
  }

  let kicked = 0;
  const affectedRooms = new Set();

  for (const [sid, userId] of socketToUserId.entries()) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    const sockIp = getClientIp?.(s.request) || '';
    const cookies = parseCookieHeader(s.handshake?.headers?.cookie || '');
    const deviceId = sanitizeDeviceId(cookies.openmusic_did);
    const roomId = socketToRoom.get(sid);
    const user = roomId ? getRoomInternal?.(roomId)?.users?.get(userId) : null;

    let match = false;
    if (ban.type === 'ip') {
      if ((sockIp && sockIp === ban.value) || (user?.clientIp && user.clientIp === ban.value)) {
        match = true;
      }
    } else if (ban.type === 'device') {
      if ((deviceId && deviceId === ban.value) || (user?.deviceId && user.deviceId === ban.value)) {
        match = true;
      }
    }
    if (!match) continue;

    if (roomId && typeof removeUser === 'function') {
      removeUser(roomId, userId, sid);
      affectedRooms.add(roomId);
      s.leave(roomId);
    }
    socketToRoom.delete(sid);
    socketToUserId.delete(sid);
    s.emit('kicked', { message: '连接已断开，请刷新后重试', stopReconnect: true });
    s.disconnect(true);
    kicked += 1;
  }

  if (typeof prepareRoomBroadcast === 'function' && typeof roomUpdateForViewer === 'function') {
    for (const roomId of affectedRooms) {
      const prepared = prepareRoomBroadcast(roomId);
      if (!prepared) continue;
      for (const [sid, rid] of socketToRoom.entries()) {
        if (rid !== roomId) continue;
        const s = io.sockets.sockets.get(sid);
        s?.emit('room_update', roomUpdateForViewer(prepared, socketToUserId.get(sid)));
      }
    }
  }

  return { kicked };
}
