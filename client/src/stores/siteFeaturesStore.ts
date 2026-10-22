import { create } from 'zustand';

interface SiteFeaturesStore {
  /** 管理端是否开放全站共享会员入口 */
  sharedMembershipEnabled: boolean;
  qqGroupUrl: string;
  /** 管理端是否开放 SVIP 音质选项 */
  svipQualityEnabled: Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>;
  /** 各平台实际可用的高级会员能力，不能用全局开关代替。 */
  neteaseSvip: boolean;
  tencentSvip: boolean;
  qishuiVip: boolean;
  qishuiSvip: boolean;
  musicSourcesEnabled: Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>;
  hydrated: boolean;
  setSvipQualityEnabled: (enabled: boolean) => void;
  setPlatformCapabilities: (features: PlatformCapabilities) => void;
}

export interface PlatformCapabilities {
  sharedMembershipEnabled?: boolean;
  qqGroupUrl?: string;
  svipQualityEnabled?: boolean | Partial<Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>>;
  neteaseSvip?: boolean;
  tencentSvip?: boolean;
  qishuiVip?: boolean;
  qishuiSvip?: boolean;
  musicSourcesEnabled?: Partial<Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>>;
}

export const useSiteFeaturesStore = create<SiteFeaturesStore>((set) => ({
  sharedMembershipEnabled: true,
  qqGroupUrl: '',
  svipQualityEnabled: { netease: false, tencent: false, kugou: false, qishui: false },
  neteaseSvip: false,
  tencentSvip: false,
  qishuiVip: false,
  qishuiSvip: false,
  musicSourcesEnabled: { netease: true, tencent: true, kugou: true, qishui: true },
  hydrated: false,
  setSvipQualityEnabled: (svipQualityEnabled) => set({
    svipQualityEnabled: { netease: Boolean(svipQualityEnabled), tencent: Boolean(svipQualityEnabled), kugou: Boolean(svipQualityEnabled), qishui: Boolean(svipQualityEnabled) },
    hydrated: true,
  }),
  setPlatformCapabilities: (features) => set((state) => ({
    sharedMembershipEnabled: features.sharedMembershipEnabled === undefined
      ? state.sharedMembershipEnabled
      : Boolean(features.sharedMembershipEnabled),
    qqGroupUrl: features.qqGroupUrl === undefined ? state.qqGroupUrl : features.qqGroupUrl,
    svipQualityEnabled: features.svipQualityEnabled === undefined
      ? state.svipQualityEnabled
      : typeof features.svipQualityEnabled === 'object'
        ? { ...state.svipQualityEnabled, ...Object.fromEntries(Object.entries(features.svipQualityEnabled).map(([key, value]) => [key, Boolean(value)])) } as typeof state.svipQualityEnabled
        : { netease: Boolean(features.svipQualityEnabled), tencent: Boolean(features.svipQualityEnabled), kugou: Boolean(features.svipQualityEnabled), qishui: Boolean(features.svipQualityEnabled) },
    neteaseSvip: features.neteaseSvip === undefined ? state.neteaseSvip : Boolean(features.neteaseSvip),
    tencentSvip: features.tencentSvip === undefined ? state.tencentSvip : Boolean(features.tencentSvip),
    qishuiVip: features.qishuiVip === undefined ? state.qishuiVip : Boolean(features.qishuiVip),
    qishuiSvip: features.qishuiSvip === undefined ? state.qishuiSvip : Boolean(features.qishuiSvip),
    musicSourcesEnabled: features.musicSourcesEnabled
      ? { ...state.musicSourcesEnabled, ...Object.fromEntries(Object.entries(features.musicSourcesEnabled).map(([key, value]) => [key, Boolean(value)])) } as typeof state.musicSourcesEnabled
      : state.musicSourcesEnabled,
    hydrated: true,
  })),
}));

export function applySiteFeatures(features: PlatformCapabilities | null | undefined) {
  if (!features || typeof features !== 'object') return;
  useSiteFeaturesStore.getState().setPlatformCapabilities(features);
}

export function isQishuiVipAvailable(): boolean {
  return useSiteFeaturesStore.getState().qishuiVip;
}

export function isQishuiSvipAvailable(): boolean {
  return useSiteFeaturesStore.getState().qishuiSvip;
}

export function isSvipQualityEnabled(): boolean {
  return Object.values(useSiteFeaturesStore.getState().svipQualityEnabled).some(Boolean);
}

export function isPlatformSvipQualityEnabled(source: 'netease' | 'tencent' | 'kugou' | 'qishui'): boolean {
  const state = useSiteFeaturesStore.getState();
  return Boolean(state.svipQualityEnabled[source]);
}
