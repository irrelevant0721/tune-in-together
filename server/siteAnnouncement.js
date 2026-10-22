import { getRedisClient } from './roomStorage.js';

const REDIS_KEY = 'openmusic:site:announcement';
const MAX_TITLE_LENGTH = 40;
const MAX_TEXT_LENGTH = 4000;

/** 当前生效的公告（进程内缓存，持久化只写 Redis） */
let current = emptyPayload();

function emptyPayload() {
  return {
    enabled: false,
    id: '',
    title: '站点公告',
    text: '',
  };
}

// 内部存储保留草稿（停用时也保留 title/text，便于后台再次启用）
function sanitize(raw = {}) {
  const id = String(raw.id || '').trim().slice(0, 64);
  const title = String(raw.title || '站点公告').trim().slice(0, MAX_TITLE_LENGTH) || '站点公告';
  const text = String(raw.text || '').trim().slice(0, MAX_TEXT_LENGTH);
  return {
    enabled: Boolean(raw.enabled) && Boolean(id) && Boolean(text),
    id,
    title,
    text,
  };
}

/** 启动时从 Redis 加载；需在 Redis 就绪后调用。 */
export async function initSiteAnnouncement() {
  const client = getRedisClient();
  if (!client) {
    current = emptyPayload();
    console.error('site-announcement: Redis 不可用，公告为空');
    return;
  }
  try {
    const raw = await client.get(REDIS_KEY);
    if (raw) current = sanitize(JSON.parse(raw));
  } catch (err) {
    console.error('site-announcement Redis 读取失败:', err?.message || err);
  }
}

/** 公开接口视图：停用时不泄露草稿内容 */
export function getSiteAnnouncement() {
  if (!current.enabled) {
    return { enabled: false, id: '', title: current.title, text: '' };
  }
  return current;
}

/** 管理后台视图：含停用状态下保留的草稿 */
export function getSiteAnnouncementForAdmin() {
  return current;
}

/**
 * 管理后台保存公告。
 * @param {{ enabled?: boolean, title?: string, text?: string, bumpId?: boolean }} raw
 * bumpId=true 或首次启用时生成新 id（已读用户会重新弹窗）
 */
export async function setSiteAnnouncement(raw = {}) {
  const enabled = Boolean(raw.enabled);
  const title = String(raw.title || '站点公告').trim().slice(0, MAX_TITLE_LENGTH) || '站点公告';
  const text = String(raw.text || '').trim().slice(0, MAX_TEXT_LENGTH);

  if (enabled && !text) {
    return { success: false, error: '公告内容不能为空' };
  }

  let id = current.id;
  if (enabled && (raw.bumpId || !id)) {
    id = `a${Date.now().toString(36)}`;
  }

  const payload = sanitize({ enabled, id, title, text });
  const previous = current;
  current = payload;

  const client = getRedisClient();
  if (!client) {
    current = previous;
    return { success: false, error: 'Redis 不可用，公告无法保存' };
  }
  try {
    await client.set(REDIS_KEY, JSON.stringify(payload));
  } catch (err) {
    current = previous;
    console.error('site-announcement Redis 写入失败:', err?.message || err);
    return { success: false, error: '公告写入 Redis 失败' };
  }

  return { success: true, announcement: payload };
}
