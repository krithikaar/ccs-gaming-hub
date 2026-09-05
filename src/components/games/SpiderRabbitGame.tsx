import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import { SpiderRabbitAvatar } from '../SpiderRabbitAvatar';
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Download,
  Activity,
  ShieldAlert,
  Target,
  Brain,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Compass,
  Zap,
  Trophy,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// TYPES & GAME MODELS
// ==========================================

export type PerturbationMagnitude = 'micro' | 'medium' | 'macro';

export interface PerturbationEvent {
  id: number;
  startTime: number; // ms since trial start
  duration: number; // ms (typically 2000ms)
  magnitude: PerturbationMagnitude;
  angleDeg: number;
  offsetPx: number;
  resolved: boolean;
  result?: 'HIT' | 'MISS';
  reactionTimeMs?: number;
}

export interface FalseAlarmEvent {
  id: number;
  timestamp: number;
  distanceFromMidline: number;
}

export interface CollisionEvent {
  id: number;
  timestamp: number;
  type: 'bush_boundary';
  x: number;
  y: number;
}

export interface TrackingSample {
  t: number; // ms
  avatarX: number;
  avatarY: number;
  cursorX: number;
  cursorY: number;
  midlineX: number;
  errorPx: number;
  isPerturbed: boolean;
}

export interface GameSummary {
  finalScore: number;
  distanceMeters: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  timePlayedSec: number;
}

interface SpiderRabbitGameProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'spider-rabbit', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

// Fixed dimensions for the experimental canvas
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ROAD_WIDTH = 145;
const RABBIT_RADIUS = 22;
const TRIAL_DURATION_SEC = 120; // 2 minutes continuous paradigm
const PERTURBATION_WINDOW_MS = 2000; // 2.0 second perturbation evaluation window

export const SpiderRabbitGame: React.FC<SpiderRabbitGameProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // High-level App State
  const [gameState, setGameState] = useState<'intro' | 'running' | 'summary' | 'leaderboard'>('intro');
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(TRIAL_DURATION_SEC);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);
  const [activePerturbation, setActivePerturbation] = useState<PerturbationEvent | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ text: string; color: string; time: number } | null>(null);
  const [isCarrotPressed, setIsCarrotPressed] = useState<boolean>(false);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);

  // ----------------------------------------------------
  // Ref-based State for High-Performance 60FPS Game Loop
  // ----------------------------------------------------
  const engineRef = useRef({
    isRunning: false,
    startTime: 0,
    elapsedMs: 0,
    lastFrameTime: 0,
    distancePx: 0,
    score: 0,

    // Cursor tracking
    cursorX: 200,
    cursorY: CANVAS_HEIGHT / 2,
    avatarX: 200,
    avatarY: CANVAS_HEIGHT / 2,
    avatarVx: 0,
    avatarVy: 0,

    // Perturbation Engine
    currentPerturbation: null as PerturbationEvent | null,
    nextPerturbationTimeMs: 4000,
    perturbationOffsetCurrent: { x: 0, y: 0 },
    perturbationOffsetTarget: { x: 0, y: 0 },

    // Procedural Horizontal Road Generation
    roadSegments: [] as {
      x: number;
      centerY: number;
      width: number;
    }[],
    roadWindingPhase: 0,

    // Garden Scenery Cache, Fluttering Butterflies, Bees & Anime Petals
    gardenProps: [] as {
      x: number;
      y: number;
      type:
        | 'tree_apple'
        | 'tree_blossom'
        | 'tree_oak'
        | 'tree_willow'
        | 'fountain'
        | 'bench'
        | 'bush_hydrangea'
        | 'bush_rose'
        | 'bush_lavender'
        | 'flowerbed_sunflowers'
        | 'flowerbed_cosmos'
        | 'flowers_tulip'
        | 'flowers_daisy'
        | 'stone_lantern'
        | 'birdbath'
        | 'mushroom'
        | 'fence';
      scale: number;
    }[],
    butterflies: [] as {
      x: number;
      y: number;
      baseY: number;
      speed: number;
      color: string;
      wingAngle: number;
    }[],
    bees: [] as {
      x: number;
      y: number;
      baseY: number;
      speed: number;
      wingAngle: number;
      bobPhase: number;
    }[],
    driftingPetals: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      rotSpeed: number;
      size: number;
      color: string;
    }[],

    // Psychometric & Event Logging
    perturbations: [] as PerturbationEvent[],
    falseAlarms: [] as FalseAlarmEvent[],
    collisions: [] as CollisionEvent[],
    trackingSamples: [] as TrackingSample[],
    sampleTimerMs: 0,
    cleanIntervalsWithoutFA: 0,

    // Visual FX & Particle Systems
    vignetteFlash: 0, // 0 to 1
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number }[],
    floatingTexts: [] as { x: number; y: number; text: string; color: string; life: number }[],
    webZips: [] as { x1: number; y1: number; x2: number; y2: number; life: number }[],

    animFrameId: 0,
  });

  // ==========================================
  // CARROT BUTTON HANDLER (HIT vs FA)
  // ==========================================
  const handleCarrotClick = useCallback(() => {
    if (gameState !== 'running') return;
    const eng = engineRef.current;
    const now = eng.elapsedMs;

    setIsCarrotPressed(true);
    setTimeout(() => setIsCarrotPressed(false), 200);

    const activePert = eng.currentPerturbation;

    if (activePert && !activePert.resolved) {
      // ----------------------------------------
      // 1. HIT: Correct carrot press during distraction
      // ----------------------------------------
      const rt = now - activePert.startTime;
      activePert.resolved = true;
      activePert.result = 'HIT';
      activePert.reactionTimeMs = rt;

      // Immediately snap rabbit back to true cursor coordinates
      eng.perturbationOffsetTarget = { x: 0, y: 0 };
      eng.perturbationOffsetCurrent = { x: 0, y: 0 };
      eng.avatarX = eng.cursorX;
      eng.avatarY = eng.cursorY;

      // Audio & Visual feedback
      sounds.playHitChime();
      sounds.playWebThwip();

      const baseScore = activePert.magnitude === 'micro' ? 300 : activePert.magnitude === 'medium' ? 200 : 150;
      const speedBonus = Math.max(0, Math.round((2000 - rt) / 10));
      const gained = baseScore + speedBonus;
      eng.score += gained;
      setLiveScore(Math.round(eng.score));

      // Spawn Web Snap Effect
      eng.webZips.push({
        x1: eng.cursorX,
        y1: eng.cursorY,
        x2: eng.cursorX + activePert.offsetPx,
        y2: eng.cursorY - 20,
        life: 25,
      });

      // Spawn Floating Text & Particles
      eng.floatingTexts.push({
        x: eng.avatarX,
        y: eng.avatarY - 30,
        text: `HIT! +${gained} [${Math.round(rt)}ms]`,
        color: '#22c55e',
        life: 45,
      });

      for (let i = 0; i < 14; i++) {
        eng.particles.push({
          x: eng.avatarX,
          y: eng.avatarY,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: '#38bdf8',
          life: 30,
          maxLife: 30,
        });
      }

      setFeedbackBanner({
        text: `🎯 HIT! Distraction Corrected (+${gained})`,
        color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50',
        time: Date.now(),
      });

      eng.currentPerturbation = null;
      setActivePerturbation(null);
    } else {
      // ----------------------------------------
      // 2. FALSE ALARM: Carrot clicked with no distraction active
      // ----------------------------------------
      sounds.playFalseAlarmBuzz();
      const midlineY = getMidlineAtX(eng.avatarX, eng.roadSegments);
      const distFromMid = Math.abs(eng.avatarY - midlineY);

      eng.falseAlarms.push({
        id: eng.falseAlarms.length + 1,
        timestamp: now,
        distanceFromMidline: distFromMid,
      });

      eng.score = Math.max(0, eng.score - 50);
      setLiveScore(Math.round(eng.score));

      eng.floatingTexts.push({
        x: eng.avatarX,
        y: eng.avatarY - 30,
        text: 'FALSE ALARM (-50)',
        color: '#f59e0b',
        life: 45,
      });

      setFeedbackBanner({
        text: '⚠️ FALSE ALARM: No distraction was active (-50)',
        color: 'text-amber-400 bg-amber-950/80 border-amber-500/50',
        time: Date.now(),
      });
    }
  }, [gameState]);

  // Helper to query road midline at a specific horizontal X coordinate
  const getMidlineAtX = (x: number, segments: typeof engineRef.current.roadSegments): number => {
    if (!segments.length) return CANVAS_HEIGHT / 2;
    let closest = segments[0];
    let minDiff = Math.abs(segments[0].x - x);
    for (let i = 1; i < segments.length; i++) {
      const diff = Math.abs(segments[i].x - x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = segments[i];
      }
    }
    return closest.centerY;
  };

  // Keyboard shortcut: Spacebar triggers carrot button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'running') {
        e.preventDefault();
        handleCarrotClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleCarrotClick]);

  // ==========================================
  // START PARADIGM
  // ==========================================
  const startTrial = () => {
    sounds.playGameStart();
    const eng = engineRef.current;

    // Reset Engine State
    eng.isRunning = true;
    eng.startTime = performance.now();
    eng.elapsedMs = 0;
    eng.lastFrameTime = performance.now();
    eng.distancePx = 0;
    eng.score = 0;
    eng.cursorX = 220;
    eng.cursorY = CANVAS_HEIGHT / 2;
    eng.avatarX = 220;
    eng.avatarY = CANVAS_HEIGHT / 2;
    eng.avatarVx = 0;
    eng.avatarVy = 0;

    eng.currentPerturbation = null;
    eng.nextPerturbationTimeMs = 4500 + Math.random() * 3500; // ISI: 4.5s - 8s
    eng.perturbationOffsetCurrent = { x: 0, y: 0 };
    eng.perturbationOffsetTarget = { x: 0, y: 0 };

    eng.perturbations = [];
    eng.falseAlarms = [];
    eng.collisions = [];
    eng.trackingSamples = [];
    eng.sampleTimerMs = 0;
    eng.cleanIntervalsWithoutFA = 0;
    eng.vignetteFlash = 0;
    eng.particles = [];
    eng.floatingTexts = [];
    eng.webZips = [];

    // Prepopulate Horizontal Road Segments (left to right, x from -40 to 860)
    eng.roadSegments = [];
    eng.roadWindingPhase = 0;
    const segmentStep = 8;
    const totalSegments = Math.ceil(CANVAS_WIDTH / segmentStep) + 20;
    for (let i = 0; i < totalSegments; i++) {
      const x = -40 + i * segmentStep;
      const phase = x * 0.0032;
      const centerY = 300 + Math.sin(phase) * 140 + Math.sin(phase * 2.1 + 0.8) * 65 + Math.cos(phase * 0.5) * 45;
      eng.roadSegments.push({
        x,
        centerY: Math.max(90, Math.min(510, centerY)),
        width: ROAD_WIDTH,
      });
    }

    // Prepopulate Manga Garden Scenery Props (Trees, Flowerbeds, Bushes, Benches, Fountains, Fences)
    eng.gardenProps = [];
    const propTypes: Array<
      | 'tree_apple'
      | 'tree_blossom'
      | 'tree_oak'
      | 'tree_willow'
      | 'fountain'
      | 'bench'
      | 'bush_hydrangea'
      | 'bush_rose'
      | 'bush_lavender'
      | 'flowerbed_sunflowers'
      | 'flowerbed_cosmos'
      | 'flowers_tulip'
      | 'flowers_daisy'
      | 'stone_lantern'
      | 'birdbath'
      | 'mushroom'
      | 'fence'
    > = [
      'tree_blossom', 'tree_apple', 'tree_oak', 'tree_willow',
      'fountain', 'bench', 'bench', 'stone_lantern', 'birdbath',
      'bush_hydrangea', 'bush_rose', 'bush_lavender',
      'flowerbed_sunflowers', 'flowerbed_cosmos', 'flowers_tulip', 'flowers_daisy',
      'mushroom', 'fence'
    ];

    // Seed 42 varied scenery items along the horizon and foreground
    for (let i = 0; i < 42; i++) {
      const px = Math.random() * (CANVAS_WIDTH + 600) - 100;
      const isTop = Math.random() > 0.45;
      const py = isTop ? 15 + Math.random() * 115 : 465 + Math.random() * 115;
      const ptype = propTypes[Math.floor(Math.random() * propTypes.length)];
      eng.gardenProps.push({
        x: px,
        y: py,
        type: ptype,
        scale: (ptype === 'fountain' || ptype === 'bench' || ptype.startsWith('tree')) ? 0.95 + Math.random() * 0.25 : 0.8 + Math.random() * 0.4,
      });
    }

    // Cute Fluttering Manga Butterflies
    eng.butterflies = [
      { x: 120, y: 110, baseY: 110, speed: 1.3, color: '#38bdf8', wingAngle: 0 },
      { x: 380, y: 490, baseY: 490, speed: 1.6, color: '#f59e0b', wingAngle: 0.5 },
      { x: 620, y: 130, baseY: 130, speed: 1.1, color: '#ec4899', wingAngle: 1.2 },
      { x: 740, y: 470, baseY: 470, speed: 1.4, color: '#c084fc', wingAngle: 0.8 },
    ];

    // Chubby Manga Honeybees
    eng.bees = [
      { x: 200, y: 140, baseY: 140, speed: 1.5, wingAngle: 0, bobPhase: 0 },
      { x: 500, y: 460, baseY: 460, speed: 1.8, wingAngle: 0.8, bobPhase: 1.5 },
      { x: 700, y: 120, baseY: 120, speed: 1.3, wingAngle: 0.3, bobPhase: 3.1 },
    ];

    // Drifting Sakura / Flower Petals (Signature Manga Aesthetic)
    eng.driftingPetals = [];
    const petalColors = ['#fbcfe8', '#f472b6', '#fda4af', '#fecdd3', '#fef08a'];
    for (let i = 0; i < 18; i++) {
      eng.driftingPetals.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: -(0.6 + Math.random() * 0.9), // Drift gently leftward with the road breeze
        vy: 0.3 + Math.random() * 0.6,    // Drift gently downward
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        size: 3.5 + Math.random() * 3.5,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
      });
    }

    setLiveScore(0);
    setDistanceTraveled(0);
    setTimeRemaining(TRIAL_DURATION_SEC);
    setActivePerturbation(null);
    setFeedbackBanner({
      text: '🚀 Game Started: Stay on the center yellow dashed line! Press CARROT 🥕 when distracted.',
      color: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40',
      time: Date.now(),
    });
    setGameState('running');
  };

  // ==========================================
  // COMPLETE PARADIGM & SHOW SUMMARY
  // ==========================================
  const finishTrial = useCallback(() => {
    const eng = engineRef.current;
    eng.isRunning = false;
    cancelAnimationFrame(eng.animFrameId);

    const finalScore = Math.max(0, Math.round(eng.score));
    const distanceMeters = Math.floor(eng.distancePx / 60);
    const hits = eng.perturbations.filter((p) => p.result === 'HIT').length;
    const misses = eng.perturbations.filter((p) => p.result === 'MISS').length;
    const faCount = eng.falseAlarms.length;
    const timePlayedSec = Math.min(TRIAL_DURATION_SEC, Math.round(eng.elapsedMs / 1000));

    const summary: GameSummary = {
      finalScore,
      distanceMeters,
      hits,
      misses,
      falseAlarms: faCount,
      timePlayedSec,
    };

    setGameSummary(summary);
    setGameState('summary');
    sounds.playLevelUp();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });

    // Update global profile high score
    const earnedXp = Math.round(finalScore * 0.5);
    const earnedCoins = Math.max(10, Math.round(finalScore * 0.1));
    onUpdateScore('spider-rabbit', finalScore, earnedXp, earnedCoins);

    const record = recordGameScore(
      'spider-rabbit',
      profile,
      finalScore,
      `${hits} Hits • ${distanceMeters}m Drift`
    );
    setPlayerRank(record.rank);
  }, [onUpdateScore, profile]);

  // ==========================================
  // MAIN 60FPS GAME LOOP
  // ==========================================
  useEffect(() => {
    if (gameState !== 'running') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const eng = engineRef.current;
    const scrollSpeedPxPerSec = 175;

    const gameLoop = (timestamp: number) => {
      if (!eng.isRunning) return;

      const dtSec = Math.min(0.1, (timestamp - eng.lastFrameTime) / 1000);
      eng.lastFrameTime = timestamp;
      eng.elapsedMs = timestamp - eng.startTime;

      // Update Trial Countdown
      const remainingSec = Math.max(0, TRIAL_DURATION_SEC - Math.floor(eng.elapsedMs / 1000));
      setTimeRemaining(remainingSec);
      if (remainingSec <= 0) {
        finishTrial();
        return;
      }

      // Distance & Score progression
      const deltaDist = scrollSpeedPxPerSec * dtSec;
      eng.distancePx += deltaDist;
      eng.score += Math.round(deltaDist * 0.2);
      setDistanceTraveled(Math.round(eng.distancePx / 10)); // In meters

      // ----------------------------------------
      // 1. Procedural Horizontal Road Scrolling & Bifurcations
      // ----------------------------------------
      eng.roadWindingPhase += dtSec * 0.8;

      // Move all segments leftward (scrolling from right to left)
      for (const seg of eng.roadSegments) {
        seg.x -= deltaDist;
      }

      // Remove segments that scrolled off-screen left (x < -60)
      while (eng.roadSegments.length && eng.roadSegments[0].x < -60) {
        eng.roadSegments.shift();
      }

      // Add new segments at the right boundary
      const segmentStep = 8;
      while (eng.roadSegments.length < Math.ceil(CANVAS_WIDTH / segmentStep) + 24) {
        const lastX = eng.roadSegments.length ? eng.roadSegments[eng.roadSegments.length - 1].x : CANVAS_WIDTH;
        const nextX = lastX + segmentStep;
        const phase = (eng.distancePx + nextX) * 0.0032;

        // Complex tortuous winding path formula combining multiple harmonic frequencies
        const rawCenterY = 300 +
          Math.sin(phase) * 145 +
          Math.sin(phase * 2.1 + 0.8) * 65 +
          Math.cos(phase * 0.55) * 50 +
          Math.sin(phase * 3.8) * 24;
        const clampedCenterY = Math.max(90, Math.min(510, rawCenterY));

        eng.roadSegments.push({
          x: nextX,
          centerY: clampedCenterY,
          width: ROAD_WIDTH,
        });
      }

      // ----------------------------------------
      // 1.5 Update Garden Background Props, Butterflies, Bees & Anime Petals
      // ----------------------------------------
      // (a) Garden Props Parallax & Recycling
      const allSceneryTypes = [
        'tree_blossom', 'tree_apple', 'tree_oak', 'tree_willow',
        'fountain', 'bench', 'stone_lantern', 'birdbath',
        'bush_hydrangea', 'bush_rose', 'bush_lavender',
        'flowerbed_sunflowers', 'flowerbed_cosmos', 'flowers_tulip', 'flowers_daisy',
        'mushroom', 'fence'
      ] as const;

      for (const prop of eng.gardenProps) {
        prop.x -= deltaDist * 0.85; // Subtle parallax relative to road
        if (prop.x < -100) {
          prop.x = CANVAS_WIDTH + 60 + Math.random() * 140;
          const isTop = Math.random() > 0.45;
          prop.y = isTop ? 15 + Math.random() * 115 : 465 + Math.random() * 115;
          prop.type = allSceneryTypes[Math.floor(Math.random() * allSceneryTypes.length)];
          prop.scale = (prop.type === 'fountain' || prop.type === 'bench' || prop.type.startsWith('tree'))
            ? 0.95 + Math.random() * 0.25
            : 0.8 + Math.random() * 0.35;
        }
      }

      // (b) Fluttering Butterflies
      for (const bf of eng.butterflies) {
        bf.x += bf.speed;
        bf.wingAngle += 0.22;
        bf.y = bf.baseY + Math.sin(bf.x * 0.025) * 18;
        if (bf.x > CANVAS_WIDTH + 50) {
          bf.x = -50;
          bf.baseY = 60 + Math.random() * 480;
        }
      }

      // (c) Chubby Honeybees with Bobbing Motion
      for (const bee of eng.bees) {
        bee.x += bee.speed;
        bee.wingAngle += 0.45; // Fast flutter
        bee.bobPhase += dtSec * 4;
        bee.y = bee.baseY + Math.sin(bee.bobPhase) * 12 + Math.cos(bee.x * 0.02) * 8;
        if (bee.x > CANVAS_WIDTH + 50) {
          bee.x = -50;
          bee.baseY = 80 + Math.random() * 440;
        }
      }

      // (d) Drifting Sakura Petals
      for (const petal of eng.driftingPetals) {
        petal.x += petal.vx;
        petal.y += petal.vy + Math.sin(petal.x * 0.015) * 0.2;
        petal.rot += petal.rotSpeed;
        if (petal.x < -20 || petal.y > CANVAS_HEIGHT + 20) {
          petal.x = CANVAS_WIDTH + Math.random() * 80;
          petal.y = -20 + Math.random() * (CANVAS_HEIGHT * 0.7);
        }
      }

      // ----------------------------------------
      // 2. Perturbation Engine (Inter-Stimulus Generator)
      // ----------------------------------------
      if (!eng.currentPerturbation && eng.elapsedMs >= eng.nextPerturbationTimeMs) {
        // Spawn a new pseudo-random trajectory perturbation along Y and X
        const magChoice = Math.random();
        const magnitude: PerturbationMagnitude =
          magChoice < 0.35 ? 'micro' : magChoice < 0.70 ? 'medium' : 'macro';

        let angleDeg = (Math.random() > 0.5 ? 1 : -1) * (magnitude === 'micro' ? 4 + Math.random() * 4 : magnitude === 'medium' ? 14 + Math.random() * 6 : 28 + Math.random() * 10);
        let offsetPy = magnitude === 'micro' ? 32 : magnitude === 'medium' ? 70 : 130;
        if (Math.random() > 0.5) offsetPy = -offsetPy;

        const newPert: PerturbationEvent = {
          id: eng.perturbations.length + 1,
          startTime: eng.elapsedMs,
          duration: PERTURBATION_WINDOW_MS,
          magnitude,
          angleDeg,
          offsetPx: offsetPy,
          resolved: false,
        };

        eng.currentPerturbation = newPert;
        eng.perturbations.push(newPert);
        setActivePerturbation(newPert);

        // Schedule target perturbation drift mostly in Y axis
        eng.perturbationOffsetTarget = {
          x: Math.sin((angleDeg * Math.PI) / 180) * 15,
          y: offsetPy,
        };
      }

      // Process Active Perturbation Expiry / Miss
      if (eng.currentPerturbation && !eng.currentPerturbation.resolved) {
        const activeTime = eng.elapsedMs - eng.currentPerturbation.startTime;

        // Smoothly ramp perturbation offset into avatar coordinate
        const ramp = Math.min(1, activeTime / 350);
        eng.perturbationOffsetCurrent.x += (eng.perturbationOffsetTarget.x * ramp - eng.perturbationOffsetCurrent.x) * 0.15;
        eng.perturbationOffsetCurrent.y += (eng.perturbationOffsetTarget.y * ramp - eng.perturbationOffsetCurrent.y) * 0.15;

        // Check if 2000ms window expired -> MISS
        if (activeTime >= PERTURBATION_WINDOW_MS) {
          eng.currentPerturbation.resolved = true;
          eng.currentPerturbation.result = 'MISS';

          // Deduct score on MISS
          eng.score = Math.max(0, eng.score - 100);
          setLiveScore(Math.round(eng.score));

          // Audio & Visual feedback
          sounds.playHazardWarning();
          eng.floatingTexts.push({
            x: eng.avatarX,
            y: eng.avatarY - 30,
            text: 'MISS (-100)',
            color: '#ef4444',
            life: 45,
          });

          setFeedbackBanner({
            text: '❌ MISS: Distraction was not cleared in time (-100)',
            color: 'text-red-400 bg-red-950/80 border-red-500/50',
            time: Date.now(),
          });

          // Gradually return to true cursor control
          eng.perturbationOffsetTarget = { x: 0, y: 0 };
          setActivePerturbation(null);

          // Schedule next perturbation
          eng.nextPerturbationTimeMs = eng.elapsedMs + 3500 + Math.random() * 3500;
          eng.currentPerturbation = null;
        }
      } else {
        // Smooth return to zero offset
        eng.perturbationOffsetCurrent.x += (0 - eng.perturbationOffsetCurrent.x) * 0.12;
        eng.perturbationOffsetCurrent.y += (0 - eng.perturbationOffsetCurrent.y) * 0.12;
      }

      // ----------------------------------------
      // 3. Avatar Physics & Mouse Tracking Smoothing
      // ----------------------------------------
      const targetX = eng.cursorX + eng.perturbationOffsetCurrent.x;
      const targetY = eng.cursorY + eng.perturbationOffsetCurrent.y;

      // Exponential smoothing (lerp)
      eng.avatarX += (targetX - eng.avatarX) * 0.22;
      eng.avatarY += (targetY - eng.avatarY) * 0.22;

      // Keep avatar clamped within canvas boundaries
      eng.avatarX = Math.max(RABBIT_RADIUS, Math.min(CANVAS_WIDTH - RABBIT_RADIUS, eng.avatarX));
      eng.avatarY = Math.max(RABBIT_RADIUS, Math.min(CANVAS_HEIGHT - RABBIT_RADIUS, eng.avatarY));

      // ----------------------------------------
      // 4. Continuous Midline Scoring & Collision Detection
      // ----------------------------------------
      const currentMidlineY = getMidlineAtX(eng.avatarX, eng.roadSegments);
      const trackingError = Math.abs(eng.avatarY - currentMidlineY);

      // Continuous Midline Scoring:
      // - Centered on yellow dashed line (<= 22px): Add points (+60 pts/sec)
      // - Safe road zone (<= 45px): Add points (+25 pts/sec)
      // - Drifting away from center (> 45px & <= 65px): Subtract points (-25 pts/sec)
      // - Off center (> 65px): Subtract points (-50 pts/sec)
      if (trackingError <= 22) {
        eng.score += 60 * dtSec;
      } else if (trackingError <= 45) {
        eng.score += 25 * dtSec;
      } else if (trackingError <= 65) {
        eng.score = Math.max(0, eng.score - 25 * dtSec);
      } else {
        eng.score = Math.max(0, eng.score - 50 * dtSec);
      }

      // Find active road segment at avatar X for edge boundaries
      const matchingSeg = eng.roadSegments.find((s) => Math.abs(s.x - eng.avatarX) < 10);
      if (matchingSeg) {
        // Standard path: check top/bottom garden bush curb boundary
        const halfRoad = matchingSeg.width / 2;
        if (trackingError > halfRoad - RABBIT_RADIUS) {
          // Edge violation detected!
          if (eng.vignetteFlash <= 0.2) {
            eng.collisions.push({
              id: eng.collisions.length + 1,
              timestamp: eng.elapsedMs,
              type: 'bush_boundary',
              x: eng.avatarX,
              y: eng.avatarY,
            });
            sounds.playHazardWarning();
            eng.vignetteFlash = 0.8;
            eng.score = Math.max(0, eng.score - 30);
            eng.floatingTexts.push({
              x: eng.avatarX,
              y: eng.avatarY - 20,
              text: 'GARDEN BUSH HIT! (-30)',
              color: '#f87171',
              life: 35,
            });
          }
        }
      }

      // Sample Continuous Tracking & Update Live Score (Every 100ms)
      eng.sampleTimerMs += dtSec * 1000;
      if (eng.sampleTimerMs >= 100) {
        eng.sampleTimerMs = 0;
        setLiveScore(Math.round(eng.score));
        eng.trackingSamples.push({
          t: eng.elapsedMs,
          avatarX: eng.avatarX,
          avatarY: eng.avatarY,
          cursorX: eng.cursorX,
          cursorY: eng.cursorY,
          midlineX: currentMidlineY,
          errorPx: trackingError,
          isPerturbed: eng.currentPerturbation !== null && !eng.currentPerturbation.resolved,
        });
      }

      // ----------------------------------------
      // 5. CANVAS RENDERING (Garden Environment & Horizontal Road)
      // ----------------------------------------
      renderCanvas(ctx, eng);

      eng.animFrameId = requestAnimationFrame(gameLoop);
    };

    eng.animFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(eng.animFrameId);
  }, [gameState, finishTrial]);

  // ==========================================
  // CANVAS RENDERING ENGINE (MANGA PASTEL GARDEN + HORIZONTAL ROAD)
  // ==========================================
  const renderCanvas = (ctx: CanvasRenderingContext2D, eng: typeof engineRef.current) => {
    // 1. Manga Pastel Meadow Grass Background
    const lawnGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    lawnGrad.addColorStop(0, '#c7f9cc');   // Soft airy pastel mint
    lawnGrad.addColorStop(0.35, '#a7f3d0'); // Pastel spring green
    lawnGrad.addColorStop(0.7, '#86efac');  // Fresh pastel meadow green
    lawnGrad.addColorStop(1, '#6ee7b7');    // Soft teal-tinted garden green
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dappled Manga Sunbeams (Soft diagonal atmospheric light)
    ctx.save();
    const sunbeamGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    sunbeamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
    sunbeamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    sunbeamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunbeamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CANVAS_WIDTH * 0.7, 0);
    ctx.lineTo(CANVAS_WIDTH * 0.3, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Subtle Pastel Lawn Stripes & Grass Tufts
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 24;
    const stripeOffset = (eng.distancePx % 80);
    for (let x = -stripeOffset - 40; x < CANVAS_WIDTH + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // 2. Render Drifting Sakura / Flower Petals (Signature Manga Aesthetic)
    for (const petal of eng.driftingPetals) {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      ctx.fillStyle = petal.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Subtle petal fold highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-petal.size * 0.3, 0, petal.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Render Background Garden Props (Sorted by Y for depth layering)
    const sortedProps = [...eng.gardenProps].sort((a, b) => a.y - b.y);
    for (const prop of sortedProps) {
      drawGardenProp(ctx, prop.x, prop.y, prop.type, prop.scale);
    }

    // 4. Render Fluttering Butterflies
    for (const bf of eng.butterflies) {
      drawButterfly(ctx, bf.x, bf.y, bf.color, bf.wingAngle);
    }

    // 5. Render Chubby Anime Honeybees
    for (const bee of eng.bees) {
      drawBee(ctx, bee.x, bee.y, bee.wingAngle);
    }

    // 6. Draw Horizontal Tortuous Winding Road
    if (eng.roadSegments.length > 2) {
      // (a) Outer Curb & Lush Garden Stone Border
      ctx.strokeStyle = '#475569'; // Slate cobble edging
      ctx.lineWidth = ROAD_WIDTH + 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        if (i === 0) ctx.moveTo(seg.x, seg.centerY);
        else ctx.lineTo(seg.x, seg.centerY);
      }
      ctx.stroke();

      // (b) Paved Cobblestone Outer Trim
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = ROAD_WIDTH + 10;
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        if (i === 0) ctx.moveTo(seg.x, seg.centerY);
        else ctx.lineTo(seg.x, seg.centerY);
      }
      ctx.stroke();

      // (c) Main Road Surface (Smooth Charcoal Slate Asphalt)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = ROAD_WIDTH;
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        if (i === 0) ctx.moveTo(seg.x, seg.centerY);
        else ctx.lineTo(seg.x, seg.centerY);
      }
      ctx.stroke();

      // (d) Road Boundary White Edges (Top & Bottom curbs)
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      // Top Edge Line
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        const ty = seg.centerY - ROAD_WIDTH / 2 + 4;
        if (i === 0) ctx.moveTo(seg.x, ty);
        else ctx.lineTo(seg.x, ty);
      }
      ctx.stroke();

      // Bottom Edge Line
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        const by = seg.centerY + ROAD_WIDTH / 2 - 4;
        if (i === 0) ctx.moveTo(seg.x, by);
        else ctx.lineTo(seg.x, by);
      }
      ctx.stroke();

      // (e) Golden Dashed Centerline Guidance
      ctx.save();
      ctx.strokeStyle = '#facc15'; // Glowing golden road centerline
      ctx.lineWidth = 3.5;
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = eng.distancePx;
      ctx.beginPath();
      for (let i = 0; i < eng.roadSegments.length; i++) {
        const seg = eng.roadSegments[i];
        if (i === 0) ctx.moveTo(seg.x, seg.centerY);
        else ctx.lineTo(seg.x, seg.centerY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 7. Web Snap Lines
    for (let i = eng.webZips.length - 1; i >= 0; i--) {
      const wz = eng.webZips[i];
      wz.life--;
      ctx.strokeStyle = `rgba(255, 255, 255, ${wz.life / 25})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wz.x1, wz.y1);
      ctx.lineTo(wz.x2, wz.y2);
      ctx.stroke();
      if (wz.life <= 0) eng.webZips.splice(i, 1);
    }

    // 8. Cursor Target Indicator (Ghost spider reticle)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(eng.cursorX, eng.cursorY, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Line from true cursor to perturbed avatar
    if (Math.hypot(eng.avatarX - eng.cursorX, eng.avatarY - eng.cursorY) > 8) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eng.cursorX, eng.cursorY);
      ctx.lineTo(eng.avatarX, eng.avatarY);
      ctx.stroke();
    }

    // 9. RENDER SPIDER-RABBIT AVATAR (Super-Rabbit)
    drawSpiderRabbitAvatar(ctx, eng.avatarX, eng.avatarY);

    // 10. Particles
    for (let i = eng.particles.length - 1; i >= 0; i--) {
      const p = eng.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (p.life <= 0) eng.particles.splice(i, 1);
    }

    // 11. Floating Comic Texts
    for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
      const ft = eng.floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      ctx.font = 'bold 15px "Chakra Petch", sans-serif';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      if (ft.life <= 0) eng.floatingTexts.splice(i, 1);
    }

    // 12. Visual Red Vignette Flash on Collision
    if (eng.vignetteFlash > 0) {
      eng.vignetteFlash = Math.max(0, eng.vignetteFlash - 0.05);
      const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        200,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        450
      );
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
      gradient.addColorStop(1, `rgba(239, 68, 68, ${eng.vignetteFlash * 0.6})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  };

  // Helper to draw varied manga garden elements
  const drawGardenProp = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: string,
    scale: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Soft drop shadow for props
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'tree_apple') {
      // Apple tree trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-6, -4, 12, 24);
      // Apple tree crown (Fluffy anime puffs)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, -18, 24, 0, Math.PI * 2);
      ctx.arc(-16, -10, 18, 0, Math.PI * 2);
      ctx.arc(16, -10, 18, 0, Math.PI * 2);
      ctx.arc(0, -32, 16, 0, Math.PI * 2);
      ctx.fill();
      // Mint highlight puff
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(-6, -22, 12, 0, Math.PI * 2);
      ctx.fill();
      // Apples with white shine
      const apples = [{ x: -10, y: -16 }, { x: 10, y: -12 }, { x: 0, y: -26 }, { x: -14, y: -6 }, { x: 12, y: -22 }];
      for (const ap of apples) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ap.x, ap.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ap.x - 1.2, ap.y - 1.2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'tree_blossom') {
      // Manga Sakura Tree trunk
      ctx.fillStyle = '#5c2b14';
      ctx.fillRect(-5, -2, 10, 22);
      // Fluffy pastel pink sakura clouds
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(0, -18, 25, 0, Math.PI * 2);
      ctx.arc(-16, -10, 18, 0, Math.PI * 2);
      ctx.arc(16, -10, 18, 0, Math.PI * 2);
      ctx.arc(0, -30, 16, 0, Math.PI * 2);
      ctx.fill();
      // Light pink sakura highlight puffs
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(-7, -22, 14, 0, Math.PI * 2);
      ctx.arc(8, -16, 12, 0, Math.PI * 2);
      ctx.fill();
      // White sparkle flower centers
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-10, -18, 2, 0, Math.PI * 2);
      ctx.arc(10, -12, 2, 0, Math.PI * 2);
      ctx.arc(0, -28, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'tree_oak') {
      // Oak tree trunk
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-7, -4, 14, 26);
      // Lush oak leaves
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(0, -20, 28, 0, Math.PI * 2);
      ctx.arc(-18, -12, 20, 0, Math.PI * 2);
      ctx.arc(18, -12, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-8, -24, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'tree_willow') {
      // Manga Weeping Willow
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, -6, 10, 28);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, -22, 22, 0, Math.PI * 2);
      ctx.fill();
      // Drooping willow strands
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      for (let i = -16; i <= 16; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -16);
        ctx.quadraticCurveTo(i + 4, 4, i, 14);
        ctx.stroke();
      }
    } else if (type === 'fountain') {
      // Manga Water Fountain!
      // Base pedestal
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-12, 6, 24, 10);
      // Large stone pool basin
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, 4, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Turquoise pool water
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Upper tier bowl
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -6, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(0, -6, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Central spout & animated water spray
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -18);
      ctx.stroke();
      // Spray arcs
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(-10, -22, -14, -4);
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(10, -22, 14, -4);
      ctx.stroke();
      // Water glint sparkles
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -14, 1.8, 0, Math.PI * 2);
      ctx.arc(8, -14, 1.8, 0, Math.PI * 2);
      ctx.arc(0, -20, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'bench') {
      // Manga Wooden Park Bench
      // Dark cast iron legs
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 14); ctx.lineTo(-18, 0); ctx.lineTo(-20, -12);
      ctx.moveTo(18, 14); ctx.lineTo(18, 0); ctx.lineTo(20, -12);
      ctx.stroke();
      // Cedar wood seat planks
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-22, -2, 44, 5);
      ctx.fillRect(-22, 4, 44, 4);
      // Wood backrest slats
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-22, -12, 44, 4);
      ctx.fillRect(-22, -6, 44, 4);
      // Armrest loops
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-18, -4, 4, Math.PI, 0);
      ctx.arc(18, -4, 4, Math.PI, 0);
      ctx.stroke();
      // Flower pot next to bench
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(20, 4, 8, 8);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(24, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'bush_hydrangea') {
      // Fluffy Manga Hydrangea Bush
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pastel purple & periwinkle hydrangea puffs
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(-10, -4, 7, 0, Math.PI * 2);
      ctx.arc(8, -6, 7, 0, Math.PI * 2);
      ctx.arc(0, 4, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(-2, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-10, -4, 1.8, 0, Math.PI * 2);
      ctx.arc(8, -6, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'bush_rose') {
      // English Rose Bush
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(0, 2, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Roses
      const roses = [{ x: -9, y: -4 }, { x: 7, y: -5 }, { x: 0, y: 3 }, { x: -2, y: -8 }];
      for (const r of roses) {
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(r.x - 1, r.y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'bush_lavender') {
      // Lavender cluster stalks
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 12); ctx.lineTo(-10, -10);
      ctx.moveTo(-3, 12); ctx.lineTo(-3, -16);
      ctx.moveTo(3, 12); ctx.lineTo(3, -16);
      ctx.moveTo(8, 12); ctx.lineTo(10, -10);
      ctx.stroke();
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(-10, -10, 4, 0, Math.PI * 2);
      ctx.arc(-3, -16, 4.5, 0, Math.PI * 2);
      ctx.arc(3, -16, 4.5, 0, Math.PI * 2);
      ctx.arc(10, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(-3, -17, 2, 0, Math.PI * 2);
      ctx.arc(3, -17, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'flowerbed_sunflowers') {
      // Mini Manga Sunflower Bed
      const sfs = [{ x: -12, y: 0, r: 8 }, { x: 0, y: -6, r: 9 }, { x: 12, y: 0, r: 8 }];
      for (const sf of sfs) {
        // Yellow petals
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
        ctx.fill();
        // Brown center
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'flowerbed_cosmos') {
      // Colorful Cosmos Bed
      const flowers = [
        { x: -12, y: -2, col: '#f472b6' },
        { x: -4, y: -8, col: '#fb7185' },
        { x: 5, y: -5, col: '#ffffff' },
        { x: 12, y: 2, col: '#f43f5e' },
      ];
      for (const fl of flowers) {
        ctx.fillStyle = fl.col;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'flowers_tulip') {
      // Red & Orange Tulips
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-7, -6, 5, 0, Math.PI * 2);
      ctx.arc(7, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, -10, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'flowers_daisy') {
      // White & Yellow Daisies
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7, -4, 5, 0, Math.PI * 2);
      ctx.arc(7, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(-7, -4, 2.2, 0, Math.PI * 2);
      ctx.arc(7, -6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'stone_lantern') {
      // Japanese Garden Stone Lantern (Tōrō)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-5, 6, 10, 10); // Base
      ctx.fillRect(-3, -2, 6, 8);  // Pillar
      // Light chamber with warm glow
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6, -10, 12, 8);
      // Roof cap
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.lineTo(12, -10);
      ctx.lineTo(0, -18);
      ctx.closePath();
      ctx.fill();
      // Glowing flame center
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'birdbath') {
      // Stone Birdbath
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-3, 0, 6, 14); // Stand
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Little yellow bird on rim
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(10, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'mushroom') {
      // Red polka dot toadstool
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-3, 2, 6, 8);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 2, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -1, 1.8, 0, Math.PI * 2);
      ctx.arc(3, -3, 1.8, 0, Math.PI * 2);
      ctx.arc(0, -6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'fence') {
      // White Garden Picket Fence
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-14, -6, 5, 20);
      ctx.fillRect(-3, -6, 5, 20);
      ctx.fillRect(8, -6, 5, 20);
      ctx.fillRect(-16, 0, 32, 3);
      ctx.fillRect(-16, 8, 32, 3);
      // Pointed picket tops
      ctx.beginPath();
      ctx.moveTo(-14, -6); ctx.lineTo(-11.5, -10); ctx.lineTo(-9, -6);
      ctx.moveTo(-3, -6); ctx.lineTo(-0.5, -10); ctx.lineTo(2, -6);
      ctx.moveTo(8, -6); ctx.lineTo(10.5, -10); ctx.lineTo(13, -6);
      ctx.fill();
    }

    ctx.restore();
  };

  // Helper to draw cute fluttering manga butterflies
  const drawButterfly = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    wingAngle: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.cos(wingAngle);
    ctx.fillStyle = color;
    // Left wing
    ctx.beginPath();
    ctx.ellipse(-5 * flap, -2, 7 * Math.abs(flap), 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(5 * flap, -2, 7 * Math.abs(flap), 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Wing spots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4 * flap, -2, 1.5 * Math.abs(flap), 0, Math.PI * 2);
    ctx.arc(4 * flap, -2, 1.5 * Math.abs(flap), 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1, -5, 2, 10);
    ctx.restore();
  };

  // Helper to draw cute chubby manga honeybees!
  const drawBee = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    wingAngle: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Chubby striped body
    ctx.fillStyle = '#facc15'; // Golden yellow body
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black stripes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -4.8, 2, 9.6);
    ctx.fillRect(2, -4.2, 2, 8.4);

    // Cute rosy cheeks
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(-4, 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Cute eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4.5, -1, 1, 0, Math.PI * 2);
    ctx.fill();

    // Translucent fluttering wings
    const wingFlap = Math.sin(wingAngle);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-1, -6 + wingFlap * 1.5, 3.5, 5.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Helper to draw the custom cute Chibi Spider-Rabbit Avatar
  const drawSpiderRabbitAvatar = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);

    // Cute Bunny Tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cute Superhero Bunny Boots / Feet
    ctx.fillStyle = '#dc2626'; // Red boots
    ctx.beginPath();
    ctx.ellipse(-8, 16, 5, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, 16, 5, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Chibi Superhero Suit Body (Blue with Red Chest panel)
    ctx.fillStyle = '#1e3a8a'; // Deep suit blue
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626'; // Red chest V
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(6, 2);
    ctx.lineTo(4, 14);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.fill();

    // Spider chest emblem
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cute Paws / Gloves
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-13, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bunny Long Ears with Mask hood
    // Left Ear
    ctx.fillStyle = '#dc2626'; // Spider Red
    ctx.beginPath();
    ctx.ellipse(-8, -22, 5, 14, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e3a8a'; // Blue inner ear
    ctx.beginPath();
    ctx.ellipse(-8, -22, 2.5, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Right Ear
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(8, -22, 5, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(8, -22, 2.5, 9, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cute Round Chibi Head wearing Spider-Man Mask
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -4, 15, 0, Math.PI * 2);
    ctx.fill();

    // Mask Webbing lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(0, 10);
    ctx.moveTo(-14, -4); ctx.lineTo(14, -4);
    ctx.stroke();

    // Expressive White Spider-Man Mask Eyes with Black border
    // Left Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-5, -5, 4.5, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5, -5, 3.2, 4.5, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(5, -5, 4.5, 6, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5, -5, 3.2, 4.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Cute Bunny Nose
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(0, 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Glowing spider web aura
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // Mouse Move Event Listener on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'running') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    engineRef.current.cursorX = (e.clientX - rect.left) * scaleX;
    engineRef.current.cursorY = (e.clientY - rect.top) * scaleY;
  };

  // Touch Move Event for Mobile & Tablets
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'running' || !e.touches[0]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    engineRef.current.cursorX = (e.touches[0].clientX - rect.left) * scaleX;
    engineRef.current.cursorY = (e.touches[0].clientY - rect.top) * scaleY;
  };

  // ==========================================
  // EXPORT PSYCHOMETRIC DATA (JSON & CSV)
  // ==========================================
  const exportDataJSON = () => {
    const eng = engineRef.current;
    const exportObject = {
      paradigm: 'Signal Detection Motor Tracking',
      participant: {
        name: profile.name,
        gamerTag: profile.gamerTag,
        gender: profile.gender,
      },
      finalScore: gameSummary?.finalScore ?? Math.round(eng.score),
      stats: {
        hits: eng.perturbations.filter((p) => p.result === 'HIT').length,
        misses: eng.perturbations.filter((p) => p.result === 'MISS').length,
        falseAlarms: eng.falseAlarms.length,
        collisions: eng.collisions.length,
      },
      perturbationTrials: eng.perturbations,
      falseAlarmEvents: eng.falseAlarms,
      collisionEvents: eng.collisions,
      continuousTrackingSamples: eng.trackingSamples,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpiderRabbit_${profile.gamerTag}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDataCSV = () => {
    const eng = engineRef.current;
    let csv = 'Trial_ID,Start_Time_ms,Duration_ms,Magnitude,Angle_deg,Offset_px,Result,Reaction_Time_ms\n';
    eng.perturbations.forEach((p) => {
      csv += `${p.id},${p.startTime},${p.duration},${p.magnitude},${p.angleDeg},${p.offsetPx},${p.result || 'MISS'},${p.reactionTimeMs || 'N/A'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpiderRabbit_Trials_${profile.gamerTag}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreRank = (score: number) => {
    if (score >= 4000) return { title: 'LEGENDARY SPIDER-RABBIT', badge: '🏆 MASTER OF THE ROAD', color: 'text-amber-400', border: 'border-amber-400/40' };
    if (score >= 2500) return { title: 'HEROIC SPEEDSTER', badge: '🌟 EXPERT PILOT', color: 'text-cyan-400', border: 'border-cyan-400/40' };
    if (score >= 1200) return { title: 'ROAD RUNNER', badge: '⚡ SKILLED NAVIGATOR', color: 'text-emerald-400', border: 'border-emerald-400/40' };
    return { title: 'GARDEN APPRENTICE', badge: '🌱 KEEP PRACTICING!', color: 'text-rose-400', border: 'border-rose-400/40' };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 text-white select-none">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <button
            id="spider-rabbit-back-btn"
            onClick={() => {
              sounds.playClick();
              onBackToHub();
            }}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-cyan-400 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black uppercase italic font-cyber tracking-tight">
                Spider-Rabbit No Way Home
              </h1>
            </div>
          </div>
        </div>

        {/* Top Profile Summary Badge */}
        <div className="flex items-center gap-3">
          <button
            id="spider-rabbit-leaderboard-btn"
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
            <span className="text-xs font-mono-tag text-white/40 block">PLAYER / RUNNER</span>
            <span className="text-sm font-cyber font-black text-cyan-400">{profile.name}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-1">
            <SpiderRabbitAvatar size="sm" />
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* STATE 1: INTRO & HOW TO PLAY SCREEN */}
      {/* ==================================================== */}
      {gameState === 'intro' && (
        <div className="w-full max-w-4xl mx-auto bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-blue-600 p-[2px] shadow-xl shadow-red-500/25">
              <div className="w-full h-full bg-[#020617] rounded-[22px] flex items-center justify-center p-1 overflow-visible">
                <SpiderRabbitAvatar size="xl" animate />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-cyber uppercase italic tracking-tight">
              Spider-Rabbit No Way Home
            </h2>
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto font-body leading-relaxed">
              Guide Spider-Rabbit along the winding garden path! Stay centered on the yellow dashed line to rack up continuous points, and press the Carrot button the instant a distraction occurs to earn bonus score.
            </p>
          </div>

          {/* 3 Step Protocol Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-cyber font-black text-sm uppercase">
                <Target className="w-4 h-4" />
                <span>1. Stay on Yellow Line</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed font-body">
                Keep the Spider-Rabbit centered on the yellow road dashed line to continuously earn score! Straying away loses points.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-yellow-400 font-cyber font-black text-sm uppercase">
                <Zap className="w-4 h-4" />
                <span>2. Hit Carrot on Distraction</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed font-body">
                When the rabbit suddenly drifts off course, press the Carrot button (or Spacebar) immediately for a big HIT score bonus!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-cyber font-black text-sm uppercase">
                <ShieldAlert className="w-4 h-4" />
                <span>3. Avoid Misses & Penalties</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed font-body">
                Missing a distraction or pressing the carrot with no distraction active deducts points from your final score.
              </p>
            </div>
          </div>

          {/* Launch Button */}
          <div className="flex justify-center pt-4">
            <button
              id="start-trial-btn"
              onClick={startTrial}
              className="px-10 py-5 rounded-full bg-white hover:bg-cyan-400 text-black font-black text-lg font-cyber uppercase tracking-tighter shadow-2xl transition-all cursor-pointer flex items-center gap-3 transform active:scale-95"
            >
              <Play className="w-6 h-6 fill-black" />
              <span>START GAME</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STATE 2: ACTIVE 60FPS GAMEPLAY SCREEN */}
      {/* ==================================================== */}
      {gameState === 'running' && (
        <div className="space-y-4">
          {/* Real-Time Telemetry HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">TIME REMAINING</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-yellow-400">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Clock className="w-6 h-6 text-yellow-400/60" />
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">SCORE</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-cyan-400">{liveScore.toLocaleString()}</span>
              </div>
              <Activity className="w-6 h-6 text-cyan-400/60" />
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">DISTANCE</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-white">{distanceTraveled} m</span>
              </div>
              <Compass className="w-6 h-6 text-white/40" />
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag text-white/40 block uppercase">HITS</span>
                <span className="text-xl sm:text-2xl font-black font-cyber text-emerald-400">
                  {engineRef.current.perturbations.filter((p) => p.result === 'HIT').length}
                </span>
              </div>
              <Target className="w-6 h-6 text-emerald-400/60" />
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackBanner && (
            <div className={`p-3 rounded-2xl border text-xs sm:text-sm font-mono-tag font-bold flex items-center justify-between transition-all duration-300 ${feedbackBanner.color}`}>
              <span>{feedbackBanner.text}</span>
              <span className="text-[10px] opacity-70">SPACEBAR / CARROT 🥕</span>
            </div>
          )}

          {/* Interactive Canvas Container */}
          <div
            ref={containerRef}
            className="relative w-full aspect-[4/3] max-w-[800px] mx-auto rounded-3xl border-2 border-white/20 bg-black overflow-hidden shadow-2xl"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              className="w-full h-full block cursor-crosshair"
            />

            {/* CARROT BUTTON POSITIONED AT BOTTOM-LEFT CORNER */}
            <div className="absolute bottom-4 left-4 z-30 flex flex-col items-center gap-1">
              <button
                id="carrot-button"
                onClick={handleCarrotClick}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all transform cursor-pointer border-2 ${
                  isCarrotPressed
                    ? 'scale-90 bg-orange-600 border-white'
                    : activePerturbation && !activePerturbation.resolved
                    ? 'scale-105 bg-gradient-to-tr from-amber-500 to-orange-500 border-amber-300 animate-pulse ring-4 ring-orange-500/50'
                    : 'bg-gradient-to-tr from-orange-500 to-amber-400 border-white/30 hover:scale-105'
                }`}
                title="Click when you notice a distraction or deviation! (or Spacebar)"
              >
                <span className="text-2xl sm:text-3xl leading-none">🥕</span>
                <span className="text-[9px] sm:text-[10px] font-cyber font-black text-black uppercase tracking-tighter">
                  CARROT
                </span>
              </button>
              <span className="text-[10px] font-mono-tag font-bold text-white/80 bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                [SPACEBAR]
              </span>
            </div>

            {/* In-Game Early Finish / Pause Option at Top-Right */}
            <div className="absolute top-4 right-4 z-30">
              <button
                onClick={finishTrial}
                className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-mono-tag text-white/70 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-sm"
              >
                Finish Session Early
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STATE 3: FINAL SCORE SCREEN (ONLY ONE FINAL SCORE METRIC) */}
      {/* ==================================================== */}
      {gameState === 'summary' && gameSummary && (
        <div className="w-full max-w-2xl mx-auto bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          {/* Avatar Celebration Icon */}
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-blue-600 p-[2px] shadow-2xl shadow-red-500/30">
            <div className="w-full h-full bg-[#020617] rounded-[22px] flex items-center justify-center p-1">
              <SpiderRabbitAvatar size="xl" animate />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono-tag text-cyan-300 font-bold uppercase tracking-wider mb-2">
              {getScoreRank(gameSummary.finalScore).badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase italic font-cyber tracking-tight text-white">
              MISSION COMPLETE!
            </h2>
            <p className="text-sm text-white/60 font-body">
              Spider-Rabbit completed the winding garden course!
            </p>
          </div>

          {/* ONLY ONE FINAL SCORE METRIC HERO BOX */}
          <div className={`p-8 rounded-3xl bg-gradient-to-b from-black/60 to-black/30 border-2 ${getScoreRank(gameSummary.finalScore).border} shadow-2xl space-y-2 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            <span className="text-xs sm:text-sm font-mono-tag text-white/60 uppercase font-black tracking-widest block">
              FINAL SCORE
            </span>
            <div className={`text-5xl sm:text-7xl font-black font-cyber tracking-tighter ${getScoreRank(gameSummary.finalScore).color} drop-shadow-[0_0_25px_rgba(34,211,238,0.3)]`}>
              {gameSummary.finalScore.toLocaleString()}
            </div>
            <p className="text-xs font-mono-tag text-white/50 pt-1 uppercase tracking-wider">
              {getScoreRank(gameSummary.finalScore).title}
            </p>
          </div>

          {/* Brain Power Unlocked Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 text-left space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-cyber">
                🧠 BRAIN POWER UNLOCKED: VISUO-MOTOR COUPLING & AGENCY
              </span>
              <span className="text-xs font-mono-tag text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Eye-Hand Teamwork</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white uppercase font-cyber tracking-tight">
              Wait... Why Did We Guide Spider-Rabbit? So What Just Happened?
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-body">
              {/* Concept Card 1: Visuo-Motor Coupling */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>👀 + ✋</span>
                  <span>1. What is &quot;Visuo-Motor Coupling&quot;?</span>
                </div>
                <p>
                  <strong className="text-cyan-200 font-semibold">&quot;Visuo&quot;</strong> means what your eyes see. <strong className="text-cyan-200 font-semibold">&quot;Motor&quot;</strong> means how your muscles move your fingers and hands. When you steer Spider-Rabbit, your brain hooks them together into a high-speed feedback loop: your eyes watch the path, and your hand steers to match it. That super-fast teamwork is called <strong className="text-white font-semibold">visuo-motor coupling</strong>.
                </p>
              </div>

              {/* Concept Card 2: Agency & The Carrot Button */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>🥕</span>
                  <span>2. How the Mismatches Proved Your &quot;Agency&quot;:</span>
                </div>
                <p>
                  As long as Spider-Rabbit followed your hand, you felt in total command—that&apos;s your <strong className="text-white font-semibold">Sense of Agency</strong> (&quot;I am in control!&quot;). But every so often, a sneaky wind or distraction knocked Spider-Rabbit off track. Your eyes saw Spider-Rabbit slide sideways, but your hand knew <em>you didn&apos;t do that!</em> Your brain instantly caught the mismatch between sight and touch: <strong className="text-yellow-300 font-semibold">&quot;Hey, that wasn&apos;t me!&quot;</strong>—and you slammed the Carrot button to reclaim control!
                </p>
              </div>

              {/* Concept Card 3: Real life superpower */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
                <span className="font-cyber font-bold text-emerald-300 text-xs block mb-1">
                  🌟 Your Real-Life Brain Superpower:
                </span>
                <p className="text-xs">
                  This eye-hand loop is what allows you to catch a baseball, balance on a scooter when you hit a pebble, write with a pencil, or play a musical instrument. Your brain is constantly checking: <em>&quot;Did my hand do what my eyes wanted?&quot;</em> and fixing mistakes in milliseconds!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              id="view-leaderboard-spider-btn"
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
              id="play-again-btn"
              onClick={startTrial}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-cyan-400 text-black font-black text-sm sm:text-base font-cyber uppercase tracking-tighter shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
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
      {/* STATE 4: DEDICATED LEADERBOARD SCREEN */}
      {/* ==================================================== */}
      {gameState === 'leaderboard' && (
        <div className="bg-[#0f172a] rounded-3xl border border-white/15 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="spider-rabbit"
            profile={profile}
            onClose={() => setGameState('summary')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'spider-rabbit' && onSelectGame) {
                onSelectGame(targetGameId);
              } else {
                startTrial();
              }
            }}
            isEmbeddedInGame={true}
          />
        </div>
      )}
    </div>
  );
};
