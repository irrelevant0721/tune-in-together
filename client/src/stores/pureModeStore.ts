import { create } from 'zustand';
import { readRoomPureMode, writeRoomPureMode } from '../lib/roomPureMode';

interface PureModeStore {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const usePureModeStore = create<PureModeStore>((set) => ({
  enabled: readRoomPureMode(),
  setEnabled: (enabled) => {
    writeRoomPureMode(enabled);
    set({ enabled });
  },
}));
