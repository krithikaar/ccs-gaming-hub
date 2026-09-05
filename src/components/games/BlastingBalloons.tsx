import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  Snowflake,
  Crosshair,
  Award,
  Sparkles,
  Clock,
  Flame,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BlastingBalloonsProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'blasting-balloons', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

// Game Settings
const GAME_DURATION_SEC = 60.0;
const TARGET_LINE_Y = 85; // Target line Y-coordinate from top of canvas
const BALLOON_RADIUS = 34;
const SUB_30MS_WINDOW = 30; // High points window (<30ms)
const SUB_100MS_WINDOW = 100; // Plus points window (<100ms)

type BalloonType = 'standard' | 'freeze' | 'speed';

interface RisingBalloon {
  id: number;
  x: number;
  y: number;
  radius: number;
  vy: number; // speed in pixels per millisecond (upward is negative dy)
  type: BalloonType;
  color: string;
  glowColor: string;
  wobbleAngle: number;
  wobbleSpeed: number;
  stringWobble: number;
  popped: boolean;
  popReason?: 'perfect_30' | 'good_100' | 'early' | 'late' | 'missed';
  lane: number;
}

interface BlastRecord {
  balloonId: number;
  type: BalloonType;
  offsetMs: number; // Offset from target line (0 = exact hit, positive = before line, negative = past line)
  isSub30: boolean;
  isSub100: boolean;
  isMistake: boolean;
  scoreDelta: number;
  timestamp: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  vRot: number;
  isConfetti: boolean;
}

interface FloatingFeedback {
  id: number;
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  alpha: number;
  scale: number;
}

interface LaserBeam {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  life: number;
  color: string;
}

export const BlastingBalloons: React.FC<BlastingBalloonsProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInteractionTimeRef = useRef(0);

  // High-level States
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover' | 'leaderboard'>('intro');
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [slowMoTimeRemaining, setSlowMoTimeRemaining] = useState(0);
  const [speedRushTimeRemaining, setSpeedRushTimeRemaining] = useState(0);

  // Master Final Score States
  const [finalMasterScore, setFinalMasterScore] = useState(0);
  const [finalAccuracyPercent, setFinalAccuracyPercent] = useState(0);
  const [finalSub30Count, setFinalSub30Count] = useState(0);
  const [finalSub100Count, setFinalSub100Count] = useState(0);
  const [finalMistakesCount, setFinalMistakesCount] = useState(0);
  const [finalAvgOffsetMs, setFinalAvgOffsetMs] = useState(0);

  // Live Telemetry
  const [records, setRecords] = useState<BlastRecord[]>([]);

  // Crosshair coordinates
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 380, y: 220 });

  // Engine state in Ref
  const engineRef = useRef({
    balloons: [] as RisingBalloon[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingFeedback[],
    laserBeams: [] as LaserBeam[],
    nextBalloonId: 1,
    nextTextId: 1,
    slowMoTimerMs: 0, // When > 0, speed is 0.5x
    speedRushTimerMs: 0, // When > 0, speed is 2.0x
    startTime: 0,
    lastFrameTime: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    records: [] as BlastRecord[],
    animFrameId: 0,
    canvasWidth: 760,
    canvasHeight: 460,
    gunMuzzleX: 380,
    gunMuzzleY: 450,
    targetLineY: TARGET_LINE_Y,
  });

  const nextColorIndex = useRef(0);
  const BALLOON_PALETTES = [
    { color: '#f43f5e', glow: '#fb7185' }, // Rose Neon
    { color: '#8b5cf6', glow: '#a78bfa' }, // Purple Neon
    { color: '#10b981', glow: '#34d399' }, // Emerald Glow
    { color: '#f59e0b', glow: '#fbbf24' }, // Amber Gold
    { color: '#ec4899', glow: '#f472b6' }, // Hot Pink
    { color: '#06b6d4', glow: '#38bdf8' }, // Cyan Electric
  ];

  // Spawn an inflated rising balloon at the bottom
  const spawnRisingBalloon = useCallback((forceType?: BalloonType, preferredLane?: number): RisingBalloon => {
    const eng = engineRef.current;
    const id = eng.nextBalloonId++;

    // Type roll: standard (72%), freeze snowflake (14%), speed lightning (14%)
    let type: BalloonType = forceType || 'standard';
    if (!forceType) {
      const roll = Math.random();
      if (roll < 0.14) {
        type = 'freeze';
      } else if (roll < 0.28) {
        type = 'speed';
      } else {
        type = 'standard';
      }
    }

    // Colors
    let color = '#f43f5e';
    let glow = '#fb7185';
    if (type === 'freeze') {
      color = '#06b6d4'; // Cyan Ice
      glow = '#38bdf8';
    } else if (type === 'speed') {
      color = '#eab308'; // Lightning Yellow
      glow = '#fde047';
    } else {
      const palette = BALLOON_PALETTES[nextColorIndex.current % BALLOON_PALETTES.length];
      nextColorIndex.current++;
      color = palette.color;
      glow = palette.glow;
    }

    // 2 Upward Lanes (Left and Right)
    const lanes = [
      { minX: 180, maxX: 300 },
      { minX: 460, maxX: 580 },
    ];

    let laneIndex = preferredLane !== undefined ? preferredLane : 0;
    if (preferredLane === undefined) {
      const activeBalloons = eng.balloons.filter((b) => !b.popped);
      if (activeBalloons.length > 0) {
        laneIndex = activeBalloons[0].lane === 0 ? 1 : 0;
      } else {
        laneIndex = Math.floor(Math.random() * 2);
      }
    }

    const selectedLane = lanes[laneIndex];
    const x = selectedLane.minX + Math.random() * (selectedLane.maxX - selectedLane.minX);

    // Initial Y position: starting from bottom
    const startY = eng.canvasHeight + BALLOON_RADIUS + 10;

    // Upward rising velocity: 0.12 px/ms to 0.18 px/ms
    const baseVy = 0.12 + Math.random() * 0.05;

    return {
      id,
      x,
      y: startY,
      radius: BALLOON_RADIUS,
      vy: baseVy,
      type,
      color,
      glowColor: glow,
      wobbleAngle: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.03 + Math.random() * 0.03,
      stringWobble: Math.random() * Math.PI * 2,
      popped: false,
      lane: laneIndex,
    };
  }, []);

  // Manage spacing and release of balloons:
  // When 1 active balloon gets close to upper line (y <= targetLineY + 145), start the next balloon from bottom
  const manageBalloonSpawns = useCallback((eng: typeof engineRef.current) => {
    eng.balloons = eng.balloons.filter((b) => !b.popped);
    const active = eng.balloons;

    if (active.length === 0) {
      // 0 active balloons: spawn one immediately from the bottom
      eng.balloons.push(spawnRisingBalloon());
    } else if (active.length === 1) {
      // 1 active balloon: only spawn 2nd balloon when the lead balloon is close to upper target line
      const lead = active[0];
      if (lead.y <= eng.targetLineY + 145) {
        const nextLane = lead.lane === 0 ? 1 : 0;
        eng.balloons.push(spawnRisingBalloon(undefined, nextLane));
      }
    }
  }, [spawnRisingBalloon]);

  // Confetti Particle Explosion
  const triggerConfettiExplosion = (x: number, y: number, color: string, isSuper: boolean = false) => {
    const eng = engineRef.current;
    const count = isSuper ? 45 : 25;
    const colors = [color, '#ffffff', '#fbbf24', '#38bdf8', '#f43f5e', '#a855f7'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7.5;
      eng.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 30 + Math.random() * 25,
        maxLife: 55,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        isConfetti: Math.random() > 0.3,
      });
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const originX = (rect.left + (x / eng.canvasWidth) * rect.width) / window.innerWidth;
      const originY = (rect.top + (y / eng.canvasHeight) * rect.height) / window.innerHeight;
      confetti({
        particleCount: isSuper ? 35 : 20,
        spread: isSuper ? 70 : 45,
        startVelocity: 22,
        origin: { x: originX, y: originY },
        colors: [color, '#38bdf8', '#fde047', '#f43f5e'],
        disableForReducedMotion: true,
      });
    }
  };

  // Floating Feedback Banner
  const addFloatingFeedback = (
    x: number,
    y: number,
    text: string,
    color: string,
    subtext?: string
  ) => {
    const eng = engineRef.current;
    eng.floatingTexts.push({
      id: eng.nextTextId++,
      x,
      y,
      text,
      subtext,
      color,
      alpha: 1.0,
      scale: 1.25,
    });
  };

  // Start the 60s Session
  const startGame = () => {
    sounds.playGameStart();
    const eng = engineRef.current;
    eng.balloons = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.laserBeams = [];
    eng.nextBalloonId = 1;
    eng.slowMoTimerMs = 0;
    eng.speedRushTimerMs = 0;
    eng.score = 0;
    eng.combo = 0;
    eng.maxCombo = 0;
    eng.records = [];
    eng.startTime = performance.now();
    eng.lastFrameTime = performance.now();

    // Populate initial cadence: Balloon 1 close to upper line, Balloon 2 starting from bottom
    const b1 = spawnRisingBalloon('standard', 0);
    const b2 = spawnRisingBalloon(Math.random() > 0.5 ? 'freeze' : 'speed', 1);

    // Initial positions: b1 close to top target line (y=220), b2 at bottom (y=504)
    b1.y = 220;
    b2.y = eng.canvasHeight + BALLOON_RADIUS + 10;

    eng.balloons = [b1, b2];

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION_SEC);
    setSlowMoTimeRemaining(0);
    setSpeedRushTimeRemaining(0);
    setRecords([]);
    setGameState('playing');
  };

  // End Game: Backend scoring calculation producing a single master metric
  const endGame = useCallback(() => {
    setGameState('gameover');
    sounds.playLevelUp();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });

    const eng = engineRef.current;
    const allRecords = eng.records;
    const totalTrials = allRecords.length;

    const sub30Hits = allRecords.filter((r) => r.isSub30);
    const sub100Hits = allRecords.filter((r) => r.isSub100 && !r.isSub30);
    const mistakes = allRecords.filter((r) => r.isMistake);

    const onTimeHits = allRecords.filter((r) => r.isSub100);
    const accuracy = totalTrials > 0 ? (onTimeHits.length / totalTrials) : 0;
    const accuracyPercent = Math.round(accuracy * 100);

    const avgOffset =
      onTimeHits.length > 0
        ? Math.round(onTimeHits.reduce((acc, r) => acc + Math.abs(r.offsetMs), 0) / onTimeHits.length)
        : 0;

    // Backend Automatic Calculation of Single Final Master Score Metric:
    const rawScore = eng.score;
    const accuracyBonus = Math.round(rawScore * (accuracy * 0.25));
    const calculatedMasterScore = Math.max(0, rawScore + accuracyBonus);

    setFinalMasterScore(calculatedMasterScore);
    setFinalAccuracyPercent(accuracyPercent);
    setFinalSub30Count(sub30Hits.length);
    setFinalSub100Count(sub100Hits.length);
    setFinalMistakesCount(mistakes.length);
    setFinalAvgOffsetMs(avgOffset);

    const earnedXp = Math.round(calculatedMasterScore * 0.35) + 120;
    const earnedCoins = Math.round(sub30Hits.length * 6 + sub100Hits.length * 3) + 20;

    onUpdateScore('blasting-balloons', calculatedMasterScore, earnedXp, earnedCoins);

    const record = recordGameScore(
      'blasting-balloons',
      profile,
      calculatedMasterScore,
      `${sub30Hits.length} Sub-30ms • ${accuracyPercent}% Acc`
    );
    setPlayerRank(record.rank);
  }, [onUpdateScore, profile]);

  // Player Taps / Clicks anywhere / Presses Space bar:
  // ALWAYS evaluates and blasts the balloon closer to the finish line (top target line)
  const handleFireLaser = useCallback(() => {
    if (gameState !== 'playing') return;

    const eng = engineRef.current;
    const activeBalloons = eng.balloons.filter((b) => !b.popped);
    if (activeBalloons.length === 0) return;

    sounds.playLaserShot();
    const now = performance.now();

    // ALWAYS find the balloon closer to the finish line (target line at top)
    activeBalloons.sort((a, b) => {
      const distA = Math.abs((a.y - a.radius) - eng.targetLineY);
      const distB = Math.abs((b.y - b.radius) - eng.targetLineY);
      return distA - distB;
    });

    const hitBalloon = activeBalloons[0];

    // Smoothly aim the cannon barrel towards the blasted balloon
    setCursorPos({ x: hitBalloon.x, y: hitBalloon.y });

    // Laser visual beam directed towards the targeted balloon
    eng.laserBeams.push({
      startX: eng.gunMuzzleX,
      startY: eng.gunMuzzleY,
      targetX: hitBalloon.x,
      targetY: hitBalloon.y,
      life: 8,
      color: eng.slowMoTimerMs > 0 ? '#38bdf8' : eng.speedRushTimerMs > 0 ? '#fde047' : '#f43f5e',
    });

    hitBalloon.popped = true;

    // Calculate exact timing difference relative to Target Line
    const topApexY = hitBalloon.y - hitBalloon.radius;
    const distToLine = topApexY - eng.targetLineY;

    // Effective rising velocity (px/ms)
    const timeMultiplier = eng.slowMoTimerMs > 0 ? 0.5 : eng.speedRushTimerMs > 0 ? 2.0 : 1.0;
    const effectiveVy = hitBalloon.vy * timeMultiplier;
    const offsetMs = Math.round(distToLine / effectiveVy);
    const absOffsetMs = Math.abs(offsetMs);

    // Evaluate 30ms, 100ms, and Mistimed Windows
    if (absOffsetMs <= SUB_30MS_WINDOW) {
      // ========================================================
      // 🎯 SUB-30MS WINDOW: HIGH POINTS (+300 PTS + COMBO)!
      // ========================================================
      hitBalloon.popReason = 'perfect_30';
      sounds.playPop();
      sounds.playHitChime();
      triggerConfettiExplosion(hitBalloon.x, hitBalloon.y, hitBalloon.color, true);

      const newCombo = eng.combo + 1;
      eng.combo = newCombo;
      eng.maxCombo = Math.max(eng.maxCombo, newCombo);
      setCombo(newCombo);
      setMaxCombo(eng.maxCombo);

      const comboBonus = newCombo * 25;
      const totalPoints = 300 + comboBonus;
      eng.score += totalPoints;
      setScore(eng.score);

      // Power-up Triggers: 4 seconds duration
      if (hitBalloon.type === 'freeze') {
        eng.slowMoTimerMs = 4000;
        eng.speedRushTimerMs = 0;
        sounds.playZenChime(880);
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `❄️ 30MS SLOW-MO BLAST (4s)! +${totalPoints}`,
          '#38bdf8',
          `Exact: ±${absOffsetMs}ms (Sub-30ms High Points)`
        );
      } else if (hitBalloon.type === 'speed') {
        eng.speedRushTimerMs = 4000;
        eng.slowMoTimerMs = 0;
        sounds.playSpeedWarp();
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `⚡ 30MS HYPERSPEED (4s)! +${totalPoints}`,
          '#fde047',
          `Exact: ±${absOffsetMs}ms (Sub-30ms High Points)`
        );
      } else {
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `🎯 GODLY 30MS BLAST! +${totalPoints}`,
          '#fbbf24',
          `Exact: ±${absOffsetMs}ms • HIGH POINTS`
        );
      }

      const record: BlastRecord = {
        balloonId: hitBalloon.id,
        type: hitBalloon.type,
        offsetMs,
        isSub30: true,
        isSub100: true,
        isMistake: false,
        scoreDelta: totalPoints,
        timestamp: now,
      };
      eng.records.push(record);
      setRecords([...eng.records]);
    } else if (absOffsetMs <= SUB_100MS_WINDOW) {
      // ========================================================
      // ⚡ SUB-100MS WINDOW: PLUS POINTS (LOWER) (+120 PTS)!
      // ========================================================
      hitBalloon.popReason = 'good_100';
      sounds.playPop();
      sounds.playHitChime();
      triggerConfettiExplosion(hitBalloon.x, hitBalloon.y, hitBalloon.color, false);

      const newCombo = eng.combo + 1;
      eng.combo = newCombo;
      eng.maxCombo = Math.max(eng.maxCombo, newCombo);
      setCombo(newCombo);
      setMaxCombo(eng.maxCombo);

      const comboBonus = newCombo * 10;
      const totalPoints = 120 + comboBonus;
      eng.score += totalPoints;
      setScore(eng.score);

      // Power-up Triggers: 4 seconds duration
      if (hitBalloon.type === 'freeze') {
        eng.slowMoTimerMs = 4000;
        eng.speedRushTimerMs = 0;
        sounds.playZenChime(880);
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `❄️ SLOW-MOTION (4s)! +${totalPoints}`,
          '#38bdf8',
          `Offset: ±${absOffsetMs}ms (<100ms)`
        );
      } else if (hitBalloon.type === 'speed') {
        eng.speedRushTimerMs = 4000;
        eng.slowMoTimerMs = 0;
        sounds.playSpeedWarp();
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `⚡ 2X HYPERSPEED (4s)! +${totalPoints}`,
          '#fde047',
          `Offset: ±${absOffsetMs}ms (<100ms)`
        );
      } else {
        addFloatingFeedback(
          hitBalloon.x,
          hitBalloon.y - 20,
          `⚡ GOOD TIMING! +${totalPoints}`,
          '#4ade80',
          `Offset: ±${absOffsetMs}ms (<100ms Window)`
        );
      }

      const record: BlastRecord = {
        balloonId: hitBalloon.id,
        type: hitBalloon.type,
        offsetMs,
        isSub30: false,
        isSub100: true,
        isMistake: false,
        scoreDelta: totalPoints,
        timestamp: now,
      };
      eng.records.push(record);
      setRecords([...eng.records]);
    } else {
      // ========================================================
      // ⚠️ MISTIMED JUDGEMENT: NEGATIVE POINTS!
      // ========================================================
      sounds.playFalseAlarmBuzz();
      eng.combo = 0;
      setCombo(0);

      const isEarly = offsetMs > 0;
      hitBalloon.popReason = isEarly ? 'early' : 'late';

      const penalty = isEarly ? 120 : 80;
      eng.score = Math.max(0, eng.score - penalty);
      setScore(eng.score);

      // Gray puff particles
      for (let p = 0; p < 10; p++) {
        eng.particles.push({
          x: hitBalloon.x,
          y: hitBalloon.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: '#64748b',
          life: 20,
          maxLife: 20,
          size: 3,
          rotation: 0,
          vRot: 0,
          isConfetti: false,
        });
      }

      addFloatingFeedback(
        hitBalloon.x,
        hitBalloon.y - 20,
        isEarly ? `⚠️ TOO EARLY! -${penalty}` : `⏱️ TOO LATE! -${penalty}`,
        '#fb7185',
        isEarly
          ? `-${absOffsetMs}ms before target line`
          : `+${absOffsetMs}ms past target line`
      );

      const record: BlastRecord = {
        balloonId: hitBalloon.id,
        type: hitBalloon.type,
        offsetMs,
        isSub30: false,
        isSub100: false,
        isMistake: true,
        scoreDelta: -penalty,
        timestamp: now,
      };
      eng.records.push(record);
      setRecords([...eng.records]);
    }

    // Refresh and maintain the rhythmic cadence
    manageBalloonSpawns(eng);
  }, [gameState, manageBalloonSpawns]);

  // Unified Interaction Handler for Touch & Click with ghost-click suppression
  const handleInteraction = useCallback((isTouch: boolean = false) => {
    if (gameState !== 'playing') return;

    const now = performance.now();
    if (!isTouch && now - lastInteractionTimeRef.current < 350) {
      // Ignore ghost synthetic clicks that follow touchstart on mobile
      return;
    }
    lastInteractionTimeRef.current = now;
    handleFireLaser();
  }, [gameState, handleFireLaser]);

  // Main 60 FPS Canvas Physics & Render Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = (now: number) => {
      if (!isRunning) return;
      const eng = engineRef.current;
      const dtRaw = Math.min(100, now - eng.lastFrameTime);
      eng.lastFrameTime = now;

      // Handle Slow-Mo (0.5x) or Hyperspeed (2.0x)
      let timeMultiplier = 1.0;
      if (eng.slowMoTimerMs > 0) {
        eng.slowMoTimerMs = Math.max(0, eng.slowMoTimerMs - dtRaw);
        setSlowMoTimeRemaining(Math.ceil(eng.slowMoTimerMs / 1000));
        timeMultiplier = 0.5;
      } else {
        setSlowMoTimeRemaining(0);
      }

      if (eng.speedRushTimerMs > 0) {
        eng.speedRushTimerMs = Math.max(0, eng.speedRushTimerMs - dtRaw);
        setSpeedRushTimeRemaining(Math.ceil(eng.speedRushTimerMs / 1000));
        timeMultiplier = 2.0;
      } else {
        setSpeedRushTimeRemaining(0);
      }

      const dt = dtRaw * timeMultiplier;

      // Countdown Timer
      const totalElapsedSec = (now - eng.startTime) / 1000;
      const remSec = Math.max(0, GAME_DURATION_SEC - totalElapsedSec);
      setTimeLeft(Math.ceil(remSec));

      if (remSec <= 0) {
        isRunning = false;
        endGame();
        return;
      }

      // Maintain rhythmic spacing: when lead balloon is close to upper line, spawn from bottom
      manageBalloonSpawns(eng);

      // ----------------------------------------------------
      // 1. UPDATE RISING BALLOONS TOWARDS TARGET LINE
      // ----------------------------------------------------
      eng.balloons.forEach((b) => {
        if (b.popped) return;

        // Move upward: y decreases
        b.y -= b.vy * dt;

        // Gentle horizontal sway
        b.wobbleAngle += b.wobbleSpeed * timeMultiplier;
        b.stringWobble += 0.05 * timeMultiplier;

        // If balloon crossed completely past the target line (> 40px above line), it escapes (Miss Penalty)
        if (b.y + b.radius < eng.targetLineY - 35) {
          b.popped = true;
          b.popReason = 'missed';

          sounds.playPop();
          sounds.playFalseAlarmBuzz();
          eng.combo = 0;
          setCombo(0);
          eng.score = Math.max(0, eng.score - 50);
          setScore(eng.score);

          for (let p = 0; p < 10; p++) {
            eng.particles.push({
              x: b.x,
              y: eng.targetLineY,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 4,
              color: b.color,
              life: 18,
              maxLife: 18,
              size: 3,
              rotation: 0,
              vRot: 0,
              isConfetti: false,
            });
          }

          addFloatingFeedback(b.x, eng.targetLineY - 15, '💨 MISSED LINE! -50', '#94a3b8', 'Passed Target Line');

          const record: BlastRecord = {
            balloonId: b.id,
            type: b.type,
            offsetMs: -150,
            isSub30: false,
            isSub100: false,
            isMistake: true,
            scoreDelta: -50,
            timestamp: now,
          };
          eng.records.push(record);
          setRecords([...eng.records]);
        }
      });

      // Filter popped balloons and update spacing
      manageBalloonSpawns(eng);

      // ----------------------------------------------------
      // 2. UPDATE PARTICLES
      // ----------------------------------------------------
      eng.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.rotation += p.vRot;
        p.life -= 1;
      });
      eng.particles = eng.particles.filter((p) => p.life > 0);

      // ----------------------------------------------------
      // 3. UPDATE FLOATING TEXTS
      // ----------------------------------------------------
      eng.floatingTexts.forEach((t) => {
        t.y -= 0.8;
        t.alpha -= 0.025;
        t.scale = Math.max(0.9, t.scale - 0.01);
      });
      eng.floatingTexts = eng.floatingTexts.filter((t) => t.alpha > 0);

      // ----------------------------------------------------
      // 4. UPDATE LASER BEAMS
      // ----------------------------------------------------
      eng.laserBeams.forEach((l) => {
        l.life -= 1;
      });
      eng.laserBeams = eng.laserBeams.filter((l) => l.life > 0);

      // ----------------------------------------------------
      // 5. RENDER CANVAS FRAME
      // ----------------------------------------------------
      const w = eng.canvasWidth;
      const h = eng.canvasHeight;
      ctx.clearRect(0, 0, w, h);

      // Dynamic Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (eng.slowMoTimerMs > 0) {
        bgGrad.addColorStop(0, '#082f49');
        bgGrad.addColorStop(0.4, '#0c4a6e');
        bgGrad.addColorStop(1, '#021827');
      } else if (eng.speedRushTimerMs > 0) {
        bgGrad.addColorStop(0, '#422006');
        bgGrad.addColorStop(0.4, '#713f12');
        bgGrad.addColorStop(1, '#1c1917');
      } else {
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.4, '#0f172a');
        bgGrad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Arena Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 40; gy < h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Center Lane Guide Divider (Dotted)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 1.5;
      [380].forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(lx, eng.targetLineY + 20);
        ctx.lineTo(lx, h);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // ----------------------------------------------------
      // DRAW TARGET LINE (TOP LASER LINE)
      // ----------------------------------------------------
      const lineY = eng.targetLineY;

      // Glow halo behind target line
      ctx.save();
      ctx.shadowColor = eng.slowMoTimerMs > 0 ? '#38bdf8' : eng.speedRushTimerMs > 0 ? '#fde047' : '#f43f5e';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = eng.slowMoTimerMs > 0 ? 'rgba(56, 189, 248, 0.8)' : eng.speedRushTimerMs > 0 ? 'rgba(253, 224, 71, 0.8)' : 'rgba(244, 63, 94, 0.8)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(20, lineY);
      ctx.lineTo(w - 20, lineY);
      ctx.stroke();

      // White core beam line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, lineY);
      ctx.lineTo(w - 20, lineY);
      ctx.stroke();

      // Target Line Precision Sensor Nodes & Ticks
      for (let tickX = 40; tickX < w - 20; tickX += 60) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tickX, lineY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Target Line Header Badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(w / 2 - 140, lineY - 26, 280, 20);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w / 2 - 140, lineY - 26, 280, 20);

      ctx.font = 'bold 10px "Chakra Petch", sans-serif';
      ctx.fillStyle = eng.slowMoTimerMs > 0 ? '#38bdf8' : eng.speedRushTimerMs > 0 ? '#fde047' : '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ TARGET LINE • CLICK ANYWHERE NEAR LINE', w / 2, lineY - 16);
      ctx.restore();

      // ----------------------------------------------------
      // DRAW 2 RISING BALLOONS
      // ----------------------------------------------------
      eng.balloons.forEach((b) => {
        ctx.save();
        const drawX = b.x + Math.sin(b.wobbleAngle) * 5;
        const drawY = b.y;
        ctx.translate(drawX, drawY);

        const r = b.radius;
        const topApexY = drawY - r;
        const distToLine = topApexY - eng.targetLineY;
        const absDistToLine = Math.abs(distToLine);

        // Target Line Proximity Aura & Pulse (Glows strongly when about to reach line)
        if (absDistToLine <= 30) {
          // Sub-30ms Proximity Gold Bloom
          ctx.beginPath();
          ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Sub-30ms indicator tag above balloon
          ctx.font = 'bold 10px "Chakra Petch", sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ BLAST NOW (<30ms)!', 0, -r - 18);
        } else if (distToLine <= 60 && distToLine > 0) {
          // Sub-100ms Approach Glow
          ctx.beginPath();
          ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 1. Balloon Dangling String
        ctx.beginPath();
        ctx.moveTo(0, r * 1.15);
        ctx.quadraticCurveTo(
          Math.sin(b.stringWobble) * 8,
          r * 1.15 + 16,
          Math.sin(b.stringWobble + 1) * 4,
          r * 1.15 + 32
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 2. Glossy Inflated Balloon Body
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 1.18, 0, 0, Math.PI * 2);
        const balloonGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.2);
        balloonGrad.addColorStop(0, '#ffffff');
        balloonGrad.addColorStop(0.25, b.glowColor);
        balloonGrad.addColorStop(0.85, b.color);
        balloonGrad.addColorStop(1, '#000000');
        ctx.fillStyle = balloonGrad;
        ctx.fill();

        ctx.strokeStyle = absDistToLine <= 30 ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = absDistToLine <= 30 ? 2.5 : 1.5;
        ctx.stroke();

        // 3. Highlight Shimmer
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.38, -Math.PI / 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();

        // 4. Knot
        ctx.beginPath();
        ctx.moveTo(-4, r * 1.16);
        ctx.lineTo(4, r * 1.16);
        ctx.lineTo(0, r * 1.16 + 6);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();

        // 5. Special Type Badges
        if (b.type === 'freeze' || b.type === 'speed') {
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = b.type === 'freeze' ? '❄️' : '⚡';
          ctx.fillText(icon, 0, 2);
        }

        ctx.restore();
      });

      // ----------------------------------------------------
      // DRAW PARTICLES & CONFETTI
      // ----------------------------------------------------
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

        if (p.isConfetti) {
          ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // ----------------------------------------------------
      // DRAW LASER BEAMS
      // ----------------------------------------------------
      eng.laserBeams.forEach((l) => {
        ctx.save();
        const beamAlpha = l.life / 8;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 4 * beamAlpha;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(l.startX, l.startY);
        ctx.lineTo(l.targetX, l.targetY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * beamAlpha;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(l.targetX, l.targetY, (9 - l.life) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      });

      // ----------------------------------------------------
      // DRAW FLOATING FEEDBACK TEXTS
      // ----------------------------------------------------
      eng.floatingTexts.forEach((t) => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(t.scale, t.scale);
        ctx.globalAlpha = t.alpha;

        ctx.font = 'bold 15px "Chakra Petch", sans-serif';
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(t.text, 0, 0);

        if (t.subtext) {
          ctx.font = 'bold 11px "Space Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(t.subtext, 0, 16);
        }

        ctx.restore();
      });

      // ----------------------------------------------------
      // DRAW LASER CANNON AT BOTTOM CENTER
      // ----------------------------------------------------
      ctx.save();
      const gunX = eng.gunMuzzleX;
      const gunY = eng.gunMuzzleY;
      const angleToCursor = Math.atan2(cursorPos.y - gunY, cursorPos.x - gunX);

      ctx.translate(gunX, gunY);
      ctx.rotate(angleToCursor + Math.PI / 2);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -28, 16, 28);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -28, 16, 28);

      ctx.fillStyle =
        eng.slowMoTimerMs > 0 ? '#38bdf8' : eng.speedRushTimerMs > 0 ? '#fde047' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -28, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      eng.animFrameId = requestAnimationFrame(loop);
    };

    engineRef.current.animFrameId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(engineRef.current.animFrameId);
    };
  }, [gameState, cursorPos, endGame, manageBalloonSpawns]);

  // Handle Mouse Move over Canvas (only updates orientation)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setCursorPos({ x, y });
  };

  // Keyboard Spacebar & Enter Support
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFireLaser();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleFireLaser]);

  // Temporal Assessment Rank
  const getTemporalRank = () => {
    if (finalAccuracyPercent >= 85 && finalSub30Count >= 10) {
      return {
        title: 'CHRONO SAGE (S-RANK)',
        badge: '⏱️ SUB-30MS TEMPORAL PRECISION MASTER',
        color: 'text-amber-300',
        border: 'border-amber-400/60',
        bg: 'from-amber-500/20 to-yellow-600/10',
        desc: 'Sublime sub-30ms temporal perception! You accurately anticipate rising velocity right at the line.',
      };
    }
    if (finalAccuracyPercent >= 65) {
      return {
        title: 'LINE WEAVER (A-RANK)',
        badge: '🎯 PRECISION CHRONO SNIPER',
        color: 'text-cyan-300',
        border: 'border-cyan-400/60',
        bg: 'from-cyan-500/20 to-blue-600/10',
        desc: 'Sharp temporal reflexes! Highly synchronized with the rising line intersection threshold.',
      };
    }
    if (finalAccuracyPercent >= 45) {
      return {
        title: 'LINE RANGER (B-RANK)',
        badge: '⚡ AGILE TEMPORAL GUNNER',
        color: 'text-emerald-300',
        border: 'border-emerald-400/60',
        bg: 'from-emerald-500/20 to-teal-600/10',
        desc: 'Solid timing estimation. Practice locking on right within 30ms of the target line.',
      };
    }
    return {
      title: 'APPRENTICE CHRONO (C-RANK)',
      badge: '🌱 TEMPORAL IN TRAINING',
      color: 'text-rose-300',
      border: 'border-rose-400/60',
      bg: 'from-rose-500/20 to-red-600/10',
      desc: 'Anticipatory early firing or late reactions detected. Wait until the balloon touches the top line!',
    };
  };

  const rank = getTemporalRank();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 text-white select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHub();
          }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-cyber text-xs tracking-wider transition-all cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO HUB</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-cyan-500/30">
            🎯
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black font-cyber text-amber-300 flex items-center gap-2">
              <span>BLASTING BALLOONS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono-tag hidden sm:inline-block">
                TARGET LINE
              </span>
            </h1>
            <span className="text-[10px] text-slate-400 font-cyber">
              {profile.name} • 30ms & 100ms Precision Blast
            </span>
          </div>
        </div>

        {/* Live Status Stats */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-cyber text-xs sm:text-sm">
          <button
            id="balloons-leaderboard-btn"
            onClick={() => {
              sounds.playClick();
              setGameState('leaderboard');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            title="View Global Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">LEADERBOARD</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-bold flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>{score} PTS</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            <span>{combo}x</span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 ${
              timeLeft <= 10
                ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. INTRO / RULES SCREEN */}
      {/* ==================================================== */}
      {gameState === 'intro' && (
        <div className="relative w-full rounded-3xl border-2 border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-400 flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/40 mx-auto animate-bounce">
            🎈
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-cyber font-bold uppercase tracking-wider">
              1-MINUTE RISING BALLOON LINE BLAST ASSESSMENT
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">
              TIME YOUR BLAST AT THE TARGET LINE!
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto font-body leading-relaxed">
              Inflated balloons travel upwards from the bottom. <strong className="text-amber-300 font-bold">Click anywhere</strong> the exact millisecond a balloon touches the top target line!
            </p>
          </div>

          {/* 3 Core Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-cyber font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>&lt; 30ms High Points</span>
              </div>
              <p className="text-xs text-slate-300 font-body leading-relaxed">
                Blast within <strong className="text-amber-300 font-bold">30ms</strong> of reaching the line for <strong className="text-emerald-400">+300 pts</strong> and high combo multipliers!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-xs">
                <Crosshair className="w-4 h-4" />
                <span>Click Anywhere Counted</span>
              </div>
              <p className="text-xs text-slate-300 font-body leading-relaxed">
                Clicking <strong className="text-cyan-300 font-bold">anywhere on screen</strong> evaluates the balloon nearest the line. No need to click directly on the balloon!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-cyber font-bold text-xs">
                <TrendingUp className="w-4 h-4" />
                <span>2 Rising Balloons</span>
              </div>
              <p className="text-xs text-slate-300 font-body leading-relaxed">
                Max 2 balloons on screen. Blast <strong className="text-cyan-300">❄️ Freeze</strong> for <strong className="text-cyan-300">4s Slow-Mo</strong> or <strong className="text-yellow-300">⚡ Lightning</strong> for <strong className="text-yellow-300">4s Hyperspeed</strong>!
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={startGame}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-400 hover:from-cyan-400 hover:to-amber-300 text-slate-950 font-black font-cyber text-base sm:text-lg uppercase tracking-wider shadow-2xl shadow-cyan-500/40 transform hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-3"
            >
              <Zap className="w-5 h-5 fill-black" />
              <span>START 60s ASSESSMENT</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. ACTIVE PLAYING CANVAS ARENA */}
      {/* ==================================================== */}
      {gameState === 'playing' && (
        <div className="space-y-3" ref={containerRef}>
          {/* Active Power Indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {slowMoTimeRemaining > 0 && (
                <div className="px-3 py-1 rounded-xl bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-cyber text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg shadow-cyan-500/30">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
                  <span>❄️ SLOW-MOTION ACTIVE (0.5X): {slowMoTimeRemaining}s</span>
                </div>
              )}

              {speedRushTimeRemaining > 0 && (
                <div className="px-3 py-1 rounded-xl bg-amber-500/30 border border-amber-400 text-amber-200 font-cyber text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg shadow-amber-500/30">
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span>⚡ 2X HYPERSPEED ACTIVE: {speedRushTimeRemaining}s</span>
                </div>
              )}

              {slowMoTimeRemaining === 0 && speedRushTimeRemaining === 0 && (
                <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono-tag text-xs flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BLAST BALLOONS WITHIN 30MS OF TARGET LINE!</span>
                </div>
              )}
            </div>

            {/* Sub-30ms Precision Counter */}
            <div className="text-xs font-mono-tag text-amber-400 flex items-center gap-1">
              <span>30MS GODLY BLASTS:</span>
              <strong className="font-cyber text-sm">
                {records.filter((r) => r.isSub30).length}
              </strong>
            </div>
          </div>

          {/* Interactive Canvas Frame */}
          <div
            className="relative w-full rounded-2xl sm:rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-950 aspect-[4/3] sm:aspect-[16/9] max-h-[460px] flex items-center justify-center cursor-crosshair touch-none select-none"
            onClick={() => handleInteraction(false)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleInteraction(true);
            }}
          >
            <canvas
              ref={canvasRef}
              width={760}
              height={460}
              onMouseMove={handleCanvasMouseMove}
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInteraction(true);
              }}
              className="w-full h-full cursor-crosshair touch-none select-none"
            />
          </div>

          {/* Live Telemetry Info Bar */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-cyber">
            <div className="flex items-center gap-4 text-slate-400">
              <span>&lt;30ms Hits: <strong className="text-amber-400 font-cyber">{records.filter((r) => r.isSub30).length}</strong></span>
              <span>&lt;100ms Hits: <strong className="text-cyan-300 font-cyber">{records.filter((r) => r.isSub100 && !r.isSub30).length}</strong></span>
              <span>Mistakes: <strong className="text-rose-400 font-cyber">{records.filter((r) => r.isMistake).length}</strong></span>
            </div>

            <div className="text-slate-400 text-[11px] font-mono-tag">
              2 CONCURRENT BALLOONS • CLICK ANYWHERE COUNTED
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. GAME OVER & SINGLE FINAL SCORE METRIC */}
      {/* ==================================================== */}
      {gameState === 'gameover' && (
        <div className="relative w-full rounded-3xl border-2 border-slate-800 bg-slate-900/95 overflow-hidden shadow-2xl p-6 sm:p-10 space-y-7 text-center">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/30 mx-auto">
              🏆
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">
              ASSESSMENT COMPLETED!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-body">
              60-second Target Line Time Perception Assessment for {profile.name}
            </p>
          </div>

          {/* ======================================================= */}
          {/* SINGLE PROMINENT FINAL SCORE METRIC (User Requirement) */}
          {/* ======================================================= */}
          <div className={`p-8 rounded-3xl bg-gradient-to-b ${rank.bg} border-2 ${rank.border} shadow-2xl space-y-4 max-w-xl mx-auto`}>
            <span className="text-xs font-mono-tag text-slate-300 uppercase tracking-widest block font-bold">
              // FINAL TIME PERCEPTION SCORE
            </span>

            {/* The One Master Score Metric */}
            <div className="text-5xl sm:text-6xl font-black font-cyber text-amber-300 tracking-tight drop-shadow-[0_0_25px_rgba(251,191,36,0.4)]">
              {finalMasterScore.toLocaleString()} <span className="text-2xl sm:text-3xl text-amber-400/80 font-bold">PTS</span>
            </div>

            {/* Assessed Rank Tier */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/20 text-xs font-cyber font-bold text-white shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{rank.title}</span>
            </div>

            <p className="text-xs text-slate-300 font-body max-w-md mx-auto leading-relaxed">
              {rank.desc}
            </p>

            {/* Backend Scoring Breakdown Strip */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs font-mono-tag text-slate-400">
              <span className="flex items-center gap-1">
                Accuracy: <strong className="text-cyan-300 font-cyber">{finalAccuracyPercent}%</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                &lt;30ms Hits: <strong className="text-amber-400 font-cyber">{finalSub30Count}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                &lt;100ms Hits: <strong className="text-cyan-300 font-cyber">{finalSub100Count}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Mistakes: <strong className="text-rose-400 font-cyber">{finalMistakesCount}</strong>
              </span>
            </div>
          </div>

          {/* Brain Power Unlocked Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 text-left space-y-4 shadow-xl max-w-xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-cyber">
                🧠 BRAIN POWER UNLOCKED: PURE VISUAL TIMING
              </span>
              <span className="text-xs font-mono-tag text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Eyes Only, No Sound Cues!</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white uppercase font-cyber tracking-tight">
              Wait... Why Did We Blast Balloons? How Did Your Eyes Judge Time?
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-body">
              {/* Concept Card 1: Pure Visual Timing */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>👁️</span>
                  <span>1. Flying Blind Without Sound Cues:</span>
                </div>
                <p>
                  In music rhythm games, your ears give you a musical beat to count down the seconds. But here, there was <strong className="text-white font-semibold">no beat, no ticking clock, and no audio warning</strong>. Your brain had to rely on <strong className="text-amber-300 font-semibold">ONLY YOUR EYES (Pure Visual Perception)</strong> to judge the exact millisecond of arrival!
                </p>
              </div>

              {/* Concept Card 2: Visual Delay & Future Prediction */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>2. Why Your Brain Had to &quot;Predict the Future&quot;:</span>
                </div>
                <p>
                  Did you know it takes about <strong className="text-white font-semibold">50 to 80 milliseconds</strong> for light hitting your eyes to be processed by your brain? If you waited until you saw the balloon touching the line, it was already too late! To hit the <strong className="text-cyan-300 font-semibold">&lt;30ms and &lt;100ms windows</strong>, your visual cortex calculated the rising speed and triggered your finger to blast <strong className="text-white font-semibold">before</strong> the balloon actually arrived. You were predicting the future!
                </p>
              </div>

              {/* Concept Card 3: Real world connection */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
                <span className="font-cyber font-bold text-emerald-300 text-xs block mb-1">
                  🌟 Your Real-Life Brain Superpower:
                </span>
                <p className="text-xs">
                  This pure visual anticipation is what baseball batters use to crush a 90 mph fastball, tennis players use to return a lightning serve, and goalkeepers use to dive for a penalty shot. No sound can help you in time—your visual brain does the physics math entirely on its own!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="view-leaderboard-balloons-btn"
              onClick={() => {
                sounds.playClick();
                setGameState('leaderboard');
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-slate-950 font-black text-sm font-cyber uppercase tracking-tighter shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
            >
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>
                {playerRank ? `VIEW LEADERBOARD (RANK #${playerRank})` : 'VIEW LEADERBOARD & RANK'}
              </span>
            </button>

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-400 hover:from-cyan-400 hover:to-amber-300 text-slate-950 font-black font-cyber text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>TEST AGAIN (60S)</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onBackToHub();
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-cyber font-bold text-xs tracking-wider transition-all cursor-pointer"
            >
              BACK TO HUB
            </button>
          </div>
        </div>
      )}

      {/* 3. DEDICATED LEADERBOARD SCREEN */}
      {gameState === 'leaderboard' && (
        <div className="bg-[#0f172a] rounded-3xl border border-white/15 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="blasting-balloons"
            profile={profile}
            onClose={() => setGameState('gameover')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'blasting-balloons' && onSelectGame) {
                onSelectGame(targetGameId);
              } else {
                startGame();
              }
            }}
            isEmbeddedInGame={true}
          />
        </div>
      )}

      {/* Legend Footer */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-cyber">
        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div>
            <div className="font-bold text-amber-300">&lt; 30ms Target Line Hit</div>
            <div className="text-[10px] text-slate-400">High Points (+300 pts) right at the line</div>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <div className="font-bold text-cyan-300">&lt; 100ms Precision Hit</div>
            <div className="text-[10px] text-slate-400">Plus Points (+120 pts) near the line</div>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="font-bold text-rose-400">Mistimed Penalties</div>
            <div className="text-[10px] text-slate-400">Early (-120), Late (-80), Missed line (-50)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
