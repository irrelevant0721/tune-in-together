import { create } from 'zustand';
import { readRoomImmersiveMode, writeRoomImmersiveMode } from '../lib/roomImmersiveMode';

interface ImmersiveModeStore {
  enabled: boolean;
  /** 进入过渡期间也生效，使预加载/换源按沉浸音质上限拉取 */
  qualityCapActive: boolean;
  setEnabled: (enabled: boolean) => void;
  setQualityCapActive: (active: boolean) => void;
  toggle: () => void;
}

export const useImmersiveModeStore = create<ImmersiveModeStore>((set, get) => ({
  enabled: readRoomImmersiveMode(),
  qualityCapActive: readRoomImmersiveMode(),
  setEnabled: (enabled) => {
    writeRoomImmersiveMode(enabled);
    set({ enabled, qualityCapActive: enabled });
  },
  setQualityCapActive: (active) => {
    set({ qualityCapActive: active });
  },
  toggle: () => {
    const next = !get().enabled;
    writeRoomImmersiveMode(next);
    set({ enabled: next, qualityCapActive: next });
  },
}));
