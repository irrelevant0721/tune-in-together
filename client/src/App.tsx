import { Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AppErrorBoundary from './components/AppErrorBoundary';
import NotFoundPage from './components/NotFoundPage';
import { rememberAdminEntryPath } from './lib/adminEntryShortcut';
import { lazyWithRetry } from './lib/lazyWithRetry';
import MusicLoading from './components/MusicLoading';

const Home = lazyWithRetry(() => import('./pages/FriendsHome'), 'Home');
const Room = lazyWithRetry(() => import('./pages/FriendsRoom'), 'Room');
const Settings = lazyWithRetry(() => import('./pages/FriendsSettings'), 'Settings');
const Admin = lazyWithRetry(() => import('./pages/Admin'), 'Admin');
const Setup = lazyWithRetry(() => import('./pages/Setup'), 'Setup');

function RouteFallback() {
  return <MusicLoading label="正在连接音乐房间" className="friends-route-loading" />;
}
function AdminGate() {
  const location = useLocation();
  const [match, setMatch] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    if (path !== '/admin' && !/^\/[A-Za-z0-9_-]{8,64}$/.test(path)) { setMatch(false); return; }
    setMatch(null);
    void fetch('/api/admin/gate', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }),
    }).then((response) => response.json()).then((data) => {
      if (!cancelled) { setMatch(Boolean(data.match)); if (data.match) rememberAdminEntryPath(path); }
    }).catch(() => { if (!cancelled) setMatch(false); });
    return () => { cancelled = true; };
  }, [location.pathname]);
  if (match === null) return <RouteFallback />;
  return match ? <Admin /> : <NotFoundPage />;
}
export default function App() {
  const location = useLocation();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    void fetch('/api/setup/status', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('服务暂时不可用'); return response.json(); })
      .then((data) => setSetupRequired(Boolean(data.setupRequired)))
      .catch(() => { if (!controller.signal.aborted) setError('连接失败，请刷新页面重试'); else setError('连接超时，请刷新页面重试'); })
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);
  if (error) return <main className="friends-app"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>重新连接</button></main>;
  return <AppErrorBoundary key={location.pathname}><Suspense fallback={<RouteFallback />}>
    {setupRequired === null ? <RouteFallback /> : setupRequired ? <Setup /> : <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<AdminGate />} />
    </Routes>}
  </Suspense></AppErrorBoundary>;
}
