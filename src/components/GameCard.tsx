import React from 'react';
import { GameDefinition, UserProfile } from '../types';
import { sounds } from '../utils/audio';
import { SpiderRabbitAvatar } from './SpiderRabbitAvatar';
import { Play, Trophy, Star, Sparkles, Zap, Brain, Music, Flame, Heart } from 'lucide-react';

interface GameCardProps {
  game: GameDefinition;
  profile: UserProfile;
  onPlayGame: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  profile,
  onPlayGame,
}) => {
  const userHighScore = profile.highScores[game.id] || 0;
  const userGamesPlayed = profile.gamesPlayed[game.id] || 0;

  // Icon mapping
  const renderIcon = () => {
    switch (game.id) {
      case 'animal-mind-control':
        return <Brain className="w-5 h-5 text-violet-300" />;
      case 'spider-rabbit':
        return <Zap className="w-5 h-5 text-rose-300" />;
      case 'music-matrix':
        return <Music className="w-5 h-5 text-cyan-300" />;
      case 'blasting-balloons':
        return <Flame className="w-5 h-5 text-amber-300" />;
      case 'learn-to-breathe':
        return <Heart className="w-5 h-5 text-cyan-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-white" />;
    }
  };

  // Card Emoji Art Preview & Index mapping
  const getGameEmojiHero = () => {
    switch (game.id) {
      case 'animal-mind-control':
        return { emoji: '🦁🧠', ghost: '🦁', index: '01', color: 'from-purple-900 to-indigo-950', borderHover: 'hover:border-purple-400', accentText: 'text-purple-400' };
      case 'spider-rabbit':
        return { emoji: '🐰', ghost: '🐰', index: '02', color: 'from-red-600 via-rose-700 to-blue-900', borderHover: 'hover:border-red-400', accentText: 'text-red-400' };
      case 'music-matrix':
        return { emoji: '🎶🎹', ghost: '🎹', index: '03', color: 'from-pink-600 to-purple-900', borderHover: 'hover:border-pink-400', accentText: 'text-pink-400' };
      case 'blasting-balloons':
        return { emoji: '🎈💥', ghost: '🎈', index: '04', color: 'from-amber-600 to-red-900', borderHover: 'hover:border-yellow-400', accentText: 'text-yellow-400' };
      case 'learn-to-breathe':
        return { emoji: '🐡🌊', ghost: '🐡', index: '05', color: 'from-cyan-900 via-teal-900 to-slate-950', borderHover: 'hover:border-cyan-400', accentText: 'text-cyan-400' };
      default:
        return { emoji: '🎮✨', ghost: '🎮', index: '06', color: 'from-slate-800 to-slate-950', borderHover: 'hover:border-white', accentText: 'text-white' };
    }
  };

  const meta = getGameEmojiHero();

  return (
    <div
      id={`game-card-${game.id}`}
      className={`relative flex flex-col rounded-3xl bg-[#0f172a] border border-white/10 ${meta.borderHover} transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-black/50 group select-none`}
    >
      {/* Top Banner / Hero Art Container */}
      <div className={`relative h-44 w-full bg-gradient-to-br ${meta.color} p-5 flex flex-col justify-between overflow-hidden border-b border-white/10`}>
        {/* Background glow & animated patterns */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-0" />
        
        {/* Ghost background watermark icon */}
        <div className="absolute -right-4 -bottom-4 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none select-none z-0 flex items-center justify-center">
          {game.id === 'spider-rabbit' ? (
            <SpiderRabbitAvatar size="hero" className="opacity-20" />
          ) : (
            meta.ghost
          )}
        </div>

        {/* Top Badges & Numbered Index */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-white shadow-sm font-mono-tag">
              {game.genre}
            </span>
            <span className="bg-white/10 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest text-cyan-300 border border-white/10 font-mono-tag">
              {game.difficulty} MODE
            </span>
          </div>

          <div className={`text-3xl font-black text-white/20 group-hover:${meta.accentText} font-cyber transition-colors`}>
            {meta.index}
          </div>
        </div>

        {/* Center Hero Floating Badge & Title */}
        <div className="relative z-10 flex items-center gap-3 mt-2">
          <div className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-lg group-hover:rotate-6 transition-transform p-1">
            {game.id === 'spider-rabbit' ? (
              <SpiderRabbitAvatar size="sm" />
            ) : (
              meta.emoji.split(' ')[0]
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest font-mono-tag">
                {game.id === 'animal-mind-control' ? 'FEATURED NOW' : 'ONLINE ARCADE'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase italic font-cyber text-white leading-none drop-shadow-md">
              {game.title}
            </h3>
          </div>
        </div>

        {/* Bottom Banner Stats Pill */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/90 font-cyber">
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-mono-tag text-[11px]">Best: <b className="text-white font-bold">{userHighScore.toLocaleString()}</b></span>
          </div>
          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10 font-mono-tag text-[11px]">
            <span className="text-white/60">{userGamesPlayed} Plays</span>
          </div>
        </div>
      </div>

      {/* Card Body Content */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        {/* Tagline & Short Description */}
        <div>
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono-tag mb-1.5">
            // {game.tagline}
          </p>
          <p className="text-xs sm:text-sm text-white/70 line-clamp-2 leading-relaxed font-body">
            {game.shortDesc}
          </p>
        </div>

        {/* Key Gameplay Bullet Features */}
        <div className="space-y-1.5 py-1">
          {game.features.slice(0, 2).map((feature, i) => (
            <div
              key={i}
              className="text-xs text-white/80 flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5 font-mono-tag"
            >
              <span className="text-sm">{feature.split(' ')[0]}</span>
              <span className="truncate font-bold tracking-tight">{feature.substring(feature.indexOf(' ') + 1)}</span>
            </div>
          ))}
        </div>

        {/* Action Button: Full Width Play Now */}
        <div className="pt-2">
          <button
            id={`play-btn-${game.id}`}
            onClick={() => {
              sounds.playGameStart();
              onPlayGame(game.id);
            }}
            className="w-full px-6 py-3 rounded-full bg-white hover:bg-cyan-400 text-black font-black font-cyber text-sm uppercase tracking-tighter shadow-lg shadow-white/10 transform active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>PLAY NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
