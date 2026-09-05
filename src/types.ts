export type GameId = 
  | 'animal-mind-control'
  | 'spider-rabbit'
  | 'music-matrix'
  | 'blasting-balloons'
  | 'learn-to-breathe';

export interface UserProfile {
  name: string;
  gender: 'Boy' | 'Girl' | 'Cosmic Hero' | 'Custom';
  avatar: string;
  gamerTag: string;
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  highScores: Record<GameId, number>;
  gamesPlayed: Record<GameId, number>;
  joinedAt: string;
  themePreference?: string;
}

export interface GameAchievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  xp: number;
  unlocked?: boolean;
}

export interface GameDefinition {
  id: GameId;
  title: string;
  tagline: string;
  shortDesc: string;
  genre: 'Mind & Puzzle' | 'Superhero Action' | 'Rhythm Synth' | 'Arcade Popper' | 'Zen Mindfulness' | 'Biofeedback Mystery';
  colorScheme: {
    primary: string;
    secondary: string;
    gradient: string;
    glow: string;
    badgeBg: string;
    textAccent: string;
  };
  iconName: string;
  difficulty: 'Easy' | 'Medium' | 'Dynamic' | 'Relaxing' | 'Mindful';
  features: string[];
  achievements: GameAchievement[];
}

export interface LeaderboardEntry {
  id: string;
  gameId: GameId;
  playerName: string;
  gamerTag: string;
  avatar: string;
  gender?: string;
  score: number;
  extraMetric?: string;
  date: string;
  isCurrentPlayer?: boolean;
  rank?: number;
}
