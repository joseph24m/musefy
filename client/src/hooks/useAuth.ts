import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export function useAuth() {
  const { user, profile, loading, setSession, setProfile, setLoading, signOut } =
    useAuthStore();

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        prevUserIdRef.current = session.user.id;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setLoading(false);

      const { useLibraryStore } = await import('../store/libraryStore');
      const { clearAll, clearSensitive, syncFromCloud } = useLibraryStore.getState();

      if (session?.user) {
        const newUserId = session.user.id;

        // Different user logging in: wipe everything to avoid contamination
        if (prevUserIdRef.current !== null && prevUserIdRef.current !== newUserId) {
          clearAll();
        }

        prevUserIdRef.current = newUserId;
        const profile = await fetchProfile(newUserId);
        setProfile(profile);
        await syncFromCloud();
      } else {
        // Logout — do not clear any local data (same as Spotify behaviour)
        prevUserIdRef.current = null;
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, profile, loading, signOut };
}
