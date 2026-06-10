import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database types ────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
        };
      };
      playlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          cover_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          cover_url?: string | null;
          is_public?: boolean;
        };
        Update: {
          name?: string;
          cover_url?: string | null;
          is_public?: boolean;
        };
      };
      playlist_tracks: {
        Row: {
          id: string;
          playlist_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration: number;
          position: number;
          added_at: string;
        };
        Insert: {
          playlist_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration?: number;
          position: number;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration: number;
          added_at: string;
        };
        Insert: {
          user_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration?: number;
        };
      };
      recently_played: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration: number;
          played_at: string;
        };
        Insert: {
          user_id: string;
          track_id: string;
          title: string;
          channel: string;
          thumbnail: string;
          duration?: number;
        };
      };
      shared_playlists: {
        Row: {
          id: string;
          playlist_id: string;
          invited_user_id: string;
          can_edit: boolean;
          invited_at: string;
        };
        Insert: {
          playlist_id: string;
          invited_user_id: string;
          can_edit?: boolean;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DbPlaylist = Database['public']['Tables']['playlists']['Row'];
export type DbPlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type DbFavorite = Database['public']['Tables']['favorites']['Row'];
export type DbRecentlyPlayed = Database['public']['Tables']['recently_played']['Row'];
export type DbSharedPlaylist = Database['public']['Tables']['shared_playlists']['Row'];
