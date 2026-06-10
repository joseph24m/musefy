import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },
}));
