export const DEFAULT_FM_MODE = 'DEFAULT';

/** 关闭漫游：队列放空后停止播放，不自动推荐（不作为列表选项展示） */
export const FM_MODE_OFF = 'OFF';

export type FmSource = 'netease' | 'tencent' | 'kugou' | 'qishui';

export interface FmModeOption {
  value: string;
  label: string;
  description?: string;
}

export const NETEASE_FM_MODE_OPTIONS: FmModeOption[] = [
  { value: 'DEFAULT', label: '默认漫游', description: '综合听歌记录，常规个性化推荐' },
  { value: 'FAMILIAR', label: '熟悉模式', description: '多推收藏、常听与相似曲风' },
  { value: 'EXPLORE', label: '探索模式', description: '多推新歌、冷门歌，拓展曲库' },
  { value: 'SCENE_RCMD:EXERCISE', label: '运动场景', description: '节奏明快，适合锻炼' },
  { value: 'SCENE_RCMD:FOCUS', label: '专注场景', description: '适合工作、学习，偏轻音乐' },
  { value: 'SCENE_RCMD:NIGHT_EMO', label: '深夜场景', description: '夜晚情绪向慢歌' },
  { value: 'aidj', label: 'AI DJ', description: 'AI 串烧混剪，曲间带过渡衔接' },
];

/** QQ 音乐私人漫游：官方固定猜你喜欢（radio id=99），不支持其它模式。 */
export const TENCENT_FM_MODE_OPTIONS: FmModeOption[] = [
  { value: 'DEFAULT', label: '猜你喜欢', description: 'QQ 音乐个性化推荐' },
];

/** 酷狗私人漫游：Provider 仅提供默认个人推荐。 */
export const KUGOU_FM_MODE_OPTIONS: FmModeOption[] = [
  { value: 'DEFAULT', label: '推荐模式', description: '酷狗音乐个人推荐' },
];

/** 汽水 PC 漫游模式：默认推荐不传 preference，由接口走 daily_mix。 */
export const QISHUI_FM_MODE_OPTIONS: FmModeOption[] = [
  { value: 'DEFAULT', label: '推荐模式', description: '综合你的听歌偏好，智能推荐歌曲' },
  { value: 'FAMILIAR', label: '熟悉模式', description: '更多你听过或相似风格的歌曲' },
  { value: 'FRESH', label: '新鲜模式', description: '发现更多没听过的新歌' },
  { value: 'SCENE_MODE_ID:2', label: '动感健身', description: '节奏明快，适合运动锻炼' },
  { value: 'SCENE_MODE_ID:3', label: 'Chill 放松', description: '舒缓放松，适合安静聆听' },
  { value: 'SCENE_MODE_ID:5', label: '快乐时光', description: '轻松明快，保持好心情' },
  { value: 'SCENE_MODE_ID:40', label: '夜晚', description: '适合夜间聆听的氛围歌曲' },
  { value: 'SCENE_MODE_ID:21', label: '治愈', description: '温柔舒缓，陪你放松心情' },
  { value: 'SCENE_MODE_ID:18', label: '小酒馆', description: '微醺氛围感歌曲' },
];

const FM_MODE_VALUES = new Set([...NETEASE_FM_MODE_OPTIONS.map((o) => o.value), FM_MODE_OFF]);
TENCENT_FM_MODE_OPTIONS.forEach((option) => FM_MODE_VALUES.add(option.value));
KUGOU_FM_MODE_OPTIONS.forEach((option) => FM_MODE_VALUES.add(option.value));
QISHUI_FM_MODE_OPTIONS.forEach((option) => FM_MODE_VALUES.add(option.value));

const FM_MODE_LABEL_MAP = new Map([
  ...NETEASE_FM_MODE_OPTIONS.map((o) => [o.value, o.label] as [string, string]),
  ...TENCENT_FM_MODE_OPTIONS.map((o) => [o.value, o.label] as [string, string]),
  ...KUGOU_FM_MODE_OPTIONS.map((o) => [o.value, o.label] as [string, string]),
  ...QISHUI_FM_MODE_OPTIONS.map((o) => [o.value, o.label] as [string, string]),
  [FM_MODE_OFF, '已关闭'] as [string, string],
]);

export function normalizeFmSource(input: string | null | undefined): FmSource {
  const raw = String(input || '').trim();
  if (raw === 'kugou') return 'kugou';
  if (raw === 'qishui') return 'qishui';
  if (raw === 'tencent') return 'tencent';
  return 'netease';
}

export function getFmModeOptions(source: string | null | undefined): FmModeOption[] {
  const normalized = normalizeFmSource(source);
  if (normalized === 'qishui') return QISHUI_FM_MODE_OPTIONS;
  if (normalized === 'kugou') return KUGOU_FM_MODE_OPTIONS;
  if (normalized === 'tencent') return TENCENT_FM_MODE_OPTIONS;
  return NETEASE_FM_MODE_OPTIONS;
}

export function getFmSourceLabel(source: string | null | undefined): string {
  const normalized = normalizeFmSource(source);
  if (normalized === 'qishui') return '汽水';
  if (normalized === 'kugou') return '酷狗';
  if (normalized === 'tencent') return 'QQ';
  return '网易';
}

export function normalizeFmMode(input: string | null | undefined): string {
  const raw = String(input || '').trim();
  if (!raw) return DEFAULT_FM_MODE;
  if (FM_MODE_VALUES.has(raw)) return raw;
  return DEFAULT_FM_MODE;
}

export function getFmModeLabel(mode: string | null | undefined): string {
  const normalized = normalizeFmMode(mode);
  return FM_MODE_LABEL_MAP.get(normalized) || normalized;
}
