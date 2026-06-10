import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Subscribes to Supabase Realtime and invalidates React Query caches on relevant events.
 * Never touches player state — safe to run while music is playing.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    // ── Messages channel ─────────────────────────────────────
    // New message received → refresh inbox + badge
    // Message updated (reaction added) → refresh sent
    const messagesCh = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['inbox'] });
          qc.invalidateQueries({ queryKey: ['inbox-unread'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`,
        },
        () => {
          // Reaction added to one of our sent messages
          qc.invalidateQueries({ queryKey: ['sent-messages'] });
        }
      )
      .subscribe();

    // ── Friendships channel ───────────────────────────────────
    // New request received or status changed → refresh requests + friends
    const friendsCh = supabase
      .channel(`friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['friend-requests'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          qc.invalidateQueries({ queryKey: ['friends'] });
          qc.invalidateQueries({ queryKey: ['friend-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesCh);
      supabase.removeChannel(friendsCh);
    };
  }, [user?.id]);
}
