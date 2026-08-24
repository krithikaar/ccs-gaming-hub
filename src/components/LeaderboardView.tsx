import React, { useState, useEffect } from 'react';
import { GameId, LeaderboardEntry, UserProfile } from '../types';
import { GAMES_DATA, AVATAR_OPTIONS } from '../data/games';
import { getGameLeaderboard, getRankMedal } from '../utils/leaderboard';
import { sounds } from '../utils/audio';
import { Trophy, Medal, Crown, Star, Flame, ArrowLeft, RotateCcw, Play, CheckCircle, Award } from 'lucide-react';
import { SpiderRabbitAvatar } from './SpiderRabbitAvatar';

interface LeaderboardViewProps {
  initialGameId?: GameId;
  profile?: UserProfile | null;
  onClose?: () => void;
  onPlayGame?: (gameId: GameId) => void;
  highlightPlayerGamerTag?: string;
  isEmbeddedInGame?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  initialGameId = 'animal-mind-control',
  profile,
  onClose,
  onPlayGame,
  highlightPlayerGamerTag,
  isEmbeddedInGame = false,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<GameId>(initialGameId);
  const [leaderboardData, setLeaderboardData] = useState<{
    entries: LeaderboardEntry[];
    playerRank: number | null;
    playerEntry: LeaderboardEntry | null;
  }>({ entries: [], playerRank: null, playerEntry: null });

  const activeTag = highlightPlayerGamerTag || profile?.gamerTag;

  useEffect(() => {
    const data = getGameLeaderboard(selectedGameId, activeTag);
    setLeaderboardData(data);
  }, [selectedGameId, activeTag]);

  const activeGameDef = GAMES_DATA.find((g) => g.id === selectedGameId) || GAMES_DATA[0];

  const getAvatarDetails = (avatarId: string) => {
    const opt = AVATAR_OPTIONS.find((a) => a.id === avatarId);
    return opt || { name: 'Player', emoji: '🎮', color: 'from-cyan-500 to-blue-600' };
  };

  const top3 = leaderboardData.entries.slice(0, 3);
  const remainingEntries = leaderboardData.entries.slice(3);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 text-white select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              id="leaderboard-back-btn"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-cyan-400 transition-all cursor-pointer shadow-lg"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />
              <h1 className="text-2xl sm:text-3xl font-black font-cyber uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400">
                MULTIVERSE ARCADE LEADERBOARD
              </h1>
            </div>
            <p className="text-xs font-mono-tag text-cyan-400 uppercase tracking-widest mt-0.5">
              GLOBAL RANKINGS & PLAYER HALL OF FAME
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {onPlayGame && (
            <button
              id="leaderboard-play-game-btn"
              onClick={() => {
                sounds.playClick();
                onPlayGame(selectedGameId);
              }}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-cyan-400 text-black font-black font-cyber text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xl transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>PLAY {activeGameDef.title.split(' ')[0].toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {GAMES_DATA.map((game) => {
          const isSelected = game.id === selectedGameId;
          return (
            <button
              key={game.id}
              onClick={() => {
                sounds.playClick();
                setSelectedGameId(game.id);
              }}
              className={`px-4 py-2.5 rounded-2xl font-cyber text-xs uppercase font-bold tracking-wider whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <span>{game.id === 'spider-rabbit' ? '🐰' : game.id === 'animal-mind-control' ? '🧠' : game.id === 'music-matrix' ? '🎹' : game.id === 'blasting-balloons' ? '🎈' : '🐡'}</span>
              <span>{game.title}</span>
            </button>
          );
        })}
      </div>

      {/* Current Player Rank Spotlight Banner */}
      {profile && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none select-none">
            🏆
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-black/50 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                {selectedGameId === 'spider-rabbit' ? (
                  <SpiderRabbitAvatar size="sm" />
                ) : (
                  <span>{getAvatarDetails(profile.avatar).emoji}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xs font-mono-tag text-cyan-400 font-bold uppercase tracking-wider">
                    YOUR CURRENT STANDING
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono-tag font-bold border border-cyan-500/30">
                    ACTIVE RUNNER
                  </span>
                </div>
                <h3 className="text-xl font-black font-cyber text-white uppercase italic">
                  {profile.name} <span className="text-xs font-mono-tag text-white/50 not-italic">({profile.gamerTag})</span>
                </h3>
                {leaderboardData.playerEntry?.extraMetric && (
                  <p className="text-xs font-mono-tag text-white/60">
                    {leaderboardData.playerEntry.extraMetric}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-mono-tag text-white/50 block uppercase">YOUR GAME RANK</span>
                {leaderboardData.playerRank ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black font-cyber text-yellow-400">
                      #{leaderboardData.playerRank}
                    </span>
                    <span className="text-xs font-mono-tag text-white/60">
                      OF {leaderboardData.entries.length} PLAYERS
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-cyber font-bold text-white/60">
                    UNRANKED (PLAY TO RANK!)
                  </span>
                )}
              </div>

              {leaderboardData.playerEntry && (
                <div className="p-3 sm:p-4 rounded-2xl bg-black/60 border border-amber-500/40 text-center min-w-[110px]">
                  <span className="text-[10px] font-mono-tag text-amber-400/80 uppercase block font-bold">BEST SCORE</span>
                  <span className="text-xl sm:text-2xl font-black font-cyber text-amber-300">
                    {leaderboardData.playerEntry.score.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <div className={`order-2 md:order-1 p-5 rounded-3xl bg-[#0f172a] border-2 ${top3[1].isCurrentPlayer ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-slate-400/30'} flex flex-col justify-between relative`}>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs font-cyber font-black">
                  🥈 2ND PLACE
                </span>
                <span className="text-[10px] font-mono-tag text-white/40">{top3[1].date}</span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center text-2xl">
                  {selectedGameId === 'spider-rabbit' && top3[1].isCurrentPlayer ? (
                    <SpiderRabbitAvatar size="sm" />
                  ) : (
                    <span>{getAvatarDetails(top3[1].avatar).emoji}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-cyber font-black text-white text-base truncate">
                    {top3[1].playerName}
                    {top3[1].isCurrentPlayer && <span className="ml-2 text-[10px] text-cyan-400 font-mono-tag">(YOU)</span>}
                  </h4>
                  <p className="text-xs font-mono-tag text-white/40">{top3[1].gamerTag}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono-tag text-white/40 uppercase">SCORE</span>
                <span className="text-xl font-cyber font-black text-slate-200">
                  {top3[1].score.toLocaleString()} PTS
                </span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Elevated Champion) */}
          {top3[0] && (
            <div className={`order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-[#0f172a] border-2 ${top3[0].isCurrentPlayer ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' : 'border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.2)]'} flex flex-col justify-between relative transform md:-translate-y-2`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-cyber font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>CHAMPION</span>
              </div>
              <div className="flex items-center justify-between mb-3 pt-1">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-cyber font-black">
                  👑 1ST PLACE
                </span>
                <span className="text-[10px] font-mono-tag text-white/40">{top3[0].date}</span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg">
                  {selectedGameId === 'spider-rabbit' && top3[0].isCurrentPlayer ? (
                    <SpiderRabbitAvatar size="sm" />
                  ) : (
                    <span>{getAvatarDetails(top3[0].avatar).emoji}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-cyber font-black text-amber-300 text-lg truncate">
                    {top3[0].playerName}
                    {top3[0].isCurrentPlayer && <span className="ml-2 text-[10px] text-cyan-400 font-mono-tag">(YOU)</span>}
                  </h4>
                  <p className="text-xs font-mono-tag text-white/50">{top3[0].gamerTag}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono-tag text-amber-400 uppercase font-bold">RECORD SCORE</span>
                <span className="text-2xl font-cyber font-black text-amber-300">
                  {top3[0].score.toLocaleString()} PTS
                </span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <div className={`order-3 p-5 rounded-3xl bg-[#0f172a] border-2 ${top3[2].isCurrentPlayer ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-amber-700/40'} flex flex-col justify-between relative`}>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full bg-amber-700/20 text-amber-400 border border-amber-600/40 text-xs font-cyber font-black">
                  🥉 3RD PLACE
                </span>
                <span className="text-[10px] font-mono-tag text-white/40">{top3[2].date}</span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-700 flex items-center justify-center text-2xl">
                  {selectedGameId === 'spider-rabbit' && top3[2].isCurrentPlayer ? (
                    <SpiderRabbitAvatar size="sm" />
                  ) : (
                    <span>{getAvatarDetails(top3[2].avatar).emoji}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-cyber font-black text-white text-base truncate">
                    {top3[2].playerName}
                    {top3[2].isCurrentPlayer && <span className="ml-2 text-[10px] text-cyan-400 font-mono-tag">(YOU)</span>}
                  </h4>
                  <p className="text-xs font-mono-tag text-white/40">{top3[2].gamerTag}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono-tag text-white/40 uppercase">SCORE</span>
                <span className="text-xl font-cyber font-black text-amber-400">
                  {top3[2].score.toLocaleString()} PTS
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-[#0f172a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-cyber font-black uppercase text-white tracking-wider">
              {activeGameDef.title} • ALL RUNNERS
            </h3>
          </div>
          <span className="text-xs font-mono-tag text-white/50">
            {leaderboardData.entries.length} REGISTERED SCORES
          </span>
        </div>

        <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
          {leaderboardData.entries.map((entry, idx) => {
            const medal = getRankMedal(entry.rank || idx + 1);
            const isSelf = entry.isCurrentPlayer;

            return (
              <div
                key={entry.id || idx}
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  isSelf
                    ? 'bg-cyan-500/10 border-l-4 border-cyan-400 shadow-inner'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-cyber font-black text-xs ${medal.bg} ${medal.text} border ${medal.border} shrink-0`}
                  >
                    {entry.rank || idx + 1}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-xl shrink-0">
                    {selectedGameId === 'spider-rabbit' && isSelf ? (
                      <SpiderRabbitAvatar size="sm" />
                    ) : (
                      <span>{getAvatarDetails(entry.avatar).emoji}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-cyber font-black text-sm truncate ${isSelf ? 'text-cyan-300' : 'text-white'}`}>
                        {entry.playerName}
                      </span>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-mono-tag font-black shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono-tag text-white/40 truncate">
                      <span>{entry.gamerTag}</span>
                      {entry.extraMetric && (
                        <>
                          <span>•</span>
                          <span className="text-white/60 truncate">{entry.extraMetric}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score & Date */}
                <div className="text-right shrink-0">
                  <span className={`text-lg sm:text-xl font-cyber font-black block ${isSelf ? 'text-cyan-300' : 'text-white'}`}>
                    {entry.score.toLocaleString()} <span className="text-xs text-white/50">PTS</span>
                  </span>
                  <span className="text-[10px] font-mono-tag text-white/40 block">
                    {entry.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs font-mono-tag text-white/40">
          Rankings update dynamically at the end of each game run.
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-cyber font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {isEmbeddedInGame ? 'BACK TO SCORE SUMMARY' : 'CLOSE LEADERBOARD'}
            </button>
          )}

          {onPlayGame && (
            <button
              onClick={() => {
                sounds.playClick();
                onPlayGame(selectedGameId);
              }}
              className="px-8 py-3 rounded-full bg-white hover:bg-cyan-400 text-black font-cyber font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xl"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
