import React, { useState } from 'react';
import { UserProfile, GameId } from '../types';
import { AVATAR_OPTIONS } from '../data/games';
import { sounds } from '../utils/audio';
import { Sparkles, User, Check, ShieldCheck, X } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  initialProfile,
}) => {
  const [name, setName] = useState(initialProfile?.name || '');
  const [gender, setGender] = useState<'Boy' | 'Girl' | 'Cosmic Hero' | 'Custom'>(
    initialProfile?.gender || 'Boy'
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    initialProfile?.avatar || 'cyber-fox'
  );
  const [customTag, setCustomTag] = useState(
    initialProfile?.gamerTag || ''
  );
  const [errors, setErrors] = useState<{ name?: string }>({});

  if (!isOpen) return null;

  const generateGamerTag = (inputName: string) => {
    const clean = (inputName.trim() || 'Player').replace(/\s+/g, '');
    const num = Math.floor(100 + Math.random() * 900);
    return `${clean}_#${num}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Please enter your gamer nickname!' });
      return;
    }

    sounds.playLevelUp();

    const tag = customTag.trim() || generateGamerTag(name);

    const defaultHighScores: Record<GameId, number> = {
      'animal-mind-control': 0,
      'spider-rabbit': 0,
      'music-matrix': 0,
      'blasting-balloons': 0,
      'learn-to-breathe': 0,
      'boba-dino': 0,
    };

    const defaultGamesPlayed: Record<GameId, number> = {
      'animal-mind-control': 0,
      'spider-rabbit': 0,
      'music-matrix': 0,
      'blasting-balloons': 0,
      'learn-to-breathe': 0,
      'boba-dino': 0,
    };

    const newProfile: UserProfile = {
      name: name.trim(),
      gender: gender,
      avatar: selectedAvatar,
      gamerTag: tag,
      xp: initialProfile?.xp || 200, // Welcome gift XP
      level: initialProfile?.level || 1,
      coins: initialProfile?.coins || 150,
      badges: initialProfile?.badges || ['CCS Pioneer Badge'],
      highScores: initialProfile?.highScores || defaultHighScores,
      gamesPlayed: initialProfile?.gamesPlayed || defaultGamesPlayed,
      joinedAt: initialProfile?.joinedAt || new Date().toISOString(),
    };

    onSaveProfile(newProfile);
    onClose();
  };

  return (
    <div
      id="signin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      <div
        id="signin-card"
        className="relative w-full max-w-xl my-8 bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white select-none animate-in fade-in zoom-in duration-200"
      >
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button (if updating profile) */}
        {initialProfile && (
          <button
            id="signin-close-btn"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-bold uppercase tracking-widest font-mono-tag mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {initialProfile ? 'UPDATE PLAYER PASSPORT' : 'PLAYER SIGN-IN & ID CREATION'}
          </div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase italic font-cyber tracking-tight">
            WELCOME TO <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">CCS GAMING HUB</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-1 font-body">
            Personalize your gaming avatar, hero style, and player profile!
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Player Name Input */}
          <div>
            <label className="block text-xs font-bold font-mono-tag text-white/70 mb-1.5 uppercase tracking-wider">
              1. Gamer Nickname / Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="player-name-input"
                type="text"
                maxLength={20}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({});
                }}
                placeholder="e.g. Leo Star, Maya Blitz, Alex..."
                className="w-full px-4 py-3 pl-11 rounded-2xl bg-black/50 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 text-white placeholder-white/30 font-cyber font-bold text-base transition-all outline-none"
              />
              <User className="absolute left-3.5 top-3.5 w-5 h-5 text-white/40" />
            </div>
            {errors.name && (
              <p className="text-rose-400 text-xs mt-1 font-mono-tag font-bold">{errors.name}</p>
            )}
          </div>

          {/* Gender Selection */}
          <div>
            <label className="block text-xs font-bold font-mono-tag text-white/70 mb-1.5 uppercase tracking-wider">
              2. Select Gender / Hero Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Boy', 'Girl', 'Cosmic Hero', 'Custom'] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  id={`gender-btn-${g.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setGender(g);
                    sounds.playClick();
                  }}
                  className={`py-2.5 px-3 rounded-2xl font-cyber font-black text-xs uppercase tracking-tight border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === g
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {gender === g && <Check className="w-4 h-4 text-black" />}
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Choose Gaming Avatar */}
          <div>
            <label className="block text-xs font-bold font-mono-tag text-white/70 mb-1.5 uppercase tracking-wider">
              3. Choose Gaming Spirit Avatar
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  id={`avatar-${av.id}`}
                  onClick={() => {
                    setSelectedAvatar(av.id);
                    sounds.playClick();
                  }}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === av.id
                      ? 'bg-gradient-to-b from-cyan-950/60 to-black border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg scale-105'
                      : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl mb-1">{av.emoji}</span>
                  <span className="text-[11px] font-cyber font-black text-white truncate w-full text-center">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Profile Welcome Gift Bonus Box */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono-tag">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>+200 XP Starter Bonus + 150 Game Coins</span>
            </div>
            <span className="text-yellow-400 font-bold uppercase tracking-wider">READY</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="signin-submit-btn"
            className="w-full py-4 rounded-full bg-white hover:bg-cyan-400 text-black font-black text-base font-cyber uppercase tracking-tighter shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
          >
            <Sparkles className="w-5 h-5 fill-black" />
            <span>{initialProfile ? 'SAVE PASSPORT & ENTER' : 'START PLAYING GAMES!'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
