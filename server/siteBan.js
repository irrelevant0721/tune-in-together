import { isIP } from 'node:net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';
import { getRedisClient } from './roomStorage.js';
import { sanitizeDeviceId } from './deviceIdentity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 旧版本地文件，仅启动时迁移进 Redis 后删除 */
const LEGACY_LOCAL_PATH = path.join(__dirname, 'siteBans.json');
const REDIS_KEY = 'openmusic:site:bans';
const generateBanId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
const MAX_REASON_LENGTH = 120;
const MAX_BANS = 500;

/** @type {Array<{ id: string, type: 'ip'|'device', value: string, reason: string, source: 'manual', at: number }>} */
let bans = [];

function normalizeIp(raw) {
  let ip = String(raw || '').replace(/^::ffff:/, '').trim();
  if (!ip) return '';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  const v4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) ip = v4WithPort[1];
  return isIP(ip) ? ip : '';
}

function normalizeBanValue(type, value) {
  if (type === 'ip') return normalizeIp(value);
  if (type === 'device') return sanitizeDeviceId(value);
  return '';
}

function sanitizeBanList(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      const type = item?.type === 'device' ? 'device' : (item?.type === 'ip' ? 'ip' : '');
      const value = normalizeBanValue(type, item?.value);
      if (!type || !value) return null;
      // 已废弃自动封禁：历史 auto 记录直接丢弃
      if (item?.source === 'auto') return null;
      return {
        id: String(item.id || generateBanId()).slice(0, 32),
        type,
        value,
        reason: String(item.reason || '').trim().slice(0, MAX_REASON_LENGTH),
        source: 'manual',
        at: Number(item.at) || Date.now(),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_BANS);
}

function readLegacyLocalBans() {
  try {
    if (!fs.existsSync(LEGACY_LOCAL_PATH)) return [];
    return sanitizeBanList(JSON.parse(fs.readFileSync(LEGACY_LOCAL_PATH, 'utf8')));
  } catch (err) {
    console.error('site-ban 旧本地文件读取失败:', err?.message || err);
    return [];
  }
}

function deleteLegacyLocalBans() {
  try {
    if (fs.existsSync(LEGACY_LOCAL_PATH)) fs.unlinkSync(LEGACY_LOCAL_PATH);
  } catch (err) {
    console.warn('site-ban 删除旧本地文件失败:', err?.message || err);
  }
}

async function persistBans() {
  const client = getRedisClient();
  if (!client) throw new Error('Redis 不可用，封禁无法保存');
  await client.set(REDIS_KEY, JSON.stringify(bans));
}

/** 启动时从 Redis 加载；若有旧本地文件则迁入 Redis 后删除。需在 Redis 就绪后调用 */
export async function initSiteBans() {
  const client = getRedisClient();
  if (!client) {
    bans = [];
    console.error('site-ban: Redis 不可用，封禁列表为空');
    return;
  }

  const wipeMarkerKey = 'openmusic:site:bans:wiped_v2';
  try {
    const wiped = await client.get(wipeMarkerKey);
    if (!wiped) {
      // 误伤恢复：强制清空 Redis 封禁列表（含手动/自动残留）
      await client.set(REDIS_KEY, '[]');
      await client.del('openmusic:site:bans:wiped_v1').catch(() => {});
      await client.set(wipeMarkerKey, new Date().toISOString());
      bans = [];
      deleteLegacyLocalBans();
      console.log('site-ban: 已强制清空 Redis 全站封禁 openmusic:site:bans（wiped_v2）');
      return;
    }
  } catch (err) {
    console.error('site-ban 清空标记读写失败:', err?.message || err);
  }

  try {
    const raw = await client.get(REDIS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawCount = Array.isArray(parsed) ? parsed.length : 0;
      bans = sanitizeBanList(parsed);
      deleteLegacyLocalBans();
      if (rawCount !== bans.length) {
        try {
          await persistBans();
          console.log(`site-ban: 已丢弃 ${rawCount - bans.length} 条历史自动封禁`);
        } catch (persistErr) {
          console.error('site-ban 清理自动封禁写回失败:', persistErr?.message || persistErr);
        }
      }
      return;
    }
  } catch (err) {
    console.error('site-ban Redis 读取失败:', err?.message || err);
  }

  const legacy = readLegacyLocalBans();
  if (legacy.length > 0) {
    bans = legacy;
    try {
      await client.set(REDIS_KEY, JSON.stringify(bans));
      deleteLegacyLocalBans();
      console.log(`site-ban: 已迁移 ${bans.length} 条旧本地封禁到 Redis`);
    } catch (err) {
      console.error('site-ban Redis 迁移失败:', err?.message || err);
      bans = [];
    }
  } else {
    bans = [];
    deleteLegacyLocalBans();
  }
}

export function listSiteBans() {
  return bans.slice().sort((a, b) => b.at - a.at);
}

export function isSiteBanned({ ip, deviceId } = {}) {
  const normalizedIp = normalizeIp(ip);
  const normalizedDevice = sanitizeDeviceId(deviceId);
  for (const ban of bans) {
    if (ban.type === 'ip' && normalizedIp && ban.value === normalizedIp) return ban;
    if (ban.type === 'device' && normalizedDevice && ban.value === normalizedDevice) return ban;
  }
  return null;
}

export async function addSiteBan({ type, value, reason } = {}) {
  const banType = type === 'device' ? 'device' : (type === 'ip' ? 'ip' : '');
  const normalized = normalizeBanValue(banType, value);
  if (!banType) return { success: false, error: '封禁类型无效（ip / device）' };
  if (!normalized) {
    return { success: false, error: banType === 'ip' ? 'IP 地址无效' : 'deviceId 无效' };
  }
  if (bans.some((b) => b.type === banType && b.value === normalized)) {
    return { success: false, error: '该目标已在封禁列表中' };
  }
  if (bans.length >= MAX_BANS) {
    return { success: false, error: `封禁列表已达上限（${MAX_BANS}）` };
  }

  const entry = {
    id: generateBanId(),
    type: banType,
    value: normalized,
    reason: String(reason || '').trim().slice(0, MAX_REASON_LENGTH),
    source: 'manual',
    at: Date.now(),
  };
  bans.unshift(entry);
  try {
    await persistBans();
  } catch (err) {
    bans = bans.filter((b) => b.id !== entry.id);
    return { success: false, error: err.message || '封禁保存失败' };
  }
  return { success: true, ban: entry };
}

export async function removeSiteBan(banId) {
  const id = String(banId || '').trim();
  const before = bans;
  const next = bans.filter((b) => b.id !== id);
  if (next.length === before.length) return { success: false, error: '封禁记录不存在' };
  bans = next;
  try {
    await persistBans();
  } catch (err) {
    bans = before;
    return { success: false, error: err.message || '封禁保存失败' };
  }
  return { success: true };
}
