import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import {
  Brain,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Zap,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Radio,
  Eye,
  Compass,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  AnimalType,
  ANIMAL_CONFIGS,
  ANIMAL_LIST,
  ChibiAvatar,
} from './ChibiAnimals';
import { MangaForestBackground } from './MangaForestBackground';

interface AnimalMindControlProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'animal-mind-control', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

// 8 Trials total per session with 3-second duration
const TOTAL_TRIALS = 8;
const TRIAL_DURATION_SEC = 3.0;
const POINTS_CORRECT = 300;
const POINTS_INCORRECT_PENALTY = 100;

interface AnimalEntityState {
  type: AnimalType;
  x: number; // offset from circle center (-maxRadius to +maxRadius)
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  wanderTimer: number;
  noisePhase: number;
}

interface TrialResult {
  trialNumber: number;
  targetAnimal: AnimalType;
  selectedAnimal: AnimalType;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
}

export const AnimalMindControl: React.FC<AnimalMindControlProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  // Game States: 'intro' -> 'trial_running' (3s mouse observation) -> 'question' (pick animal) -> 'feedback' (show result) -> 'summary' -> 'leaderboard'
  const [gameState, setGameState] = useState<'intro' | 'trial_running' | 'question' | 'feedback' | 'summary' | 'leaderboard'>('intro');
  const [currentTrial, setCurrentTrial] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [targetAnimal, setTargetAnimal] = useState<AnimalType>('bunny');
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(null);
  const [trialResults, setTrialResults] = useState<TrialResult[]>([]);
  const [countdown, setCountdown] = useState<number>(TRIAL_DURATION_SEC);
  const [mouseActivity, setMouseActivity] = useState<number>(0);
  const [lastFeedback, setLastFeedback] = useState<{ isCorrect: boolean; text: string; points: number } | null>(null);

  // High-performance 60FPS physics ref
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<{
    animId: number;
    startTime: number;
    lastFrameTime: number;
    mouseDeltaX: number;
    mouseDeltaY: number;
    lastMouseX: number;
    lastMouseY: number;
    mouseMovedTotal: number;
    animals: Record<AnimalType, AnimalEntityState>;
    controlledAnimal: AnimalType;
    questionStartTime: number;
  }>({
    animId: 0,
    startTime: 0,
    lastFrameTime: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    mouseMovedTotal: 0,
    controlledAnimal: 'bunny',
    questionStartTime: 0,
    animals: {
      bunny: { type: 'bunny', x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, wanderTimer: 0, noisePhase: 0 },
      fox: { type: 'fox', x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, wanderTimer: 0, noisePhase: 1.2 },
      panda: { type: 'panda', x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, wanderTimer: 0, noisePhase: 2.4 },
      cat: { type: 'cat', x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, wanderTimer: 0, noisePhase: 3.6 },
      bear: { type: 'bear', x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, wanderTimer: 0, noisePhase: 4.8 },
    },
  });

  // Local render coordinates for the 5 animals inside their circles
  const [animalRenderPos, setAnimalRenderPos] = useState<Record<AnimalType, { x: number; y: number }>>({
    bunny: { x: 0, y: 0 },
    fox: { x: 0, y: 0 },
    panda: { x: 0, y: 0 },
    cat: { x: 0, y: 0 },
    bear: { x: 0, y: 0 },
  });

  // Initialize a trial
  const startTrial = useCallback((trialNum: number) => {
    // Pick a random controlled animal for this trial
    const randomAnimal = ANIMAL_LIST[Math.floor(Math.random() * ANIMAL_LIST.length)];
    setTargetAnimal(randomAnimal);
    setSelectedAnimal(null);
    setCountdown(TRIAL_DURATION_SEC);
    setMouseActivity(0);

    const eng = engineRef.current;
    eng.controlledAnimal = randomAnimal;
    eng.startTime = performance.now();
    eng.lastFrameTime = performance.now();
    eng.mouseDeltaX = 0;
    eng.mouseDeltaY = 0;
    eng.mouseMovedTotal = 0;

    // Reset initial animal positions inside circles with random velocities & wander
    ANIMAL_LIST.forEach((type, idx) => {
      eng.animals[type] = {
        type,
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        targetX: (Math.random() - 0.5) * 44,
        targetY: (Math.random() - 0.5) * 44,
        wanderTimer: Math.random() * 0.4,
        noisePhase: idx * 1.3 + Math.random(),
      };
    });

    setGameState('trial_running');
    sounds.playPsychicWave();
  }, []);

  // Start whole new game
  const handleStartGame = () => {
    sounds.playGameStart();
    setScore(0);
    setCurrentTrial(1);
    setTrialResults([]);
    startTrial(1);
  };

  // Mouse / Touch motion tracking handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'trial_running') return;
    const eng = engineRef.current;
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (eng.lastMouseX !== 0 || eng.lastMouseY !== 0) {
      const dx = currentX - eng.lastMouseX;
      const dy = currentY - eng.lastMouseY;
      eng.mouseDeltaX += dx;
      eng.mouseDeltaY += dy;
      eng.mouseMovedTotal += Math.hypot(dx, dy);
    }
    eng.lastMouseX = currentX;
    eng.lastMouseY = currentY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'trial_running' || !e.touches[0]) return;
    const eng = engineRef.current;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    if (eng.lastMouseX !== 0 || eng.lastMouseY !== 0) {
      const dx = currentX - eng.lastMouseX;
      const dy = currentY - eng.lastMouseY;
      eng.mouseDeltaX += dx * 1.5;
      eng.mouseDeltaY += dy * 1.5;
      eng.mouseMovedTotal += Math.hypot(dx, dy);
    }
    eng.lastMouseX = currentX;
    eng.lastMouseY = currentY;
  };

  // 60FPS Game Loop for Fast Animal Trajectory Physics, Stochastic Noise & 3s Timer
  useEffect(() => {
    if (gameState !== 'trial_running') return;

    const eng = engineRef.current;
    const MAX_CIRCLE_RADIUS = 46; // Radius constraint inside 140px diameter circle

    const gameLoop = (time: number) => {
      const dt = Math.min(32, time - eng.lastFrameTime) / 1000;
      eng.lastFrameTime = time;

      const elapsedSec = (time - eng.startTime) / 1000;
      const remaining = Math.max(0, TRIAL_DURATION_SEC - elapsedSec);
      setCountdown(Math.round(remaining * 10) / 10);
      setMouseActivity(Math.min(100, Math.round(eng.mouseMovedTotal * 0.15)));

      // If 3.0 seconds have elapsed, transition to Question Phase
      if (remaining <= 0) {
        cancelAnimationFrame(eng.animId);
        sounds.playZenChime(660);
        eng.questionStartTime = performance.now();
        setGameState('question');
        return;
      }

      // Physics update for all 5 animals
      const newPos: Record<AnimalType, { x: number; y: number }> = {
        bunny: { x: 0, y: 0 },
        fox: { x: 0, y: 0 },
        panda: { x: 0, y: 0 },
        cat: { x: 0, y: 0 },
        bear: { x: 0, y: 0 },
      };

      // Calculate mouse displacement magnitude
      const mouseMag = Math.hypot(eng.mouseDeltaX, eng.mouseDeltaY);

      ANIMAL_LIST.forEach((type, idx) => {
        const animal = eng.animals[type];
        const isControlled = type === eng.controlledAnimal;

        // Advance autonomous wander timer (faster target transitions: every 0.25s - 0.6s)
        animal.wanderTimer += dt;
        animal.noisePhase += dt * 5.0;

        if (animal.wanderTimer > 0.25 + Math.random() * 0.35) {
          animal.wanderTimer = 0;
          const angle = Math.random() * Math.PI * 2;
          const dist = (0.2 + Math.random() * 0.75) * MAX_CIRCLE_RADIUS;
          animal.targetX = Math.cos(angle) * dist;
          animal.targetY = Math.sin(angle) * dist;
        }

        // 1. Core autonomous impulse towards wander target (Faster and snappier)
        const dx = animal.targetX - animal.x;
        const dy = animal.targetY - animal.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1.5) {
          animal.vx += (dx / dist) * 140 * dt;
          animal.vy += (dy / dist) * 140 * dt;
        }

        // 2. Continuous high-frequency stochastic noise & jiggle
        const noiseJitterX = (Math.random() - 0.5) * 220 * dt;
        const noiseJitterY = (Math.random() - 0.5) * 220 * dt;
        const waveNoiseX = Math.sin(animal.noisePhase * 2.2 + idx) * 18 * dt;
        const waveNoiseY = Math.cos(animal.noisePhase * 2.8 + idx) * 18 * dt;

        animal.vx += noiseJitterX + waveNoiseX;
        animal.vy += noiseJitterY + waveNoiseY;

        if (isControlled) {
          // ----------------------------------------------------
          // CONTROLLED ANIMAL:
          // - When mouse is idle: Keeps moving randomly with noise just like distractors.
          // - When mouse moves: Directional trajectory bias injected with noise & partial decoupling.
          // ----------------------------------------------------
          if (mouseMag > 0.2) {
            // Apply mouse force with subtle angular noise perturbation (+/- 25 degrees)
            const angleJitter = (Math.random() - 0.5) * 0.9;
            const cosJ = Math.cos(angleJitter);
            const sinJ = Math.sin(angleJitter);

            const noisyMouseForceX = (eng.mouseDeltaX * cosJ - eng.mouseDeltaY * sinJ) * 2.4;
            const noisyMouseForceY = (eng.mouseDeltaX * sinJ + eng.mouseDeltaY * cosJ) * 2.4;

            // Blend mouse bias with the ongoing autonomous wander
            animal.vx = animal.vx * 0.72 + noisyMouseForceX * 0.42;
            animal.vy = animal.vy * 0.72 + noisyMouseForceY * 0.42;
          } else {
            // Idle mouse: natural fast organic damping and autonomous wander
            animal.vx *= 0.85;
            animal.vy *= 0.85;
          }
        } else {
          // ----------------------------------------------------
          // DISTRACTOR ANIMALS: Autonomous organic fast wander + damping
          // ----------------------------------------------------
          animal.vx *= 0.85;
          animal.vy *= 0.85;
        }

        // Integrate positions
        animal.x += animal.vx * dt * 4.2;
        animal.y += animal.vy * dt * 4.2;

        // Hard boundary collision / bounce damping within circular boundary
        const distFromCenter = Math.hypot(animal.x, animal.y);
        if (distFromCenter > MAX_CIRCLE_RADIUS) {
          const angle = Math.atan2(animal.y, animal.x);
          animal.x = Math.cos(angle) * MAX_CIRCLE_RADIUS;
          animal.y = Math.sin(angle) * MAX_CIRCLE_RADIUS;
          animal.vx *= -0.5;
          animal.vy *= -0.5;
        }

        newPos[type] = { x: Math.round(animal.x), y: Math.round(animal.y) };
      });

      // Decay mouse delta buffer smoothly for next frame
      eng.mouseDeltaX *= 0.15;
      eng.mouseDeltaY *= 0.15;

      setAnimalRenderPos(newPos);
      eng.animId = requestAnimationFrame(gameLoop);
    };

    eng.animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(eng.animId);
    };
  }, [gameState]);

  // Handle Player Guess Choice
  const handleSelectAnimal = (choice: AnimalType) => {
    if (gameState !== 'question') return;

    setSelectedAnimal(choice);
    const isCorrect = choice === targetAnimal;
    const rt = Math.round(performance.now() - engineRef.current.questionStartTime);

    // Calculate score: +300 for correct, -100 penalty for wrong
    const points = isCorrect ? POINTS_CORRECT : -POINTS_INCORRECT_PENALTY;
    const newScore = Math.max(0, score + points);
    setScore(newScore);

    const result: TrialResult = {
      trialNumber: currentTrial,
      targetAnimal,
      selectedAnimal: choice,
      isCorrect,
      pointsEarned: points,
      responseTimeMs: rt,
    };

    const updatedResults = [...trialResults, result];
    setTrialResults(updatedResults);

    if (isCorrect) {
      sounds.playLevelUp();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setLastFeedback({
        isCorrect: true,
        text: `✨ NEURAL LINK CONFIRMED! You synced with ${ANIMAL_CONFIGS[targetAnimal].name}!`,
        points: POINTS_CORRECT,
      });
    } else {
      sounds.playFalseAlarmBuzz();
      setLastFeedback({
        isCorrect: false,
        text: `❌ LINK MISMATCH! You controlled ${ANIMAL_CONFIGS[targetAnimal].name}, not ${ANIMAL_CONFIGS[choice].name}.`,
        points: -POINTS_INCORRECT_PENALTY,
      });
    }

    setGameState('feedback');
  };

  // Next Trial or Final Summary
  const handleProceedNext = () => {
    if (currentTrial >= TOTAL_TRIALS) {
      // Complete Game
      setGameState('summary');
      sounds.playLevelUp();
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });

      const finalScore = score;
      const earnedXp = Math.round(finalScore * 0.8);
      const earnedCoins = Math.max(10, Math.round(finalScore * 0.2));
      onUpdateScore('animal-mind-control', finalScore, earnedXp, earnedCoins);

      const record = recordGameScore(
        'animal-mind-control',
        profile,
        finalScore,
        `${correctTrialsCount}/${TOTAL_TRIALS} Synced • Telepathy`
      );
      setPlayerRank(record.rank);
    } else {
      const nextTrialNum = currentTrial + 1;
      setCurrentTrial(nextTrialNum);
      startTrial(nextTrialNum);
    }
  };

  // Telepathic Rank determination based on final score & accuracy across 8 trials
  const getTelepathicRank = (finalScore: number, correctCount: number) => {
    if (correctCount >= 8) return { rank: 'S-RANK TELEPATHIC SAGE', badge: '🧠 GRAND NEURAL MASTER', color: 'text-amber-300', border: 'border-amber-400/50' };
    if (correctCount >= 6) return { rank: 'A-RANK MIND CONTROLLER', badge: '🌟 MASTER PSYCHIC', color: 'text-cyan-300', border: 'border-cyan-400/50' };
    if (correctCount >= 4) return { rank: 'B-RANK ANIMAL WHISPERER', badge: '⚡ SKILLED TELEPATH', color: 'text-emerald-300', border: 'border-emerald-400/50' };
    if (correctCount >= 2) return { rank: 'C-RANK APPRENTICE LINK', badge: '🌱 DEVELOPING SENSE', color: 'text-yellow-300', border: 'border-yellow-400/50' };
    return { rank: 'D-RANK NOVICE RECEIVER', badge: '🍃 KEEP PRACTICING!', color: 'text-rose-300', border: 'border-rose-400/50' };
  };

  const correctTrialsCount = trialResults.filter((r) => r.isCorrect).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 text-white select-none relative">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHub();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-cyber font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>EXIT TO HUB</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-300">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-cyber font-black text-base sm:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-pink-300 to-amber-300">
            ANIMAL MIND CONTROL
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="animal-mind-control-leaderboard-btn"
            onClick={() => {
              sounds.playClick();
              setGameState('leaderboard');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            title="View Global Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">LEADERBOARD</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono-tag text-white/40 block">PLAYER / TELEPATH</span>
            <span className="text-sm font-cyber font-black text-violet-300">{profile.name}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
            {profile.avatar}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. INTRO SCREEN */}
      {/* ==================================================== */}
      {gameState === 'intro' && (
        <div className="relative w-full max-w-4xl mx-auto min-h-[560px] rounded-3xl overflow-hidden border border-white/15 p-6 sm:p-10 shadow-2xl flex flex-col justify-between">
          <MangaForestBackground intensity={1.2} showSunbeams={true} />

          <div className="relative z-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 font-mono-tag text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Radio className="w-3.5 h-3.5 animate-pulse text-pink-400" />
              <span>NEURAL LINK TELEPATHY EXPERIMENT</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black uppercase italic font-cyber tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              Animal Mind Control
            </h1>

            <p className="text-base sm:text-lg text-white/95 max-w-2xl mx-auto font-body leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Connect your neural link to the mystical forest animals! In each 3-second trial, <strong className="text-amber-300 font-bold">shake and move your mouse</strong>. Only <span className="text-pink-300 font-bold">ONE</span> animal will mirror your hand trajectory with subtle noise. Spot which one you're controlling!
            </p>

            {/* 3 Step Instruction Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-left">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md space-y-1.5 shadow-lg">
                <div className="flex items-center gap-2 text-pink-400 font-cyber font-black text-xs uppercase">
                  <Activity className="w-4 h-4" />
                  <span>1. Move Your Mouse</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-body">
                  For 3 seconds, wiggle and move your cursor in different directions across the arena.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md space-y-1.5 shadow-lg">
                <div className="flex items-center gap-2 text-cyan-400 font-cyber font-black text-xs uppercase">
                  <Eye className="w-4 h-4" />
                  <span>2. Spot The Link</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-body">
                  All animals dart and wander actively. Only 1 animal will follow your mouse trajectory!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md space-y-1.5 shadow-lg">
                <div className="flex items-center gap-2 text-amber-400 font-cyber font-black text-xs uppercase">
                  <Brain className="w-4 h-4" />
                  <span>3. Pick & Score</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-body">
                  Guess the controlled animal over 8 trials! (+300 pts for correct, -100 for wrong).
                </p>
              </div>
            </div>

            {/* 5 Animals Preview Row */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {ANIMAL_LIST.map((type) => {
                  const cfg = ANIMAL_CONFIGS[type];
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm"
                    >
                      <div className="w-8 h-8">
                        <ChibiAvatar type={type} size={32} animate={false} />
                      </div>
                      <span className={`text-xs font-cyber font-bold ${cfg.textColor}`}>
                        {cfg.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Start CTA Button */}
          <div className="relative z-10 pt-6 text-center">
            <button
              id="start-telepathy-game-btn"
              onClick={handleStartGame}
              className="px-10 py-5 rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-400 hover:from-violet-400 hover:to-amber-300 text-black font-black text-base sm:text-lg font-cyber uppercase tracking-tight shadow-2xl shadow-violet-500/50 flex items-center justify-center gap-3 mx-auto cursor-pointer transition-all transform active:scale-95 hover:scale-105"
            >
              <Zap className="w-6 h-6 text-black fill-black" />
              <span>START NEURAL SYNC (8 TRIALS)</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. TRIAL RUNNING: 3-SECOND MOUSE OBSERVATION ARENA */}
      {/* ==================================================== */}
      {gameState === 'trial_running' && (
        <div className="space-y-4">
          {/* Top Trial Status & Live Score Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">TRIAL PROGRESS</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-violet-400">
                  {currentTrial} / {TOTAL_TRIALS}
                </span>
              </div>
              <Compass className="w-6 h-6 text-violet-400/60" />
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">TELEPATHIC SCORE</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-amber-400">
                  {score.toLocaleString()}
                </span>
              </div>
              <Sparkles className="w-6 h-6 text-amber-400/60" />
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">TIME REMAINING</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-pink-400">
                  {countdown.toFixed(1)}s
                </span>
              </div>
              <Radio className="w-6 h-6 text-pink-400/60 animate-pulse" />
            </div>
          </div>

          {/* Interactive Forest Arena Container */}
          <div
            ref={arenaRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full h-[460px] sm:h-[520px] rounded-3xl overflow-hidden border-2 border-violet-500/40 shadow-2xl cursor-crosshair flex flex-col justify-between p-4 sm:p-6 select-none bg-[#0a1f18]"
          >
            {/* Manga Forest Artwork Canvas Background */}
            <MangaForestBackground intensity={1.3} showSunbeams={true} />

            {/* Top Interactive Prompt Banner */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-white/20 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-pink-400 animate-ping" />
                <span className="text-xs sm:text-sm font-cyber font-black uppercase text-pink-300 tracking-wide">
                  🧠 MOVE & SHAKE YOUR MOUSE TO FEEL THE NEURAL LINK!
                </span>
              </div>

              {/* Progress Countdown Bar */}
              <div className="flex items-center gap-3 w-full sm:w-64">
                <span className="text-xs font-mono-tag text-white/70 font-bold">
                  {countdown.toFixed(1)}s
                </span>
                <div className="flex-1 h-3 bg-black/80 rounded-full overflow-hidden border border-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 via-violet-400 to-cyan-400 transition-all duration-100 rounded-full"
                    style={{ width: `${(countdown / TRIAL_DURATION_SEC) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 5 Distinct Colored Circles with Cute Chibi Animals */}
            <div className="relative z-10 flex-1 flex items-center justify-center">
              {/* Responsive 5 Circle Layout: Arc / Hexagon Formation */}
              <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 justify-items-center items-center py-2">
                {ANIMAL_LIST.map((type, idx) => {
                  const cfg = ANIMAL_CONFIGS[type];
                  const pos = animalRenderPos[type] || { x: 0, y: 0 };

                  return (
                    <div
                      key={type}
                      className="flex flex-col items-center gap-2 group"
                    >
                      {/* Colored Outer Telepathy Circle */}
                      <div
                        className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${cfg.circleColor} border-2 sm:border-3 ${cfg.borderColor} shadow-2xl flex items-center justify-center overflow-hidden backdrop-blur-sm transition-all duration-150`}
                        style={{
                          boxShadow: `0 0 25px ${cfg.glowColor}`,
                        }}
                      >
                        {/* Circle Inner Radar Crosshairs / Manga Runes */}
                        <div className="absolute inset-2 rounded-full border border-white/15 pointer-events-none" />
                        <div className="absolute w-full h-[1px] bg-white/10 pointer-events-none" />
                        <div className="absolute h-full w-[1px] bg-white/10 pointer-events-none" />

                        {/* Moving Chibi Animal Avatar (Translating within circle) */}
                        <div
                          className="relative pointer-events-none transition-transform duration-75 ease-out"
                          style={{
                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                          }}
                        >
                          <ChibiAvatar type={type} size={64} animate />
                        </div>
                      </div>

                      {/* Animal Badge Tag */}
                      <div
                        className={`px-3 py-1 rounded-full ${cfg.badgeBg} border text-[11px] font-cyber font-black uppercase tracking-wider backdrop-blur-md shadow-md`}
                      >
                        {cfg.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Mouse Activity Meter */}
            <div className="relative z-10 flex items-center justify-between text-xs font-mono-tag text-white/70 px-4 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Activity className="w-3.5 h-3.5" />
                NEURAL LINK SENSORS ACTIVE
              </span>
              <span>MOUSE WIGGLE DETECTED: {mouseActivity}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. QUESTION & GUESSING SCREEN: "WHICH ANIMAL DID YOU CONTROL?" */}
      {/* ==================================================== */}
      {gameState === 'question' && (
        <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/15 p-6 sm:p-8 shadow-2xl bg-[#0f172a] space-y-6">
          {/* Header Question */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-mono-tag text-xs font-bold uppercase">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>TRIAL {currentTrial} OF {TOTAL_TRIALS}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black uppercase italic font-cyber tracking-tight text-white">
              Which Animal Did You Control?
            </h2>

            <p className="text-sm text-white/80 font-body max-w-lg mx-auto">
              Based on the 3-second movement trajectory of your mouse, select the spirit animal that was linked to your mind!
            </p>
          </div>

          {/* 5 Interactive Animal Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 pt-2">
            {ANIMAL_LIST.map((type) => {
              const cfg = ANIMAL_CONFIGS[type];
              return (
                <button
                  key={type}
                  id={`select-animal-${type}-btn`}
                  onClick={() => {
                    sounds.playClick();
                    handleSelectAnimal(type);
                  }}
                  className={`group p-4 rounded-2xl bg-black/40 hover:bg-black/70 border-2 ${cfg.borderColor} hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col items-center justify-between text-center gap-3 shadow-xl hover:shadow-2xl`}
                  style={{
                    boxShadow: `0 0 15px ${cfg.glowColor.replace('0.6', '0.25')}`,
                  }}
                >
                  {/* Chibi Animal Avatar Icon */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${cfg.circleColor} border-2 ${cfg.borderColor} flex items-center justify-center group-hover:rotate-6 transition-transform`}
                  >
                    <ChibiAvatar type={type} size={54} animate={false} />
                  </div>

                  <div className="space-y-0.5">
                    <span className={`text-sm font-cyber font-black block uppercase ${cfg.textColor}`}>
                      {cfg.name}
                    </span>
                    <span className="text-[10px] font-mono-tag text-white/50 block">
                      {cfg.species}
                    </span>
                  </div>

                  <div className="w-full py-1.5 rounded-xl bg-white/10 group-hover:bg-white text-[11px] font-cyber font-black text-white group-hover:text-black uppercase tracking-wider transition-colors">
                    SELECT
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Info Bar */}
          <div className="flex items-center justify-between text-xs font-mono-tag text-white/50 pt-2 border-t border-white/10">
            <span>CORRECT: +{POINTS_CORRECT} PTS</span>
            <span>WRONG PENALTY: -{POINTS_INCORRECT_PENALTY} PTS</span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. FEEDBACK SCREEN: REVEAL CONTROLLED ANIMAL */}
      {/* ==================================================== */}
      {gameState === 'feedback' && lastFeedback && (
        <div className="relative w-full max-w-3xl mx-auto rounded-3xl overflow-hidden border border-white/15 p-6 sm:p-8 shadow-2xl bg-[#0f172a] space-y-6 text-center">
          {/* Result Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-black/60 border border-white/20 flex items-center justify-center shadow-xl">
            {lastFeedback.isCorrect ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            ) : (
              <XCircle className="w-12 h-12 text-rose-400" />
            )}
          </div>

          <div className="space-y-2">
            <h2
              className={`text-2xl sm:text-3xl font-black uppercase italic font-cyber tracking-tight ${
                lastFeedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {lastFeedback.isCorrect ? 'NEURAL SYNC SUCCESS!' : 'NEURAL LINK MISMATCH!'}
            </h2>
            <p className="text-sm sm:text-base text-white/90 font-body max-w-md mx-auto">
              {lastFeedback.text}
            </p>
          </div>

          {/* Actual Controlled Animal Spotlight */}
          <div className="p-6 rounded-3xl bg-black/40 border border-white/15 max-w-md mx-auto flex items-center justify-center gap-5">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${ANIMAL_CONFIGS[targetAnimal].circleColor} border-3 ${ANIMAL_CONFIGS[targetAnimal].borderColor} flex items-center justify-center shadow-2xl`}
            >
              <ChibiAvatar type={targetAnimal} size={68} isControlled={true} />
            </div>
            <div className="text-left space-y-1">
              <span className="text-[10px] font-mono-tag text-white/50 block uppercase">
                TRUE CONTROLLED SPIRIT
              </span>
              <span className={`text-lg font-cyber font-black uppercase ${ANIMAL_CONFIGS[targetAnimal].textColor}`}>
                {ANIMAL_CONFIGS[targetAnimal].name}
              </span>
              <span className="text-xs font-mono-tag text-white/70 block">
                {ANIMAL_CONFIGS[targetAnimal].species}
              </span>
              <div
                className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-mono-tag font-black ${
                  lastFeedback.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {lastFeedback.points > 0 ? `+${lastFeedback.points} PTS` : `${lastFeedback.points} PTS`}
              </div>
            </div>
          </div>

          {/* Continue CTA Button */}
          <div className="pt-2">
            <button
              id="continue-trial-btn"
              onClick={() => {
                sounds.playClick();
                handleProceedNext();
              }}
              className="px-8 py-4 rounded-full bg-white hover:bg-violet-400 text-black font-black text-sm sm:text-base font-cyber uppercase tracking-wider shadow-2xl cursor-pointer transition-all transform active:scale-95 hover:scale-105"
            >
              {currentTrial >= TOTAL_TRIALS ? 'VIEW FINAL REPORT' : `PROCEED TO TRIAL ${currentTrial + 1} / ${TOTAL_TRIALS}`}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. SUMMARY SCREEN: FINAL SCORE & TRIAL RESULTS */}
      {/* ==================================================== */}
      {gameState === 'summary' && (
        <div className="relative w-full max-w-3xl mx-auto rounded-3xl overflow-hidden border border-white/15 p-6 sm:p-10 shadow-2xl bg-[#0f172a] space-y-6 text-center">
          {/* Avatar Celebration Icon */}
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400 p-[2px] shadow-2xl shadow-violet-500/30">
            <div className="w-full h-full bg-[#020617] rounded-[22px] flex items-center justify-center text-3xl">
              <Award className="w-12 h-12 text-amber-400" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono-tag text-violet-300 font-bold uppercase tracking-wider mb-2">
              {getTelepathicRank(score, correctTrialsCount).badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase italic font-cyber tracking-tight text-white">
              EXPERIMENT COMPLETED!
            </h2>
            <p className="text-sm text-white/60 font-body">
              All 8 neural link trials have finished!
            </p>
          </div>

          {/* FINAL HERO SCORE CARD */}
          <div
            className={`p-8 rounded-3xl bg-gradient-to-b from-black/60 to-black/30 border-2 ${
              getTelepathicRank(score, correctTrialsCount).border
            } shadow-2xl space-y-2 relative overflow-hidden`}
          >
            <span className="text-xs sm:text-sm font-mono-tag text-white/60 uppercase font-black tracking-widest block">
              FINAL TELEPATHIC SCORE
            </span>
            <div
              className={`text-5xl sm:text-7xl font-black font-cyber tracking-tighter ${
                getTelepathicRank(score, correctTrialsCount).color
              } drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]`}
            >
              {score.toLocaleString()}
            </div>
            <p className="text-xs font-mono-tag text-white/50 pt-1 uppercase tracking-wider">
              {getTelepathicRank(score, correctTrialsCount).rank}
            </p>
          </div>

          {/* 8 Trials Breakdown Matrix */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <span className="text-xs font-mono-tag text-white/70 uppercase tracking-widest block">
              // 8 TRIALS TELEPATHIC ACCURACY BREAKDOWN
            </span>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {trialResults.map((res, i) => (
                <div
                  key={i}
                  className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 sm:gap-1.5 ${
                    res.isCorrect
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] font-mono-tag uppercase">T{res.trialNumber}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8">
                    <ChibiAvatar type={res.targetAnimal} size={28} animate={false} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-cyber font-black">
                    {res.isCorrect ? '+300' : '-100'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono-tag text-white/60 pt-1">
              <span>CORRECT GUESSES: {correctTrialsCount} / {TOTAL_TRIALS}</span>
              <span>SYNC RATE: {Math.round((correctTrialsCount / TOTAL_TRIALS) * 100)}%</span>
            </div>
          </div>

          {/* Brain Power Unlocked Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border-2 border-violet-500/40 text-left space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/40 font-cyber">
                🧠 BRAIN POWER UNLOCKED
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-amber-300 uppercase font-cyber tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Sense of Agency (Action Ownership)</span>
            </h3>
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                <strong className="text-pink-300">What you just did:</strong> You figured out which animal was listening to your moves! When your brain plans a movement, it predicts what will happen next. Matching your moves to the animal proved your brain&apos;s superpower: <strong className="text-amber-300">Sense of Agency</strong>—knowing that you are the one in the driver&apos;s seat of your own actions.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              id="view-leaderboard-mind-btn"
              onClick={() => {
                sounds.playClick();
                setGameState('leaderboard');
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-slate-950 font-black text-sm sm:text-base font-cyber uppercase tracking-tighter shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
            >
              <Trophy className="w-5 h-5 fill-slate-950" />
              <span>
                {playerRank ? `VIEW LEADERBOARD (RANK #${playerRank})` : 'VIEW LEADERBOARD & RANK'}
              </span>
            </button>

            <button
              id="play-again-mind-control-btn"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-violet-400 text-black font-black text-sm sm:text-base font-cyber uppercase tracking-tighter shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onBackToHub();
              }}
              className="w-full sm:w-auto px-6 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-cyber font-black text-sm uppercase tracking-wider cursor-pointer transition-all"
            >
              RETURN TO HUB
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. LEADERBOARD SCREEN: DEDICATED RANKINGS VIEW */}
      {/* ==================================================== */}
      {gameState === 'leaderboard' && (
        <div className="bg-[#0f172a] rounded-3xl border border-white/15 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="animal-mind-control"
            profile={profile}
            onClose={() => setGameState('summary')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'animal-mind-control' && onSelectGame) {
                onSelectGame(targetGameId);
              } else {
                handleStartGame();
              }
            }}
            isEmbeddedInGame={true}
          />
        </div>
      )}
    </div>
  );
};
