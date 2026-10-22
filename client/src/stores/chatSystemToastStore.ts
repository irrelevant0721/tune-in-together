import { create } from 'zustand';

interface ChatSystemToastStore {
  text: string | null;
  seq: number;
  show: (text: string) => void;
  clear: () => void;
}

export const useChatSystemToastStore = create<ChatSystemToastStore>((set, get) => ({
  text: null,
  seq: 0,

  show: (text) => {
    const content = String(text || '').trim();
    if (!content) return;
    set({ text: content, seq: get().seq + 1 });
  },

  clear: () => set({ text: null }),
}));
