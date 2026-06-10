import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../services/api';

export interface Artist {
  id: string;       // slugified channel name
  name: string;
  thumbnail: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  cover?: string;
  isCloud?: boolean;
  cloudId?: string;
  sharedBy?: string; // username of the sender, if received from a friend
}

interface LibraryState {
  favorites: Track[];
  playlists: Playlist[];
  recentlyPlayed: Track[];
  sharedFavoriteIds: string[];
  followedArtists: Artist[];

  // Core actions (backward-compatible)
  toggleFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;
  isFavoriteShared: (id: string) => boolean;
  toggleFavoriteShared: (trackId: string, shared: boolean) => void;
  addRecentlyPlayed: (track: Track) => void;
  removeFromRecentlyPlayed: (id: string) => void;
  createPlaylist: (name: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removePlaylist: (id: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  followArtist: (artist: Artist) => void;
  unfollowArtist: (id: string) => void;
  isFollowingArtist: (id: string) => boolean;

  saveSharedPlaylist: (name: string, tracks: Track[], sharedBy: string) => void;

  // Cloud sync
  syncFromCloud: () => Promise<void>;
  clearAll: () => void;
  clearSensitive: () => void;
}

// Helper: get current Supabase user id
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// Fire-and-forget cloud sync helpers
async function cloudToggleFavorite(track: Track, isAdding: boolean) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { supabase } = await import('../lib/supabase');
    if (isAdding) {
      await supabase.from('favorites').upsert({
        user_id: userId,
        track_id: track.id,
        title: track.title,
        channel: track.channel,
        thumbnail: track.thumbnail,
        duration: track.duration,
      });
    } else {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', track.id);
    }
  } catch {
    // silent fail — local state already updated
  }
}

async function cloudAddRecentlyPlayed(track: Track) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { supabase } = await import('../lib/supabase');
    await supabase.from('recently_played').upsert({
      user_id: userId,
      track_id: track.id,
      title: track.title,
      channel: track.channel,
      thumbnail: track.thumbnail,
      duration: track.duration,
      played_at: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}


async function cloudAddTrackToPlaylist(cloudId: string, track: Track, position: number) {
  try {
    const { supabase } = await import('../lib/supabase');
    await supabase.from('playlist_tracks').insert({
      playlist_id: cloudId,
      track_id: track.id,
      title: track.title,
      channel: track.channel,
      thumbnail: track.thumbnail,
      duration: track.duration,
      position,
    });
  } catch {
    // silent
  }
}

async function cloudRemovePlaylist(cloudId: string) {
  try {
    const { supabase } = await import('../lib/supabase');
    await supabase.from('playlists').delete().eq('id', cloudId);
  } catch {
    // silent
  }
}

async function cloudRemoveTrackFromPlaylist(cloudId: string, trackId: string) {
  try {
    const { supabase } = await import('../lib/supabase');
    await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', cloudId)
      .eq('track_id', trackId);
  } catch {
    // silent
  }
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [],
      recentlyPlayed: [],
      sharedFavoriteIds: [],
      followedArtists: [],

      toggleFavorite: (track) => {
        const { favorites } = get();
        const exists = favorites.some((t) => t.id === track.id);
        set({
          favorites: exists
            ? favorites.filter((t) => t.id !== track.id)
            : [track, ...favorites],
        });
        // Fire-and-forget cloud sync
        cloudToggleFavorite(track, !exists);
      },

      isFavorite: (id) => get().favorites.some((t) => t.id === id),

      isFavoriteShared: (id) => get().sharedFavoriteIds.includes(id),

      toggleFavoriteShared: async (trackId, shared) => {
        set((s) => ({
          sharedFavoriteIds: shared
            ? [...s.sharedFavoriteIds.filter((i) => i !== trackId), trackId]
            : s.sharedFavoriteIds.filter((i) => i !== trackId),
        }));
        try {
          const { supabase } = await import('../lib/supabase');
          await supabase
            .from('favorites')
            .update({ shared })
            .eq('track_id', trackId);
        } catch {
          // silent
        }
      },

      addRecentlyPlayed: (track) => {
        const list = get().recentlyPlayed.filter((t) => t.id !== track.id);
        set({ recentlyPlayed: [track, ...list].slice(0, 20) });
        cloudAddRecentlyPlayed(track);
      },

      removeFromRecentlyPlayed: (id) => {
        set((s) => ({ recentlyPlayed: s.recentlyPlayed.filter((t) => t.id !== id) }));
        // Fire-and-forget cloud delete
        (async () => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) return;
            const { supabase } = await import('../lib/supabase');
            await supabase.from('recently_played').delete().eq('user_id', userId).eq('track_id', id);
          } catch { /* silent */ }
        })();
      },

      createPlaylist: async (name) => {
        const localId = Date.now().toString();
        const pl: Playlist = { id: localId, name, tracks: [] };
        set((s) => ({ playlists: [...s.playlists, pl] }));

        // Try to sync immediately and update cloudId
        try {
          const userId = await getCurrentUserId();
          if (!userId) return;
          const { supabase } = await import('../lib/supabase');
          const { data } = await supabase
            .from('playlists')
            .insert({ user_id: userId, name })
            .select('id')
            .single();

          if (data?.id) {
            useLibraryStore.setState((s) => ({
              playlists: s.playlists.map((p) =>
                p.id === localId ? { ...p, isCloud: true, cloudId: data.id, id: data.id } : p
              ),
            }));
          }
        } catch {
          // stays local-only, will be preserved during sync
        }
      },

      addToPlaylist: (playlistId, track) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId && !p.tracks.some((t) => t.id === track.id)
              ? { ...p, tracks: [...p.tracks, track], cover: p.cover ?? track.thumbnail }
              : p
          ),
        }));
        if (playlist?.cloudId) {
          const position = (playlist.tracks.length) + 1;
          cloudAddTrackToPlaylist(playlist.cloudId, track, position);
        }
      },

      removePlaylist: (id) => {
        const playlist = get().playlists.find((p) => p.id === id);
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
        if (playlist?.cloudId) {
          cloudRemovePlaylist(playlist.cloudId);
        }
      },

      followArtist: (artist) => {
        set((s) => {
          if (s.followedArtists.some((a) => a.id === artist.id)) return s;
          return { followedArtists: [artist, ...s.followedArtists] };
        });
      },

      unfollowArtist: (id) => {
        set((s) => ({ followedArtists: s.followedArtists.filter((a) => a.id !== id) }));
      },

      isFollowingArtist: (id) => get().followedArtists.some((a) => a.id === id),

      renamePlaylist: async (id, name) => {
        set((s) => ({
          playlists: s.playlists.map((p) => p.id === id ? { ...p, name } : p),
        }));
        try {
          const { supabase } = await import('../lib/supabase');
          const cloudId = get().playlists.find((p) => p.id === id)?.cloudId;
          if (cloudId) await supabase.from('playlists').update({ name }).eq('id', cloudId);
        } catch { /* silent */ }
      },

      removeFromPlaylist: (playlistId, trackId) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
              : p
          ),
        }));
        if (playlist?.cloudId) {
          cloudRemoveTrackFromPlaylist(playlist.cloudId, trackId);
        }
      },

      saveSharedPlaylist: (name, tracks, sharedBy) => {
        const id = Date.now().toString();
        set((s) => ({
          playlists: [...s.playlists, { id, name, tracks, sharedBy, cover: tracks[0]?.thumbnail }],
        }));
      },

      clearAll: () => {
        set({
          favorites: [],
          playlists: [],
          recentlyPlayed: [],
          sharedFavoriteIds: [],
          followedArtists: [],
        });
      },

      // On logout: keep playlists and followed artists, only wipe account-specific data
      clearSensitive: () => {
        set({
          favorites: [],
          recentlyPlayed: [],
          sharedFavoriteIds: [],
        });
      },

      syncFromCloud: async () => {
        try {
          const userId = await getCurrentUserId();
          if (!userId) return;
          const { supabase } = await import('../lib/supabase');

          // Fetch favorites
          const { data: favData } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .order('added_at', { ascending: false });

          // Fetch recently played
          const { data: recentData } = await supabase
            .from('recently_played')
            .select('*')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(20);

          // Fetch playlists with tracks
          const { data: playlistData } = await supabase
            .from('playlists')
            .select('*, playlist_tracks(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          const toTrack = (r: {
            track_id: string;
            title: string;
            channel: string;
            thumbnail: string;
            duration: number;
          }): Track => ({
            id: r.track_id,
            title: r.title,
            channel: r.channel,
            thumbnail: r.thumbnail,
            duration: r.duration,
            type: 'song',
          });

          const cloudFavorites: Track[] = (favData ?? []).map(toTrack);
          const sharedIds: string[] = (favData ?? [])
            .filter((f: { shared?: boolean }) => f.shared)
            .map((f: { track_id: string }) => f.track_id);
          const cloudRecent: Track[] = (recentData ?? []).map(toTrack);
          const cloudPlaylists: Playlist[] = (playlistData ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            cover: p.cover_url ?? undefined,
            tracks: ((p.playlist_tracks as unknown[]) as Array<{
              track_id: string;
              title: string;
              channel: string;
              thumbnail: string;
              duration: number;
              position: number;
            }>)
              .sort((a, b) => a.position - b.position)
              .map(toTrack),
            isCloud: true,
            cloudId: p.id,
          }));

          // Keep local-only playlists that haven't been synced to cloud yet
          const localOnlyPlaylists = get().playlists.filter(
            (p) => !p.isCloud && !cloudPlaylists.some((cp) => cp.name === p.name)
          );

          set({
            favorites: cloudFavorites,
            recentlyPlayed: cloudRecent,
            playlists: [...cloudPlaylists, ...localOnlyPlaylists],
            sharedFavoriteIds: sharedIds,
          });
        } catch {
          // silent — keep local state
        }
      },
    }),
    {
      name: 'muse-library',
      // Use a user-specific key so multiple accounts on the same browser never share state.
      // The key is resolved at runtime from Supabase session.
      storage: {
        getItem: async (name) => {
          try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user?.id;
            const key = uid ? `${name}-${uid}` : name;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user?.id;
            const key = uid ? `${name}-${uid}` : name;
            localStorage.setItem(key, JSON.stringify(value));
          } catch { /* silent */ }
        },
        removeItem: async (name) => {
          try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user?.id;
            const key = uid ? `${name}-${uid}` : name;
            localStorage.removeItem(key);
          } catch { /* silent */ }
        },
      },
    }
  )
);
