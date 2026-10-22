/**
 * 本机音频优先级仲裁。
 *
 * 页面里只有一条共享 `HTMLAudioElement`，房间同步播放、搜索结果试听和聊天音乐卡片
 * 会互相抢同一份音频输出。这里用一个互斥锁决定「谁现在拥有音频」：
 * 后来者接管时把当前占用者挤掉，被挤掉的一方必须自己停止播放（不自动恢复），
 * 免得用户听到「莫名其妙又响起来」的第二段音频。房间跟播只能被动让路。
 */

type LocalAudioOwner = 'preview' | 'chat_card';

type Owner = {
  /** 被其它本机播放接管时调用：应停止自己的播放并清理状态 */
  onInterrupt: () => void;
};

const owners = new Map<LocalAudioOwner, Owner>();
let activeOwner: LocalAudioOwner | null = null;
/** 房间正在播放时被本机播放暂停过；由最后释放音频的一方消费一次 */
let roomPausedForLocalPlayback = false;

/** 当前是否有本机播放占用音频（房间跟播应暂停并停止对齐） */
export function isRoomAudioTakenOver(): boolean {
  return activeOwner !== null;
}

/** 当前占用音频的播放器（用于提示文案与用户主动恢复时结束正确的播放器） */
export function getRoomAudioOwner(): LocalAudioOwner | null {
  return activeOwner;
}

/** 接管音频；当前占用者会收到 onInterrupt */
export function acquireRoomAudio(owner: LocalAudioOwner, onInterrupt: () => void): void {
  const existing = owners.get(owner);
  if (existing) existing.onInterrupt = onInterrupt;
  else owners.set(owner, { onInterrupt });

  if (activeOwner === owner) return;
  const interrupted = activeOwner;
  activeOwner = owner;
  if (interrupted) owners.get(interrupted)?.onInterrupt();
}

/**
 * 释放音频。只有当前占用者释放才生效，避免把已经接管的后来者一起放掉；
 * 释放后不会自动恢复任何先前被挤掉的播放，调用方按需消费一次「回归房间播放」。
 */
export function releaseRoomAudio(owner: LocalAudioOwner): boolean {
  if (activeOwner !== owner) return false;
  activeOwner = null;
  return true;
}

/** 注销占用者（播放结束、组件卸载、离开房间） */
export function unregisterRoomAudio(owner: LocalAudioOwner): void {
  owners.delete(owner);
  if (activeOwner === owner) activeOwner = null;
}

/** 记录「本机播放暂停了正在播放的房间音频」 */
export function markRoomPausedForLocalPlayback(): void {
  roomPausedForLocalPlayback = true;
}

/**
 * 消费一次回归房间播放的请求。只能被消费一次，避免多个播放器重复恢复，
 * 也避免离开房间后留下陈旧标记。
 */
export function consumeRoomResumeRequest(): boolean {
  if (!roomPausedForLocalPlayback) return false;
  roomPausedForLocalPlayback = false;
  return true;
}

/** 离开房间 / 重置会话时清空全部本机占用 */
export function resetRoomAudioPriority(): void {
  owners.clear();
  activeOwner = null;
  roomPausedForLocalPlayback = false;
}