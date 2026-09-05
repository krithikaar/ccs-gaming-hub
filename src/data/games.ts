import { GameDefinition } from '../types';

export const GAMES_DATA: GameDefinition[] = [
  {
    id: 'animal-mind-control',
    title: 'Animal Mind Control',
    tagline: 'Connect neural links to animal minds & detect which spirit mirrors your movement!',
    shortDesc: 'Sync your brainwaves with 5 cute animal spirits in an enchanted forest. Move your mouse for 3 seconds and discover which animal you are telepathically controlling!',
    genre: 'Mind & Puzzle',
    difficulty: 'Dynamic',
    colorScheme: {
      primary: 'from-violet-600 to-indigo-700',
      secondary: 'bg-indigo-950/80',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
      glow: 'shadow-violet-500/40',
      badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      textAccent: 'text-violet-400',
    },
    iconName: 'Brain',
    features: [
      '🧠 Neural Link Trajectory Sync',
      '🌸 5 Adorable Animal Avatars',
      '🌳 Dynamic Forest Arena & Sunbeams',
      '⚡ 8-Trial Fast-Paced Telepathy Challenge'
    ],
    achievements: [
      { id: 'amc_1', title: 'Mind Reader', desc: 'Correctly identify your first controlled animal', icon: '🧠', xp: 100 },
      { id: 'amc_2', title: 'Grand Telepath', desc: 'Achieve 100% sync rate across all 8 trials', icon: '🌟', xp: 250 },
      { id: 'amc_3', title: 'Psychic Overdrive', desc: 'Score over 1,800 telepathic points', icon: '⚡', xp: 500 }
    ]
  },
  {
    id: 'spider-rabbit',
    title: 'Spider-Rabbit No Way Home',
    tagline: 'Guide Spider-Rabbit back home safely along a winding road & press the carrot when distracted!',
    shortDesc: 'Guide Spider-Rabbit along winding garden tracks, avoid grassy boundaries, and press the carrot button immediately whenever control is lost.',
    genre: 'Superhero Action',
    difficulty: 'Medium',
    colorScheme: {
      primary: 'from-red-600 via-rose-600 to-blue-600',
      secondary: 'bg-slate-900/90',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #2563eb 100%)',
      glow: 'shadow-red-500/40',
      badgeBg: 'bg-red-500/20 text-rose-300 border-red-500/30',
      textAccent: 'text-rose-400',
    },
    iconName: 'Zap',
    features: [
      '🎯 Continuous Road Midline Motor Tracking',
      '🥕 Reflex Distraction Detection (Hit, Miss, False Alarm)',
      '⚡ Dynamic Deviation Engine',
      '🌸 Garden Scenery & Dynamic Road Physics'
    ],
    achievements: [
      { id: 'sr_1', title: 'Road Master', desc: 'Score over 2,500 points in a single run', icon: '🎯', xp: 150 },
      { id: 'sr_2', title: 'Carrot Reflex', desc: 'React to a distraction under 500ms', icon: '🥕', xp: 250 },
      { id: 'sr_3', title: 'Flawless Pilot', desc: 'Complete 2-minute run with 0 boundary collisions', icon: '🏆', xp: 500 }
    ]
  },
  {
    id: 'music-matrix',
    title: 'Music Matrix',
    tagline: '2-Lane Piano Tiles rhythm challenge synced to famous instrumental classical beats!',
    shortDesc: 'Sync your visual perception and motor reflexes to the rhythm of famous copyright-free instrumental tracks. As falling blocks touch the bottom target line when the beat drops, hit the Left Arrow [←] or Right Arrow [→] with millisecond precision!',
    genre: 'Rhythm Synth',
    difficulty: 'Dynamic',
    colorScheme: {
      primary: 'from-cyan-500 to-fuchsia-600',
      secondary: 'bg-slate-950/90',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)',
      glow: 'shadow-cyan-500/40',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      textAccent: 'text-cyan-400',
    },
    iconName: 'Music',
    features: [
      '🎹 2-Lane Piano Tiles Highway (Left & Right Arrows)',
      '🎵 Famous Copyright-Free Instrumental Songs (Ode to Joy, Für Elise, etc.)',
      '⚡ Sub-Millisecond Visual, Audio & Motor Rhythm Synchronization',
      '🏆 Single Composite Score Metric with Precision Analysis'
    ],
    achievements: [
      { id: 'mm_1', title: 'Beat Starter', desc: 'Hit 20 notes in rhythm', icon: '🎵', xp: 100 },
      { id: 'mm_2', title: 'Groove King', desc: 'Score a 30x PERFECT combo', icon: '🎧', xp: 250 },
      { id: 'mm_3', title: 'Matrix Maestro', desc: 'Score over 15,000 composite points on Ode to Joy', icon: '👑', xp: 500 }
    ]
  },
  {
    id: 'blasting-balloons',
    title: 'Blasting Balloons',
    tagline: 'Time your laser blast as rising balloons reach the target line! Blast within 30ms for maximum points!',
    shortDesc: 'A 60-second Time Perception Challenge! 2 inflated balloons float upwards toward the top laser line at different speeds. Click anywhere as they reach the line: <30ms lands High Points, <100ms lands Plus Points, while mistimed judgements lose points! ❄️ Snowflake triggers 4s Slow-Mo, ⚡ Lightning triggers 4s Hyperspeed.',
    genre: 'Arcade Popper',
    difficulty: 'Medium',
    colorScheme: {
      primary: 'from-cyan-500 via-violet-500 to-amber-400',
      secondary: 'bg-indigo-950/80',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #f59e0b 100%)',
      glow: 'shadow-cyan-500/40',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      textAccent: 'text-cyan-400',
    },
    iconName: 'Zap',
    features: [
      '🎯 Rising Target Line Precision Blast',
      '⏱️ Sub-30ms Precision Window for High Points',
      '🎈 2-3 Concurrent Rising Balloons at Variable Speeds',
      '❄️ Snowflake Slow-Mo & ⚡ Lightning Hyperspeed',
      '🏆 Integrated Single Final Score Calculation'
    ],
    achievements: [
      { id: 'bb_1', title: 'Line Sniper', desc: 'Land 10 sub-30ms laser blasts right at the target line', icon: '🎯', xp: 100 },
      { id: 'bb_2', title: 'Chrono Master', desc: 'Achieve an 85%+ Target Line Precision Accuracy', icon: '⏱️', xp: 250 },
      { id: 'bb_3', title: 'Hyper-Time Virtuoso', desc: 'Score over 3,000 points in one session', icon: '⚡', xp: 500 }
    ]
  },
  {
    id: 'learn-to-breathe',
    title: 'Agent Blowfish: Uncover Deep Sea Mystery',
    tagline: 'Breathe with Agent Blowfish to decode secret deep-sea emotional mysteries!',
    shortDesc: 'Sync your breath with Agent Blowfish! As it inflates (inhale) and deflates (exhale) across 30-second trials, discover how different respiration rhythms reflect Joy, Anger, Fear, and Sadness. Decode all 4 mysteries to earn ocean detective badges!',
    genre: 'Biofeedback Mystery',
    difficulty: 'Mindful',
    colorScheme: {
      primary: 'from-cyan-500 via-teal-500 to-amber-400',
      secondary: 'bg-cyan-950/80',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0d9488 50%, #f59e0b 100%)',
      glow: 'shadow-cyan-500/40',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      textAccent: 'text-cyan-400',
    },
    iconName: 'Sparkles',
    features: [
      '🐡 Spherical Blowfish Breath Sync',
      '🌊 4 Emotion Biofeedback Trials (Joy, Anger, Fear, Sadness)',
      '🐠 Deep Sea Ecosystem (Corals, Crabs, Swimming Fish)',
      '🏅 4 Collectible Ocean Detective Badges'
    ],
    achievements: [
      { id: 'lb_1', title: 'Deep Sea Scout', desc: 'Complete your first emotion breathing trial', icon: '🐡', xp: 100 },
      { id: 'lb_2', title: 'Ocean Empath', desc: 'Decode 3 or more emotions accurately', icon: '🪼', xp: 250 },
      { id: 'lb_3', title: 'Master Deep-Sea Empath', desc: 'Achieve a perfect 4/4 mystery score', icon: '👑', xp: 500 }
    ]
  }
];

export const AVATAR_OPTIONS = [
  { id: 'cyber-fox', name: 'Cyber Fox', emoji: '🦊', badge: 'Fast Reflexes', color: 'from-orange-500 to-amber-600' },
  { id: 'astro-bunny', name: 'Astro Bunny', emoji: '🐰', badge: 'Cosmic Jumper', color: 'from-pink-500 to-rose-600' },
  { id: 'pixel-tiger', name: 'Pixel Tiger', emoji: '🐯', badge: 'Power Striker', color: 'from-yellow-500 to-orange-600' },
  { id: 'neon-dragon', name: 'Neon Dragon', emoji: '🐲', badge: 'Mystic Flame', color: 'from-emerald-500 to-teal-600' },
  { id: 'cosmic-bear', name: 'Star Bear', emoji: '🐻', badge: 'Steadfast Shield', color: 'from-blue-500 to-indigo-600' },
  { id: 'cyber-lion', name: 'Cyber Lion', emoji: '🦁', badge: 'Pack Leader', color: 'from-purple-500 to-fuchsia-600' },
  { id: 'robot-spark', name: 'Robo Spark', emoji: '🤖', badge: 'Tech Prodigy', color: 'from-cyan-500 to-blue-600' },
  { id: 'ninja-panda', name: 'Ninja Panda', emoji: '🐼', badge: 'Silent Master', color: 'from-slate-600 to-slate-800' },
];
