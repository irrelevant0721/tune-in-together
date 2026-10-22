import { randomUUID } from 'crypto';
import { getRedisClient } from './roomStorage.js';

const REDIS_KEY = 'openmusic:site:donations';
const MAX_NAME_LENGTH = 40;
const MAX_DATE_LENGTH = 20;
const MAX_AMOUNT = 9_999_999;

let entries = [];

function sanitizeEntry(raw = {}) {
  const name = String(raw.name || '').trim().slice(0, MAX_NAME_LENGTH);
  const date = String(raw.date || '').trim().slice(0, MAX_DATE_LENGTH);
  const amountValue = Number(raw.amount);
  return {
    id: String(raw.id || randomUUID()).trim().slice(0, 64),
    name,
    date: date || new Date().toISOString().slice(0, 10),
    amount: Number.isFinite(amountValue) && amountValue > 0
      ? Math.min(Math.round(amountValue * 100) / 100, MAX_AMOUNT)
      : 0,
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

function normalizeEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeEntry).filter((entry) => entry.name);
}

export async function initDonations() {
  const client = getRedisClient();
  if (!client) {
    entries = [];
    console.error('donations: Redis 不可用，捐赠名单为空');
    return;
  }
  try {
    const raw = await client.get(REDIS_KEY);
    entries = raw ? normalizeEntries(JSON.parse(raw)) : [];
  } catch (err) {
    console.error('捐赠名单 Redis 读取失败:', err?.message || err);
    entries = [];
  }
}

export function listDonations() {
  return entries.map(({ id, name, date, amount }) => ({ id, name, date, amount }));
}

export function listDonationsForAdmin() {
  return entries;
}

async function persist(next) {
  const client = getRedisClient();
  if (!client) return { success: false, error: 'Redis 不可用，捐赠名单无法保存' };
  try {
    await client.set(REDIS_KEY, JSON.stringify(next));
    entries = next;
    return { success: true };
  } catch (err) {
    return { success: false, error: `捐赠名单写入 Redis 失败：${err?.message || err}` };
  }
}

export async function addDonation(raw = {}) {
  const entry = sanitizeEntry(raw);
  if (!entry.name) return { success: false, error: '署名不能为空' };
  const result = await persist([entry, ...entries]);
  return result.success ? { success: true, donation: entry } : result;
}

export async function updateDonation(id, raw = {}) {
  const index = entries.findIndex((entry) => entry.id === String(id || '').trim());
  if (index < 0) return { success: false, error: '捐赠记录不存在' };
  const current = entries[index];
  const entry = sanitizeEntry({ ...current, ...raw, id: current.id, createdAt: current.createdAt });
  if (!entry.name) return { success: false, error: '署名不能为空' };
  const next = [...entries];
  next[index] = entry;
  const result = await persist(next);
  return result.success ? { success: true, donation: entry } : result;
}

export async function removeDonation(id) {
  const target = String(id || '').trim();
  const next = entries.filter((entry) => entry.id !== target);
  if (next.length === entries.length) return { success: false, error: '捐赠记录不存在' };
  const result = await persist(next);
  return result.success ? { success: true } : result;
}
