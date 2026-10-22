import { useEffect } from 'react';
import { create } from 'zustand';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'openmusic:friends-theme';

function storedTheme(): Theme {
  try { return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

const useFriendsTheme = create<{ theme: Theme; toggle: () => void }>((set) => ({
  theme: storedTheme(),
  toggle: () => set(({ theme }) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep switching available when storage is disabled. */ }
    return { theme: next };
  }),
}));

export default function FriendsThemeToggle() {
  const { theme, toggle } = useFriendsTheme();
  useEffect(() => { document.documentElement.dataset.friendsTheme = theme; }, [theme]);
  const light = theme === 'light';
  return <button type="button" className="friends-theme-toggle" onClick={toggle} aria-label={light ? '切换为深色主题' : '切换为浅色主题'}>
    {light ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    {light ? '深色' : '浅色'}
  </button>;
}
