/**
 * 每房间独立的 AI 对话上下文（内存，不跨房间、不跨站）。
 */
import { trimMapByUpdatedAt } from './roomAiMemory.js';

const contexts = new Map();
const MAX_CONTEXT_ROOMS = 280;

const MAX_CONTEXT_MESSAGES = 30;
const TTL_MS = 2 * 60 * 60 * 1000;

function roomKey(roomId, userId = '') {
  const user = String(userId || '').trim();
  if (user) return `${String(roomId || '').trim().toUpperCase()}:${user}`;
  return String(roomId || '').trim().toUpperCase();
}

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of contexts) {
    if (now - (entry.updatedAt || 0) > TTL_MS) contexts.delete(key);
  }
  trimMapByUpdatedAt(contexts, MAX_CONTEXT_ROOMS, (v) => v?.updatedAt || 0);
}

export function appendRoomAiTurn(roomId, userId, role, content) {
  const key = roomKey(roomId, userId);
  if (!key) return;
  const text = String(content || '').trim();
  if (!text) return;
  pruneExpired();
  let entry = contexts.get(key);
  if (!entry) {
    entry = { turns: [], updatedAt: Date.now() };
    contexts.set(key, entry);
  }
  entry.turns.push({
    role: role === 'assistant' ? 'assistant' : 'user',
    content: text.slice(0, 2000),
    at: Date.now(),
  });
  if (entry.turns.length > MAX_CONTEXT_MESSAGES) {
    entry.turns.splice(0, entry.turns.length - MAX_CONTEXT_MESSAGES);
  }
  entry.updatedAt = Date.now();
}

/** 供硅基流动 messages 数组使用的历史（不含 system） */
export function getRoomAiContextMessages(roomId, userId) {
  const key = roomKey(roomId, userId);
  if (!key) return [];
  pruneExpired();
  const entry = contexts.get(key);
  if (!entry?.turns?.length) return [];
  if (Date.now() - (entry.updatedAt || 0) > TTL_MS) {
    contexts.delete(key);
    return [];
  }
  return entry.turns.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
}

export function clearRoomAiContext(roomId) {
  const key = roomKey(roomId);
  if (!key) return;
  for (const contextKey of contexts.keys()) {
    if (contextKey === key || contextKey.startsWith(`${key}:`)) contexts.delete(contextKey);
  }
}
