import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getRuntimeConfig } from './runtimeConfig.js';

const PREFIX = 'enc:v1:';
const DEFAULT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function parseKey(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const key = /^[a-f\d]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  return key.length === 32 ? key : null;
}

function getKeys() {
  return [
    parseKey(getRuntimeConfig().roomCredentialEncryptionKey || process.env.ROOM_CREDENTIAL_ENCRYPTION_KEY),
    ...String(process.env.ROOM_CREDENTIAL_ENCRYPTION_KEY_PREVIOUS || '').split(',').map(parseKey),
  ].filter(Boolean);
}

function sensitiveAad(scope) {
  return Buffer.from(`openmusic:sensitive:${String(scope || '')}`, 'utf8');
}

export function encryptSensitiveValue(value, scope) {
  const plain = String(value || '');
  const key = getKeys()[0];
  if (!plain || !key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(sensitiveAad(scope));
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${PREFIX}${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')}`;
}

export function decryptSensitiveValue(value, scope) {
  const stored = String(value || '');
  if (!stored.startsWith(PREFIX)) return stored || null;
  const payload = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (payload.length < 29) return null;
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
      decipher.setAAD(sensitiveAad(scope));
      decipher.setAuthTag(payload.subarray(12, 28));
      return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8');
    } catch {
      // Try rotation keys.
    }
  }
  return null;
}

export function hasRoomCredentialEncryptionKey() {
  return getKeys().length > 0;
}

function aad(roomId, platform) {
  return Buffer.from(`openmusic:room-credential:${roomId}:${platform}`, 'utf8');
}

export function encryptRoomCredential(value, roomId, platform, now = Date.now()) {
  const credential = String(value || '').trim();
  if (!credential) return null;
  const key = getKeys()[0];
  if (!key) throw new Error('存在房间音乐凭证，但未配置 ROOM_CREDENTIAL_ENCRYPTION_KEY');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad(roomId, platform));
  const maxAge = Math.max(60_000, Number(process.env.ROOM_CREDENTIAL_MAX_AGE_MS) || DEFAULT_MAX_AGE_MS);
  const plaintext = Buffer.from(JSON.stringify({ value: credential, createdAt: now, expiresAt: now + maxAge }));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString('base64url')}`;
}

export function decryptRoomCredential(value, roomId, platform, now = Date.now()) {
  const stored = String(value || '').trim();
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;
  const payload = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (payload.length < 29) return null;
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
      decipher.setAAD(aad(roomId, platform));
      decipher.setAuthTag(payload.subarray(12, 28));
      const decoded = JSON.parse(Buffer.concat([
        decipher.update(payload.subarray(28)),
        decipher.final(),
      ]).toString('utf8'));
      if (Number(decoded.expiresAt) <= now) return null;
      return String(decoded.value || '').trim() || null;
    } catch {
      // Try the next rotation key.
    }
  }
  return null;
}

export function encryptRoomSecrets(secrets, roomId) {
  const source = secrets && typeof secrets === 'object' ? secrets : {};
  return Object.fromEntries(['netease', 'tencent', 'kugou', 'qishui'].map((platform) => [
    platform,
    encryptRoomCredential(source[platform], roomId, platform),
  ]));
}

export function decryptRoomSecrets(secrets, roomId) {
  const source = secrets && typeof secrets === 'object' ? secrets : {};
  return Object.fromEntries(['netease', 'tencent', 'kugou', 'qishui'].map((platform) => [
    platform,
    decryptRoomCredential(source[platform], roomId, platform),
  ]));
}
