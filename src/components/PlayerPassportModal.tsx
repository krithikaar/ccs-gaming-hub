import React from 'react';
import { UserProfile } from '../types';
import { GAMES_DATA, AVATAR_OPTIONS } from '../data/games';
import { sounds } from '../utils/audio';
import { Trophy, Award, Sparkles, X, Shield, Star, Coins, UserCheck, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlayerPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onEditProfile: () => void;
}

export const PlayerPassportModal: React.FC<PlayerPassportModalProps> = ({
  isOpen,
  onClose,
  profile,
  onEditProfile,
}) => {
  if (!isOpen) return null;

  const avatarObj = AVATAR_OPTIONS.find((a) => a.id === profile.avatar) || AVATAR_OPTIONS[0];

  // Collect all achievements
  const allAchievements = GAMES_DATA.flatMap((g) =>
    g.achievements.map((ach) => ({
      ...ach,
      gameTitle: g.title,
      gameId: g.id,
      unlocked: (profile.highScores[g.id] || 0) > 0 || profile.xp >= ach.xp,
    }))
  );

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;

  const triggerConfetti = () => {
    sounds.playLevelUp();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div
      id="passport-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      <div
        id="passport-card"
        className="relative w-full max-w-2xl my-8 bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white select-none animate-in fade-in zoom-in duration-200"
      >
        {/* Close button */}
        <button
          id="passport-close-btn"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Passport Top Banner */}
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-orange-400 p-[2px] shadow-lg shadow-fuchsia-500/20">
            <div className="w-full h-full bg-[#020617] rounded-[14px] flex items-center justify-center text-xl text-yellow-400">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black uppercase italic font-cyber tracking-tight">
                OFFICIAL CCS GAMER PASSPORT
              </h2>
              <span className="bg-red-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono-tag text-white">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-mono-tag font-bold tracking-wider uppercase">
              REGISTERED ID FOR ALL 6 CCS GAMES
            </p>
          </div>
        </div>

        {/* Passport Identity Card */}
        <div className="p-5 rounded-3xl bg-black/40 border border-white/10 shadow-inner mb-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Avatar & Level Frame */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-6xl mb-2 animate-bounce" style={{ animationDuration: '3s' }}>
              {avatarObj.emoji}
            </div>
            <span className="font-cyber font-black text-base text-yellow-400 uppercase">
              {avatarObj.name}
            </span>
            <span className="text-[10px] text-white/50 font-mono-tag font-bold uppercase">
              {avatarObj.badge}
            </span>
            <div className="mt-2.5 px-3 py-1 rounded-full bg-white text-black font-cyber text-xs font-black uppercase tracking-tighter shadow-md">
              LEVEL {profile.level} HERO
            </div>
          </div>

          {/* Player Personal Details */}
          <div className="sm:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/50 uppercase tracking-widest font-bold">GAMER TAG</span>
                <div className="text-xl sm:text-2xl font-black uppercase italic font-cyber text-white">
                  {profile.name} <span className="text-xs text-cyan-400 font-mono-tag font-bold">{profile.gamerTag}</span>
                </div>
              </div>
              <button
                id="passport-edit-btn"
                onClick={() => {
                  sounds.playClick();
                  onEditProfile();
                }}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-cyan-400 hover:text-black text-white text-xs font-cyber font-black uppercase tracking-tighter border border-white/10 transition-all cursor-pointer"
              >
                EDIT INFO
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-cyber">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white/40 text-[10px] font-mono-tag font-bold block uppercase">TOTAL PLAYS</span>
                <span className="font-black text-yellow-400 text-sm">
                  {Object.values(profile.gamesPlayed).reduce((a: number, b: number) => a + b, 0)} RUNS
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white/40 text-[10px] font-mono-tag font-bold block uppercase">HERO STYLE</span>
                <span className="font-black text-cyan-400 text-sm uppercase">{profile.gender}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white/40 text-[10px] font-mono-tag font-bold block uppercase">COINS</span>
                <span className="font-black text-yellow-400 text-sm flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" /> {profile.coins}
                </span>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-xs font-mono-tag font-bold mb-1">
                <span className="text-white/50 uppercase">TOTAL EXPERIENCE (XP)</span>
                <span className="text-cyan-300 font-black">{profile.xp.toLocaleString()} XP</span>
              </div>
              <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 rounded-full"
                  style={{ width: `${Math.min(100, (profile.xp % 1000) / 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Badges & Game High Scores Showcase */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold font-mono-tag text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-400" />
              <span>GAMER ACHIEVEMENTS ({unlockedCount} / {allAchievements.length})</span>
            </h3>
            <button
              onClick={triggerConfetti}
              className="text-xs text-yellow-400 hover:text-yellow-300 font-cyber font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              CELEBRATE WINS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {allAchievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  ach.unlocked
                    ? 'bg-black/50 border-white/15 text-white'
                    : 'bg-black/20 border-white/5 text-white/40 opacity-50'
                }`}
              >
                <div className={`text-2xl p-2 rounded-xl ${ach.unlocked ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5'}`}>
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-cyber font-black text-xs uppercase truncate">{ach.title}</span>
                    <span className="text-[10px] font-mono-tag font-bold text-yellow-400">+{ach.xp} XP</span>
                  </div>
                  <p className="text-[11px] text-white/60 truncate font-body">{ach.desc}</p>
                  <span className="text-[9px] text-cyan-400 font-mono-tag font-bold uppercase">{ach.gameTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
