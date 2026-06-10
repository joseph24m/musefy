import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const initial = profile?.username?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? null;

  const tabs = [
    {
      path: '/', label: 'Home',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      )
    },
    {
      path: '/search', label: 'Cerca',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      )
    },
    {
      path: '/library', label: 'Libreria',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
      )
    },
    {
      path: user ? '/profile' : '/auth',
      label: 'Profilo',
      icon: (a: boolean) => initial ? (
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          a ? 'bg-accent text-bg' : 'bg-surface-2 text-text-sec'
        }`}>
          {initial}
        </div>
      ) : (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      )
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingTop: '8px' }}
    >
      <nav className="flex items-center gap-1 bg-surface/80 backdrop-blur-2xl border border-border rounded-2xl px-2 py-2 shadow-2xl">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
          >
            {({ isActive }) => (
              <motion.div
                className={`relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-colors ${
                  isActive ? 'text-accent' : 'text-text-ter'
                }`}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-accent/10 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.icon(isActive)}</span>
                <span className={`relative z-10 text-xs font-medium ${isActive ? 'text-accent' : 'text-text-ter'}`}>
                  {tab.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
