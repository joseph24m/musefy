import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 pb-safe">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="mb-10 flex flex-col items-center gap-3"
      >
        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30">
          <svg className="w-9 h-9 text-bg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-text-pri tracking-tight">Musefy</h1>
        <p className="text-text-sec text-sm">La tua musica da YouTube, senza interruzioni</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, delay: 0.1 }}
        className="w-full max-w-sm"
      >
        <h2 className="text-xl font-bold text-text-pri mb-6 text-center">Accedi</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface-2 border border-border rounded-2xl px-4 py-3 text-text-pri placeholder-text-ter text-sm outline-none focus:border-accent/60 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-surface-2 border border-border rounded-2xl px-4 py-3 text-text-pri placeholder-text-ter text-sm outline-none focus:border-accent/60 transition-colors"
          />

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-accent-alt text-xs px-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="w-full bg-accent text-bg font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            )}
            Accedi
          </motion.button>
        </form>

        <p className="text-text-ter text-xs text-center mt-6 leading-relaxed">
          Accesso riservato. Contatta l'amministratore per ricevere un invito.
        </p>
      </motion.div>
    </div>
  );
}
