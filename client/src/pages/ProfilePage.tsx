import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

import { useLibraryStore } from '../store/libraryStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuthStore();
  const favorites = useLibraryStore((s) => s.favorites);
  const playlists = useLibraryStore((s) => s.playlists);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);

  const [username, setUsername] = useState(profile?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  const initial = (profile.username ?? user.email ?? 'U')[0].toUpperCase();

  async function handleSaveUsername() {
    if (!username.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user!.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setSaveMsg('Salvato!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err: unknown) {
      setSaveMsg((err as Error).message ?? 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
    } catch {
      // silent
    } finally {
      setUploadingAvatar(false);
    }
  }


  return (
    <div className="pb-36 pt-4 px-4">
      <div className="flex items-center gap-3 mb-8">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="text-text-sec p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        <h1 className="text-2xl font-bold text-text-pri">Profilo</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-3xl font-bold text-bg">
              {initial}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-surface-2 border border-border rounded-full flex items-center justify-center">
            {uploadingAvatar ? (
              <svg className="w-4 h-4 animate-spin text-text-sec" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        </motion.button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <p className="text-text-sec text-sm mt-3">{user.email}</p>
      </div>

      {/* Username */}
      <div className="bg-surface-2 rounded-2xl p-4 mb-4">
        <label className="text-text-ter text-xs font-medium mb-2 block">Nome utente</label>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="flex-1 bg-surface text-text-pri placeholder-text-ter rounded-xl px-3 py-2.5 text-sm border border-border outline-none focus:border-accent/60"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={saving || username === profile.username}
            onClick={handleSaveUsername}
            className="bg-accent text-bg px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {saving ? '...' : 'Salva'}
          </motion.button>
        </div>
        {saveMsg && (
          <p className={`text-xs mt-2 ${saveMsg === 'Salvato!' ? 'text-accent' : 'text-accent-alt'}`}>
            {saveMsg}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Preferiti', value: favorites.length },
          { label: 'Playlist', value: playlists.length },
          { label: 'Ascoltati', value: recentlyPlayed.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-2 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-text-pri">{stat.value}</p>
            <p className="text-text-ter text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Playlists list */}
      {playlists.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-pri mb-3">Le mie playlist</h2>
          <div className="space-y-2">
            {playlists.map((pl) => (
              <div key={pl.id} className="bg-surface-2 rounded-2xl p-3 flex items-center gap-3">
                {pl.cover ? (
                  <img src={pl.cover} alt={pl.name} className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-text-pri text-sm font-medium">{pl.name}</p>
                  <p className="text-text-ter text-xs">{pl.tracks.length} brani</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/friends')}
        className="w-full bg-surface-2 rounded-2xl p-4 flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-text-pri font-medium">Amici</span>
        </div>
        <svg className="w-5 h-5 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>

      {/* Settings */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/settings')}
        className="w-full bg-surface-2 rounded-2xl p-4 flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-text-pri font-medium">Impostazioni</span>
        </div>
        <svg className="w-5 h-5 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    </div>
  );
}
