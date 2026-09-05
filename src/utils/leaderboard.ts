import { GameId, LeaderboardEntry, UserProfile } from '../types';

const LEADERBOARD_STORAGE_KEY = 'ccs_game_leaderboards_v2';

// Seed initial arcade rival scores for each game to make the leaderboards lively and competitive
const INITIAL_SEED_DATA: Record<GameId, Omit<LeaderboardEntry, 'id' | 'gameId' | 'rank'>[]> = {
  'animal-mind-control': [
    { playerName: 'Kira_Mindset', gamerTag: 'Kira_#808', avatar: 'cyber-lion', score: 2400, extraMetric: '8/8 Synced • 240ms RT', date: '2 hours ago' },
    { playerName: 'ZenMaster_Lee', gamerTag: 'Zen_#412', avatar: 'ninja-panda', score: 2100, extraMetric: '7/8 Synced • 310ms RT', date: '5 hours ago' },
    { playerName: 'NovaPulse', gamerTag: 'Nova_#309', avatar: 'cyber-fox', score: 1800, extraMetric: '6/8 Synced • 340ms RT', date: '1 day ago' },
    { playerName: 'AstroBuddy', gamerTag: 'Astro_#112', avatar: 'astro-bunny', score: 1800, extraMetric: '6/8 Synced • 390ms RT', date: '1 day ago' },
    { playerName: 'ShadowClaw', gamerTag: 'Shadow_#774', avatar: 'pixel-tiger', score: 1500, extraMetric: '5/8 Synced • 420ms RT', date: '2 days ago' },
    { playerName: 'StarBlaster', gamerTag: 'Star_#551', avatar: 'cosmic-bear', score: 1200, extraMetric: '4/8 Synced • 460ms RT', date: '3 days ago' },
    { playerName: 'PixelRonin', gamerTag: 'Ronin_#990', avatar: 'robot-spark', score: 900, extraMetric: '3/8 Synced • 510ms RT', date: '4 days ago' },
  ],
  'spider-rabbit': [
    { playerName: 'SpeedyVortex', gamerTag: 'Vortex_#992', avatar: 'astro-bunny', score: 4850, extraMetric: '99% Line Stay • 16 Distractions', date: '1 hour ago' },
    { playerName: 'HyperSonic', gamerTag: 'Sonic_#717', avatar: 'cyber-fox', score: 4320, extraMetric: '96% Line Stay • 15 Distractions', date: '3 hours ago' },
    { playerName: 'DriftKing', gamerTag: 'Drift_#404', avatar: 'pixel-tiger', score: 3890, extraMetric: '94% Line Stay • 13 Distractions', date: '1 day ago' },
    { playerName: 'CyberNebula', gamerTag: 'Nebula_#223', avatar: 'neon-dragon', score: 3450, extraMetric: '91% Line Stay • 12 Distractions', date: '1 day ago' },
    { playerName: 'ArcadeRacer', gamerTag: 'Racer_#884', avatar: 'robot-spark', score: 2980, extraMetric: '88% Line Stay • 10 Distractions', date: '2 days ago' },
    { playerName: 'BobaPilot', gamerTag: 'Boba_#115', avatar: 'ninja-panda', score: 2510, extraMetric: '85% Line Stay • 9 Distractions', date: '3 days ago' },
    { playerName: 'EchoRunner', gamerTag: 'Echo_#662', avatar: 'cosmic-bear', score: 2120, extraMetric: '80% Line Stay • 8 Distractions', date: '5 days ago' },
  ],
  'music-matrix': [
    { playerName: 'MozartCyber', gamerTag: 'Mozart_#101', avatar: 'robot-spark', score: 5820, extraMetric: 'Max Combo 82x • 98% Beat Sync', date: '45 mins ago' },
    { playerName: 'SynthWaver', gamerTag: 'Wave_#440', avatar: 'cyber-fox', score: 5190, extraMetric: 'Max Combo 74x • 95% Beat Sync', date: '4 hours ago' },
    { playerName: 'ChronoKeys', gamerTag: 'Keys_#606', avatar: 'neon-dragon', score: 4680, extraMetric: 'Max Combo 65x • 93% Beat Sync', date: '1 day ago' },
    { playerName: 'BeatsCrafter', gamerTag: 'Beats_#313', avatar: 'pixel-tiger', score: 4120, extraMetric: 'Max Combo 58x • 90% Beat Sync', date: '1 day ago' },
    { playerName: 'MelodyQueen', gamerTag: 'Melody_#789', avatar: 'astro-bunny', score: 3640, extraMetric: 'Max Combo 48x • 87% Beat Sync', date: '2 days ago' },
    { playerName: 'BassDrop99', gamerTag: 'Bass_#909', avatar: 'cyber-lion', score: 3100, extraMetric: 'Max Combo 42x • 83% Beat Sync', date: '3 days ago' },
    { playerName: 'RhythmPanda', gamerTag: 'Panda_#228', avatar: 'ninja-panda', score: 2650, extraMetric: 'Max Combo 35x • 78% Beat Sync', date: '4 days ago' },
  ],
  'blasting-balloons': [
    { playerName: 'LaserSniper', gamerTag: 'Laser_#777', avatar: 'pixel-tiger', score: 8640, extraMetric: '99% Accuracy • 22 Target Line Hits', date: '30 mins ago' },
    { playerName: 'TurboPopper', gamerTag: 'Turbo_#520', avatar: 'cyber-fox', score: 7850, extraMetric: '96% Accuracy • 19 Target Line Hits', date: '2 hours ago' },
    { playerName: 'QuickSilver', gamerTag: 'Silver_#331', avatar: 'robot-spark', score: 6980, extraMetric: '93% Accuracy • 16 Target Line Hits', date: '6 hours ago' },
    { playerName: 'ApexTrigger', gamerTag: 'Apex_#818', avatar: 'neon-dragon', score: 6240, extraMetric: '90% Accuracy • 14 Target Line Hits', date: '1 day ago' },
    { playerName: 'CometBurst', gamerTag: 'Comet_#104', avatar: 'astro-bunny', score: 5490, extraMetric: '87% Accuracy • 12 Target Line Hits', date: '2 days ago' },
    { playerName: 'FlashMatrix', gamerTag: 'Flash_#602', avatar: 'cyber-lion', score: 4720, extraMetric: '84% Accuracy • 10 Target Line Hits', date: '3 days ago' },
    { playerName: 'StarBlasterX', gamerTag: 'StarX_#955', avatar: 'cosmic-bear', score: 3880, extraMetric: '80% Accuracy • 8 Target Line Hits', date: '4 days ago' },
  ],
  'learn-to-breathe': [
    { playerName: 'OceanMystic', gamerTag: 'Ocean_#001', avatar: 'astro-bunny', score: 3850, extraMetric: '4/4 Solved • 99% Ocean Respiration Sync', date: '1 hour ago' },
    { playerName: 'CoralSage', gamerTag: 'Sage_#812', avatar: 'ninja-panda', score: 3420, extraMetric: '4/4 Solved • 96% Ocean Respiration Sync', date: '3 hours ago' },
    { playerName: 'DeepDiver', gamerTag: 'Diver_#319', avatar: 'cosmic-bear', score: 3100, extraMetric: '4/4 Solved • 92% Ocean Respiration Sync', date: '1 day ago' },
    { playerName: 'TideWatcher', gamerTag: 'Tide_#505', avatar: 'neon-dragon', score: 2680, extraMetric: '3/4 Solved • 89% Ocean Respiration Sync', date: '1 day ago' },
    { playerName: 'AquaPuff', gamerTag: 'Puff_#244', avatar: 'cyber-fox', score: 2350, extraMetric: '3/4 Solved • 85% Ocean Respiration Sync', date: '2 days ago' },
    { playerName: 'WaveWhisperer', gamerTag: 'Wave_#667', avatar: 'cyber-lion', score: 1950, extraMetric: '2/4 Solved • 80% Ocean Respiration Sync', date: '3 days ago' },
    { playerName: 'ReefExplorer', gamerTag: 'Reef_#119', avatar: 'robot-spark', score: 1520, extraMetric: '2/4 Solved • 75% Ocean Respiration Sync', date: '4 days ago' },
  ],
};

function loadStoredLeaderboards(): Record<GameId, LeaderboardEntry[]> {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return initializeSeedData();
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return initializeSeedData();
  }
}

function initializeSeedData(): Record<GameId, LeaderboardEntry[]> {
  const initial: Record<GameId, LeaderboardEntry[]> = {
    'animal-mind-control': [],
    'spider-rabbit': [],
    'music-matrix': [],
    'blasting-balloons': [],
    'learn-to-breathe': [],
  };

  (Object.keys(INITIAL_SEED_DATA) as GameId[]).forEach((gameId) => {
    initial[gameId] = INITIAL_SEED_DATA[gameId].map((item, idx) => ({
      ...item,
      id: `seed_${gameId}_${idx}`,
      gameId,
      isCurrentPlayer: false,
    }));
  });

  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {
    console.error('Failed to save initial leaderboard seeds', e);
  }

  return initial;
}

function saveLeaderboards(data: Record<GameId, LeaderboardEntry[]>): void {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save leaderboards', e);
  }
}

export function getGameLeaderboard(
  gameId: GameId,
  currentPlayerTag?: string
): {
  entries: LeaderboardEntry[];
  playerRank: number | null;
  playerEntry: LeaderboardEntry | null;
} {
  const store = loadStoredLeaderboards();
  const list = store[gameId] || [];

  // Sort descending by score
  const sorted = [...list].sort((a, b) => b.score - a.score);

  // Assign ranks (1-indexed)
  const rankedEntries: LeaderboardEntry[] = sorted.map((entry, index) => {
    const isPlayer = !!currentPlayerTag && entry.gamerTag === currentPlayerTag;
    return {
      ...entry,
      rank: index + 1,
      isCurrentPlayer: isPlayer,
    };
  });

  const playerIndex = currentPlayerTag
    ? rankedEntries.findIndex((e) => e.gamerTag === currentPlayerTag)
    : -1;

  const playerRank = playerIndex !== -1 ? playerIndex + 1 : null;
  const playerEntry = playerIndex !== -1 ? rankedEntries[playerIndex] : null;

  return {
    entries: rankedEntries,
    playerRank,
    playerEntry,
  };
}

export function recordGameScore(
  gameId: GameId,
  profile: UserProfile,
  score: number,
  extraMetric?: string
): {
  rank: number;
  totalPlayers: number;
  entry: LeaderboardEntry;
  isNewHighScore: boolean;
  entries: LeaderboardEntry[];
} {
  const store = loadStoredLeaderboards();
  if (!store[gameId]) {
    store[gameId] = [];
  }

  const existingIndex = store[gameId].findIndex(
    (e) => e.gamerTag === profile.gamerTag || (e.playerName === profile.name && e.isCurrentPlayer)
  );

  let isNewHighScore = false;
  let entryToSave: LeaderboardEntry;

  const nowString = 'Just now';

  if (existingIndex >= 0) {
    const currentRecord = store[gameId][existingIndex];
    if (score >= currentRecord.score) {
      isNewHighScore = true;
      entryToSave = {
        ...currentRecord,
        playerName: profile.name,
        gamerTag: profile.gamerTag,
        avatar: profile.avatar,
        gender: profile.gender,
        score: Math.max(score, currentRecord.score),
        extraMetric: extraMetric || currentRecord.extraMetric,
        date: nowString,
        isCurrentPlayer: true,
      };
      store[gameId][existingIndex] = entryToSave;
    } else {
      entryToSave = currentRecord;
    }
  } else {
    isNewHighScore = true;
    entryToSave = {
      id: `player_${gameId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      gameId,
      playerName: profile.name,
      gamerTag: profile.gamerTag,
      avatar: profile.avatar,
      gender: profile.gender,
      score,
      extraMetric,
      date: nowString,
      isCurrentPlayer: true,
    };
    store[gameId].push(entryToSave);
  }

  // Save back
  saveLeaderboards(store);

  // Re-fetch sorted with ranks
  const { entries, playerRank } = getGameLeaderboard(gameId, profile.gamerTag);

  return {
    rank: playerRank || entries.length,
    totalPlayers: entries.length,
    entry: entryToSave,
    isNewHighScore,
    entries,
  };
}

export function getRankMedal(rank: number): { emoji: string; label: string; bg: string; text: string; border: string } {
  if (rank === 1) {
    return { emoji: '👑 1ST', label: 'CHAMPION', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/60' };
  }
  if (rank === 2) {
    return { emoji: '🥈 2ND', label: 'RUNNER UP', bg: 'bg-slate-300/20', text: 'text-slate-200', border: 'border-slate-300/60' };
  }
  if (rank === 3) {
    return { emoji: '🥉 3RD', label: 'BRONZE STAR', bg: 'bg-amber-700/20', text: 'text-amber-400', border: 'border-amber-600/60' };
  }
  if (rank <= 5) {
    return { emoji: `#${rank}`, label: 'TOP 5', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' };
  }
  if (rank <= 10) {
    return { emoji: `#${rank}`, label: 'TOP 10', bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' };
  }
  return { emoji: `#${rank}`, label: 'ARCADE CONTENDER', bg: 'bg-white/10', text: 'text-white/70', border: 'border-white/20' };
}
