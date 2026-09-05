import React, { useState, useEffect } from 'react';
import { UserProfile, GameId } from './types';
import { GAMES_DATA } from './data/games';
import { sounds } from './utils/audio';
import { SignInModal } from './components/SignInModal';
import { DashboardHeader } from './components/DashboardHeader';
import { GameCard } from './components/GameCard';
import { PlayerPassportModal } from './components/PlayerPassportModal';

// Game Components
import { AnimalMindControl } from './components/games/AnimalMindControl';
import { SpiderRabbitGame } from './components/games/SpiderRabbitGame';
import { MusicMatrix } from './components/games/MusicMatrix';
import { BlastingBalloons } from './components/games/BlastingBalloons';
import { LearnToBreathe } from './components/games/LearnToBreathe';
import { SpiderRabbitAvatar } from './components/SpiderRabbitAvatar';

import { Sparkles, Trophy, Flame, Play, Star, Shield, HelpCircle, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'ccs_gaming_hub_player_v1';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const [showPassportModal, setShowPassportModal] = useState<boolean>(false);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All Games');
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile]);

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    sounds.playLevelUp();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handlePlayGame = (gameId: string) => {
    if (!profile) {
      setShowSignInModal(true);
      return;
    }
    setActiveGame(gameId as GameId);
  };

  const handleUpdateScore = (gameId: GameId, score: number, earnedXp: number, coins: number) => {
    if (!profile) return;

    setProfile((prev) => {
      if (!prev) return prev;
      const currentHigh = prev.highScores[gameId] || 0;
      const newHighScore = Math.max(currentHigh, score);
      const currentPlays = prev.gamesPlayed[gameId] || 0;
      const newXp = prev.xp + earnedXp;
      const newLevel = Math.max(1, Math.floor(newXp / 1000) + 1);
      const newCoins = prev.coins + coins;

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        coins: newCoins,
        highScores: {
          ...prev.highScores,
          [gameId]: newHighScore,
        },
        gamesPlayed: {
          ...prev.gamesPlayed,
          [gameId]: currentPlays + 1,
        },
      };
    });
  };

  // Filter games based on active category
  const filteredGames = GAMES_DATA.filter((game) => {
    if (activeCategory === 'All Games') return true;
    return game.genre === activeCategory;
  });

  // Active Game Screen View
  if (activeGame && profile) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col justify-between">
        <DashboardHeader
          profile={profile}
          onOpenPassport={() => setShowPassportModal(true)}
          onEditProfile={() => setShowSignInModal(true)}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />

        <main className="flex-1 py-6">
          {activeGame === 'animal-mind-control' && (
            <AnimalMindControl
              profile={profile}
              onBackToHub={() => setActiveGame(null)}
              onSelectGame={(gameId) => setActiveGame(gameId)}
              onUpdateScore={handleUpdateScore}
            />
          )}

          {activeGame === 'spider-rabbit' && (
            <SpiderRabbitGame
              profile={profile}
              onBackToHub={() => setActiveGame(null)}
              onSelectGame={(gameId) => setActiveGame(gameId)}
              onUpdateScore={handleUpdateScore}
            />
          )}

          {activeGame === 'music-matrix' && (
            <MusicMatrix
              profile={profile}
              onBackToHub={() => setActiveGame(null)}
              onSelectGame={(gameId) => setActiveGame(gameId)}
              onUpdateScore={handleUpdateScore}
            />
          )}

          {activeGame === 'blasting-balloons' && (
            <BlastingBalloons
              profile={profile}
              onBackToHub={() => setActiveGame(null)}
              onSelectGame={(gameId) => setActiveGame(gameId)}
              onUpdateScore={handleUpdateScore}
            />
          )}

          {activeGame === 'learn-to-breathe' && (
            <LearnToBreathe
              profile={profile}
              onBackToHub={() => setActiveGame(null)}
              onSelectGame={(gameId) => setActiveGame(gameId)}
              onUpdateScore={handleUpdateScore}
            />
          )}
        </main>

        <PlayerPassportModal
          isOpen={showPassportModal}
          onClose={() => setShowPassportModal(false)}
          profile={profile}
          onEditProfile={() => {
            setShowPassportModal(false);
            setShowSignInModal(true);
          }}
        />

        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSaveProfile={handleSaveProfile}
          initialProfile={profile}
        />
      </div>
    );
  }

  // Default Main Dashboard Hub
  return (
    <div className="w-full min-h-screen bg-slate-950 text-white flex flex-col selection:bg-fuchsia-500 selection:text-white">
      {/* Dashboard Top Header */}
      {profile && (
        <DashboardHeader
          profile={profile}
          onOpenPassport={() => setShowPassportModal(true)}
          onEditProfile={() => setShowSignInModal(true)}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Hero Welcome & Featured Spotlight Banner */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        {/* Top Header Title for Desktop */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 uppercase">
              CCS GAMING HUB
            </h1>
            <p className="text-cyan-400 font-mono-tag text-xs sm:text-sm tracking-widest mt-2 ml-1 uppercase">
              PLAY WITHOUT LIMITS // MULTIVERSE ARCADE
            </p>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <button
                id="dash-passport-cta-btn"
                onClick={() => setShowPassportModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3 rounded-full font-black font-cyber text-xs sm:text-sm uppercase tracking-tighter transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>PASSPORT</span>
              </button>
            ) : (
              <button
                id="dash-signin-cta-btn"
                onClick={() => setShowSignInModal(true)}
                className="bg-white text-black hover:bg-cyan-400 px-7 py-3 rounded-full font-black font-cyber text-xs sm:text-sm uppercase tracking-tighter transition-all flex items-center gap-2 cursor-pointer shadow-xl"
              >
                <UserCheck className="w-4 h-4 text-black" />
                <span>CREATE PLAYER ID</span>
              </button>
            )}
          </div>
        </div>

        {/* Featured Showcase Hero Layout (When "All Games" is active) */}
        {activeCategory === 'All Games' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Col-Span-2 Featured Hero Card: Animal Mind Control */}
            <div className="lg:col-span-2 relative group overflow-hidden rounded-3xl border-2 border-white/10 bg-gradient-to-br from-violet-950 via-slate-900 to-[#020617] min-h-[360px] p-6 sm:p-8 flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
              <div className="absolute -right-6 -bottom-6 text-[180px] opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-700 pointer-events-none select-none z-0">
                🦁🧠
              </div>

              {/* Top Meta Badges */}
              <div className="relative z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-widest text-white shadow-md font-mono-tag">
                    FEATURED NOW
                  </span>
                  <span className="bg-white/10 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-cyan-300 border border-white/10 font-mono-tag">
                    MIND & PUZZLE • TELEPATHIC TRACKING
                  </span>
                </div>
                <div className="text-4xl font-black text-white/20 group-hover:text-cyan-400 transition-colors font-cyber">
                  01
                </div>
              </div>

              {/* Bottom Content */}
              <div className="relative z-20 mt-10 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                  <span className="text-xs font-mono-tag text-cyan-400 font-bold uppercase tracking-widest">
                    TELEPATHIC RUNE LINK // 5 GUARDIAN SPIRITS
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black mb-3 uppercase italic font-cyber tracking-tight text-white leading-none">
                  ANIMAL MIND CONTROL
                </h2>
                <p className="text-white/70 text-xs sm:text-sm mb-6 leading-relaxed font-body">
                  Enter the mystical sanctuary and master the telepathic link between creatures to solve psychic brainwave puzzles and harmonize the ancient realm.
                </p>
                <div>
                  <button
                    onClick={() => handlePlayGame('animal-mind-control')}
                    className="bg-white text-black px-8 py-3.5 rounded-full font-black font-cyber text-sm uppercase tracking-tighter hover:bg-cyan-400 transition-colors shadow-2xl flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>PLAY NOW</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Side 1-Col Stacked Cards: Spider Rabbit & Music Matrix */}
            <div className="flex flex-col gap-6">
              {/* Spider Rabbit Card */}
              <div
                onClick={() => handlePlayGame('spider-rabbit')}
                className="flex-1 bg-gradient-to-br from-red-600 via-rose-700 to-blue-900 rounded-3xl p-6 relative overflow-hidden group border border-white/10 hover:border-red-400 transition-all cursor-pointer min-h-[170px] flex flex-col justify-between"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center p-1">
                    <SpiderRabbitAvatar size="sm" />
                  </div>
                  <div className="text-2xl font-black text-white/20 group-hover:text-red-300 font-cyber">02</div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest font-mono-tag">
                      ONLINE ARCADE
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic font-cyber leading-tight text-white">
                    SPIDER-RABBIT<br />NO WAY HOME
                  </h3>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-15 group-hover:scale-110 transition-transform pointer-events-none select-none">
                  <SpiderRabbitAvatar size="hero" />
                </div>
              </div>

              {/* Music Matrix Card */}
              <div
                onClick={() => handlePlayGame('music-matrix')}
                className="flex-1 bg-gradient-to-br from-pink-600 to-purple-900 rounded-3xl p-6 relative overflow-hidden group border border-white/10 hover:border-pink-400 transition-all cursor-pointer min-h-[170px] flex flex-col justify-between"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="text-3xl">🎶🎹</div>
                  <div className="text-2xl font-black text-white/20 group-hover:text-pink-300 font-cyber">03</div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest font-mono-tag">
                      RHYTHM PIANO
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic font-cyber leading-tight text-white">
                    MUSIC<br />MATRIX
                  </h3>
                </div>
                <div className="absolute -right-4 -bottom-4 text-8xl sm:text-9xl opacity-10 group-hover:scale-110 transition-transform pointer-events-none select-none">
                  🎹
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Launch Cards Row: Blasting Balloons & Agent Blowfish */}
        {activeCategory === 'All Games' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div
              onClick={() => handlePlayGame('blasting-balloons')}
              className="bg-[#0f172a] rounded-3xl p-6 border border-white/10 flex items-center justify-between group hover:border-yellow-400 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(250,204,21,0.3)] group-hover:scale-105 transition-transform">
                  🎈
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic font-cyber text-white">
                    BLASTING BALLOONS
                  </h3>
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider font-mono-tag">
                    Time Perception Blast
                  </p>
                </div>
              </div>
              <div className="text-2xl font-black text-white/10 group-hover:text-yellow-400 font-cyber transition-colors">
                04
              </div>
            </div>

            <div
              onClick={() => handlePlayGame('learn-to-breathe')}
              className="bg-[#0f172a] rounded-3xl p-6 border border-white/10 flex items-center justify-between group hover:border-cyan-400 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform text-slate-950">
                  🐡
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic font-cyber text-white">
                    AGENT BLOWFISH
                  </h3>
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider font-mono-tag">
                    Biofeedback Respiration
                  </p>
                </div>
              </div>
              <div className="text-2xl font-black text-white/10 group-hover:text-cyan-400 font-cyber transition-colors">
                05
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Game Grid Showcase */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-xl sm:text-2xl font-black font-cyber uppercase italic tracking-wider text-white">
              {activeCategory.toUpperCase()} ({filteredGames.length})
            </h2>
          </div>

          <span className="text-xs text-cyan-400/80 font-mono-tag font-bold uppercase tracking-widest">
            ALL 5 GAMES PLAYABLE // INSTANT LAUNCH
          </span>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              profile={
                profile || {
                  name: 'Player',
                  gender: 'Boy',
                  avatar: 'cyber-fox',
                  gamerTag: 'Player_#101',
                  xp: 0,
                  level: 1,
                  coins: 0,
                  badges: [],
                  highScores: {
                    'animal-mind-control': 0,
                    'spider-rabbit': 0,
                    'music-matrix': 0,
                    'blasting-balloons': 0,
                    'learn-to-breathe': 0,
                  },
                  gamesPlayed: {
                    'animal-mind-control': 0,
                    'spider-rabbit': 0,
                    'music-matrix': 0,
                    'blasting-balloons': 0,
                    'learn-to-breathe': 0,
                  },
                  joinedAt: new Date().toISOString(),
                }
              }
              onPlayGame={handlePlayGame}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 mt-6 text-center text-xs font-mono-tag">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-white/40">
            CCS GAMING HUB • MULTIVERSE ARCADE
          </p>
        </div>
      </footer>

      {/* Modals */}
      {profile && (
        <PlayerPassportModal
          isOpen={showPassportModal}
          onClose={() => setShowPassportModal(false)}
          profile={profile}
          onEditProfile={() => {
            setShowPassportModal(false);
            setShowSignInModal(true);
          }}
        />
      )}

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSaveProfile={handleSaveProfile}
        initialProfile={profile}
      />
    </div>
  );
}
