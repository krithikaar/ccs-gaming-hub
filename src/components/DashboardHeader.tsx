import React from 'react';
import { UserProfile } from '../types';
import { AVATAR_OPTIONS } from '../data/games';
import { sounds } from '../utils/audio';
import { Sparkles, Trophy, Volume2, VolumeX, Edit3, Coins, Zap } from 'lucide-react';

interface DashboardHeaderProps {
  profile: UserProfile;
  onOpenPassport: () => void;
  onEditProfile: () => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const CATEGORIES = [
  'All Games',
  'Mind & Puzzle',
  'Superhero Action',
  'Rhythm Synth',
  'Arcade Popper',
  'Biofeedback Mystery',
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  profile,
  onOpenPassport,
  onEditProfile,
  activeCategory,
  onSelectCategory,
  isMuted,
  onToggleMute,
}) => {
  const avatarObj = AVATAR_OPTIONS.find((a) => a.id === profile.avatar) || AVATAR_OPTIONS[0];

  // Calculate XP towards next level (1000 XP per level)
  const xpInCurrentLevel = profile.xp % 1000;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 1000) * 100));

  return (
    <header className="w-full bg-[#020617]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-orange-400 p-[2px] shadow-lg shadow-fuchsia-500/20">
              <div className="w-full h-full bg-[#020617] rounded-[14px] flex items-center justify-center text-2xl">
                👾
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-cyber tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                  CCS GAMING HUB
                </span>
                <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest text-white shadow-sm">
                  LIVE
                </span>
              </div>
              <p className="text-cyan-400 font-mono-tag text-[11px] font-bold tracking-widest uppercase mt-0.5">
                PLAY WITHOUT LIMITS
              </p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-mute-btn"
              onClick={onToggleMute}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Right: Player Profile Passport Pill & Desktop Controls */}
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Sound toggle button */}
          <button
            id="header-sound-btn"
            onClick={onToggleMute}
            className="hidden sm:flex p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Player Passport & Profile Pill */}
          <div
            id="header-player-pill"
            onClick={() => {
              sounds.playClick();
              onOpenPassport();
            }}
            className="bg-white/5 border border-white/10 hover:border-cyan-400/50 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3.5 backdrop-blur-md cursor-pointer transition-all group"
          >
            {/* Avatar Emoji Box */}
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                {avatarObj.emoji}
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-cyber font-black border border-slate-950">
                Lv.{profile.level}
              </div>
            </div>

            {/* Name, Gender, XP Details */}
            <div className="flex flex-col">
              <div className="text-[10px] uppercase opacity-50 font-mono-tag font-bold tracking-wider">
                LOGGED IN AS
              </div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-black text-sm sm:text-base text-white uppercase tracking-tight">
                  {profile.name} • {profile.gender}
                </span>
              </div>

              {/* XP bar */}
              <div className="w-28 sm:w-32 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1 flex">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 rounded-full"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {/* Coins Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-cyber text-xs font-black">
              <Coins className="w-3.5 h-3.5" />
              <span>{profile.coins}</span>
            </div>

            {/* Edit / View Icon */}
            <Edit3
              onClick={(e) => {
                e.stopPropagation();
                sounds.playClick();
                onEditProfile();
              }}
              className="w-4 h-4 text-white/40 hover:text-cyan-400 transition-colors ml-1"
              title="Edit Profile"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3.5 pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            id={`category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => {
              sounds.playClick();
              onSelectCategory(cat);
            }}
            className={`px-4 py-2 rounded-full text-xs font-cyber font-black tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/20 border border-cyan-300/40'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </header>
  );
};
