import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/layout/BottomNav';
import MiniPlayer from './components/layout/MiniPlayer';
import FullscreenPlayer from './components/layout/FullscreenPlayer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import { usePlayerStore } from './store/playerStore';
import { usePlayer } from './hooks/usePlayer';
import { useMediaSession } from './hooks/useMediaSession';
import { useSleepTimer } from './hooks/useSleepTimer';
import { useRadio } from './hooks/useRadio';
import { useAuth } from './hooks/useAuth';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import QueueSheet from './components/layout/QueueSheet';

function AuthLoader() {
  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30">
          <svg className="w-7 h-7 text-bg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <svg className="w-5 h-5 animate-spin text-text-ter" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  usePlayer();
  useMediaSession();
  useSleepTimer();
  useRadio();
  useRealtimeSync();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const showFullscreen = usePlayerStore((s) => s.showFullscreen);
  const { user, loading } = useAuth();

  if (loading) return <AuthLoader />;

  if (!user) return (
    <div className="bg-bg min-h-screen text-text-pri font-sans select-none">
      <AuthPage />
    </div>
  );

  return (
    <div className="bg-bg min-h-screen text-text-pri font-sans select-none">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      {currentTrack && <MiniPlayer />}
      {showFullscreen && <FullscreenPlayer />}
      <QueueSheet />
      <BottomNav />
    </div>
  );
}
