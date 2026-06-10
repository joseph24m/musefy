import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

function Row({ icon, label, value, onPress, danger }: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full flex items-center gap-4 px-4 py-3.5 active:bg-surface-2 text-left"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-accent-alt/15' : 'bg-surface-2'}`}>
        <span className={danger ? 'text-accent-alt' : 'text-text-sec'}>{icon}</span>
      </div>
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-accent-alt' : 'text-text-pri'}`}>{label}</span>
      {value && <span className="text-text-ter text-sm">{value}</span>}
      {!danger && (
        <svg className="w-4 h-4 text-text-ter flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </motion.button>
  );
}

function PasswordSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (next.length < 6) { setMsg('Minimo 6 caratteri'); return; }
    if (next !== confirm) { setMsg('Le password non coincidono'); return; }
    setSaving(true);
    setMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setMsg('✓ Password aggiornata');
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      setMsg((err as Error).message ?? 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-3 pb-10 z-10"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-text-pri mb-5">Cambia password</h2>

        <div className="space-y-3">
          <div>
            <label className="text-text-ter text-xs font-medium mb-1.5 block">Password attuale</label>
            <input
              type="password"
              placeholder="••••••••"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full bg-surface-2 text-text-pri placeholder-text-ter rounded-2xl px-4 py-3 text-sm border border-border outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label className="text-text-ter text-xs font-medium mb-1.5 block">Nuova password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full bg-surface-2 text-text-pri placeholder-text-ter rounded-2xl px-4 py-3 text-sm border border-border outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label className="text-text-ter text-xs font-medium mb-1.5 block">Conferma nuova password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-surface-2 text-text-pri placeholder-text-ter rounded-2xl px-4 py-3 text-sm border border-border outline-none focus:border-accent/60"
            />
          </div>
        </div>

        {msg && (
          <p className={`text-xs mt-3 px-1 ${msg.startsWith('✓') ? 'text-accent' : 'text-accent-alt'}`}>{msg}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={saving || !next || !confirm}
          onClick={handleSave}
          className="w-full bg-accent text-bg font-semibold py-3.5 rounded-2xl text-sm mt-5 disabled:opacity-40"
        >
          {saving ? 'Salvataggio…' : 'Aggiorna password'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/auth');
  }

  return (
    <>
      <div className="pb-36 pt-4">
        <div className="flex items-center gap-3 px-4 mb-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="text-text-sec p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <h1 className="text-2xl font-bold text-text-pri">Impostazioni</h1>
        </div>

        {/* Account */}
        <div className="mb-6">
          <p className="text-text-ter text-xs font-semibold uppercase tracking-widest px-4 mb-2">Account</p>
          <div className="bg-surface-2 rounded-2xl overflow-hidden mx-4">
            <Row
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 11-8 0 4 4 0 018 0zm-4 6a8 8 0 00-8 8h16a8 8 0 00-8-8z"/></svg>}
              label="Email"
              value={user?.email ?? ''}
            />
            <div className="h-px bg-border mx-4" />
            <Row
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
              label="Cambia password"
              onPress={() => setShowPasswordSheet(true)}
            />
          </div>
        </div>

        {/* Sessione */}
        <div className="mb-6">
          <p className="text-text-ter text-xs font-semibold uppercase tracking-widest px-4 mb-2">Sessione</p>
          <div className="bg-surface-2 rounded-2xl overflow-hidden mx-4">
            <Row
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>}
              label="Disconnetti"
              onPress={handleSignOut}
              danger
            />
          </div>
        </div>

        {/* App info */}
        <div className="px-4 mt-8 text-center">
          <p className="text-text-ter text-xs">Musefy · v1.0</p>
        </div>
      </div>

      {showPasswordSheet && <PasswordSheet onClose={() => setShowPasswordSheet(false)} />}
    </>
  );
}
