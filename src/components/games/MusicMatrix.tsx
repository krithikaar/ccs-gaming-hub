import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { SONG_TRACKS, SongTrack, SongNote } from '../../utils/musicTracks';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import {
  ArrowLeft,
  RefreshCw,
  Music,
  Zap,
  Flame,
  Trophy,
  Volume2,
  Sparkles,
  ArrowLeftCircle,
  ArrowRightCircle,
  Play,
  Award,
  Radio,
  Clock,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MusicMatrixProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'music-matrix', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
}

const FALL_DURATION = 1.8; // Seconds for note to travel from top to bottom target line (~3 beats of visual anticipation)
const HIT_WINDOW_MS = 200; // Maximum acceptable tap window in ms

export const MusicMatrix: React.FC<MusicMatrixProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover' | 'leaderboard'>('ready');
  const [selectedTrack, setSelectedTrack] = useState<SongTrack>(SONG_TRACKS[0]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // Live Score State
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [activeLanePress, setActiveLanePress] = useState<{ lane: number; time: number } | null>(null);

  // Performance Statistics for Single Composite Score
  const [stats, setStats] = useState({
    perfectHits: 0,
    greatHits: 0,
    goodHits: 0,
    misses: 0,
    wrongTaps: 0,
    totalNotes: 0,
    maxStreak: 0,
    accuracyRate: 0,
  });

  const [progressPercent, setProgressPercent] = useState(0);

  // Canvas & Audio Engine References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const feedbackCounterRef = useRef(1);

  const engineRef = useRef<{
    startTimeAudioCtx: number;
    songStartTimePerf: number;
    track: SongTrack;
    notes: (SongNote & { hit?: boolean; missed?: boolean })[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    perfectHits: number;
    greatHits: number;
    goodHits: number;
    misses: number;
    wrongTaps: number;
    maxStreak: number;
    currentCombo: number;
    currentScore: number;
    scheduledBassIndex: number;
    scheduledDrumBeatIndex: number;
    isFinished: boolean;
    leftLaneGlow: number;
    rightLaneGlow: number;
  }>({
    startTimeAudioCtx: 0,
    songStartTimePerf: 0,
    track: SONG_TRACKS[0],
    notes: [],
    particles: [],
    floatingTexts: [],
    perfectHits: 0,
    greatHits: 0,
    goodHits: 0,
    misses: 0,
    wrongTaps: 0,
    maxStreak: 0,
    currentCombo: 0,
    currentScore: 0,
    scheduledBassIndex: 0,
    scheduledDrumBeatIndex: 0,
    isFinished: false,
    leftLaneGlow: 0,
    rightLaneGlow: 0,
  });

  // Spawn particle sparks at hit position
  const triggerHitSparks = (x: number, y: number, color: string, isPerfect: boolean) => {
    const eng = engineRef.current;
    const count = isPerfect ? 24 : 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isPerfect ? 7 : 4.5) + 2;
      eng.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isPerfect ? 2 : 1),
        color: isPerfect ? (Math.random() > 0.3 ? '#fbbf24' : '#ffffff') : color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        maxLife: Math.random() * 0.3 + 0.25,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, subtext?: string) => {
    engineRef.current.floatingTexts.push({
      id: feedbackCounterRef.current++,
      x,
      y,
      text,
      subtext,
      color,
      life: 1.0,
    });
  };

  // Start Song
  const handleStartTrack = (trackToPlay: SongTrack) => {
    const audioCtx = sounds.getAudioContext();
    if (!audioCtx) return;

    sounds.playGameStart();

    const nowAudio = audioCtx.currentTime;
    const nowPerf = performance.now();

    engineRef.current = {
      startTimeAudioCtx: nowAudio,
      songStartTimePerf: nowPerf,
      track: trackToPlay,
      notes: trackToPlay.notes.map((n) => ({ ...n, hit: false, missed: false })),
      particles: [],
      floatingTexts: [],
      perfectHits: 0,
      greatHits: 0,
      goodHits: 0,
      misses: 0,
      wrongTaps: 0,
      maxStreak: 0,
      currentCombo: 0,
      currentScore: 0,
      scheduledBassIndex: 0,
      scheduledDrumBeatIndex: 0,
      isFinished: false,
      leftLaneGlow: 0,
      rightLaneGlow: 0,
    };

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setProgressPercent(0);
    setGameState('playing');
  };

  // Process Lane Tap (Left Arrow: Lane 0, Right Arrow: Lane 1)
  const handleTapLane = useCallback((laneIndex: 0 | 1) => {
    if (gameState !== 'playing') return;

    const eng = engineRef.current;
    if (eng.isFinished) return;

    const audioCtx = sounds.getAudioContext();
    if (!audioCtx) return;

    const currentSongTime = audioCtx.currentTime - eng.startTimeAudioCtx;

    // Trigger visual lane glow pulse
    if (laneIndex === 0) eng.leftLaneGlow = 1.0;
    else eng.rightLaneGlow = 1.0;

    setActiveLanePress({ lane: laneIndex, time: Date.now() });

    // Look for unhit notes in this lane within reasonable window
    const candidateNotes = eng.notes.filter(
      (n) => !n.hit && !n.missed && n.lane === laneIndex
    );

    let closestNote: (SongNote & { hit?: boolean; missed?: boolean }) | null = null;
    let minDiffSec = Infinity;

    for (const note of candidateNotes) {
      const diff = Math.abs(currentSongTime - note.time);
      if (diff < minDiffSec) {
        minDiffSec = diff;
        closestNote = note;
      }
    }

    const diffMs = Math.round(minDiffSec * 1000);
    const canvas = canvasRef.current;
    const laneX = canvas ? (laneIndex === 0 ? canvas.width * 0.28 : canvas.width * 0.72) : (laneIndex === 0 ? 180 : 420);
    const hitY = canvas ? canvas.height * 0.84 : 400;

    // Evaluate Hit Accuracy
    if (closestNote && diffMs <= HIT_WINDOW_MS) {
      closestNote.hit = true;
      const isEarly = currentSongTime < closestNote.time;
      const timingLabel = `${isEarly ? '-' : '+'}${diffMs}ms`;

      // 1. PERFECT HIT (<= 45ms)
      if (diffMs <= 45) {
        eng.perfectHits++;
        eng.currentCombo++;
        if (eng.currentCombo > eng.maxStreak) eng.maxStreak = eng.currentCombo;

        const comboBonus = Math.min(eng.currentCombo * 15, 300);
        const pts = 250 + comboBonus;
        eng.currentScore += pts;

        sounds.playNoteHitChime(closestNote.freq, true);
        sounds.playMelodyNote(closestNote.freq, closestNote.duration, undefined, true);
        triggerHitSparks(laneX, hitY, '#38bdf8', true);

        addFloatingText(laneX, hitY - 30, `🌟 PERFECT! +${pts}`, '#38bdf8', `Exact Beat: ${timingLabel}`);

        if (eng.currentCombo % 10 === 0 && eng.currentCombo > 0) {
          confetti({ particleCount: 30, spread: 55, origin: { y: 0.75 } });
        }
      }
      // 2. GREAT HIT (<= 90ms)
      else if (diffMs <= 90) {
        eng.greatHits++;
        eng.currentCombo++;
        if (eng.currentCombo > eng.maxStreak) eng.maxStreak = eng.currentCombo;

        const comboBonus = Math.min(eng.currentCombo * 10, 200);
        const pts = 150 + comboBonus;
        eng.currentScore += pts;

        sounds.playNoteHitChime(closestNote.freq, false);
        sounds.playMelodyNote(closestNote.freq, closestNote.duration, undefined, false);
        triggerHitSparks(laneX, hitY, '#f43f5e', false);

        addFloatingText(laneX, hitY - 30, `✨ GREAT! +${pts}`, '#f43f5e', `Offset: ${timingLabel}`);
      }
      // 3. GOOD HIT (<= 160ms)
      else {
        eng.goodHits++;
        eng.currentCombo++;
        if (eng.currentCombo > eng.maxStreak) eng.maxStreak = eng.currentCombo;

        const pts = 75;
        eng.currentScore += pts;

        sounds.playMelodyNote(closestNote.freq, closestNote.duration, undefined, false);
        triggerHitSparks(laneX, hitY, '#a855f7', false);

        addFloatingText(laneX, hitY - 30, `👍 GOOD! +${pts}`, '#c084fc', `Offset: ${timingLabel}`);
      }

      setScore(Math.max(0, eng.currentScore));
      setCombo(eng.currentCombo);
      setMaxCombo(eng.maxStreak);
    } else {
      // WRONG HIT / EMPTY TAP (Tapped with no note near target line)
      eng.wrongTaps++;
      eng.currentCombo = 0;
      eng.currentScore = Math.max(0, eng.currentScore - 60);

      sounds.playMissThud();
      addFloatingText(laneX, hitY - 20, `⚠️ WRONG TAP! -60`, '#fb7185', 'No note near beat line');

      setScore(eng.currentScore);
      setCombo(0);
    }
  }, [gameState]);

  // Keyboard controls: Left Arrow -> Left Lane (0), Right Arrow -> Right Lane (1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handleTapLane(0);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleTapLane(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleTapLane]);

  // Main Canvas Render & Audio Synchronization Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;

      const audioCtx = sounds.getAudioContext();
      const eng = engineRef.current;

      if (audioCtx) {
        const currentSongTime = audioCtx.currentTime - eng.startTimeAudioCtx;
        const totalDuration = eng.track.duration;

        // Update progress bar
        const progress = Math.min(100, (currentSongTime / totalDuration) * 100);
        setProgressPercent(progress);

        // 1. Live Accompaniment Audio Scheduling (Bass chords & Drums on the beat)
        const bpm = eng.track.bpm;
        const beatSec = 60 / bpm;

        // Schedule Drum beats (Kick on 1 & 3, Hi-hat on 2 & 4)
        const currentBeatIndex = Math.floor(currentSongTime / beatSec);
        while (eng.scheduledDrumBeatIndex <= currentBeatIndex + 1 && eng.scheduledDrumBeatIndex * beatSec < totalDuration) {
          const beatTime = eng.startTimeAudioCtx + eng.scheduledDrumBeatIndex * beatSec;
          if (eng.scheduledDrumBeatIndex % 2 === 0) {
            sounds.playKickDrum(beatTime);
          } else {
            sounds.playHiHat(beatTime);
          }
          eng.scheduledDrumBeatIndex++;
        }

        // Schedule Bass Chords
        while (eng.scheduledBassIndex < eng.track.bassChords.length) {
          const chord = eng.track.bassChords[eng.scheduledBassIndex];
          if (chord.time <= currentSongTime + 0.1) {
            const chordStartTime = eng.startTimeAudioCtx + chord.time;
            sounds.playBassSynth(chord.bassFreq, chord.duration, chordStartTime);
            eng.scheduledBassIndex++;
          } else {
            break;
          }
        }

        // Check for missed notes that fell past the bottom target line without being hit
        eng.notes.forEach((note) => {
          if (!note.hit && !note.missed) {
            // If note is more than 160ms past the target line
            if (currentSongTime > note.time + (HIT_WINDOW_MS / 1000)) {
              note.missed = true;
              eng.misses++;
              eng.currentCombo = 0;
              eng.currentScore = Math.max(0, eng.currentScore - 80);

              const laneX = note.lane === 0 ? canvas.width * 0.28 : canvas.width * 0.72;
              const hitY = canvas.height * 0.84;

              sounds.playMissThud();
              addFloatingText(laneX, hitY - 20, `❌ MISS! -80`, '#f43f5e', 'Passed target line');

              setScore(eng.currentScore);
              setCombo(0);
            }
          }
        });

        // Check track finish
        if (currentSongTime >= totalDuration && !eng.isFinished) {
          eng.isFinished = true;
          setTimeout(() => {
            handleFinishGame();
          }, 600);
        }

        // 2. CANVAS DRAWING
        const w = canvas.width;
        const h = canvas.height;
        const targetLineY = h * 0.84;
        const laneWidth = w * 0.44;
        const lane0CenterX = w * 0.28;
        const lane1CenterX = w * 0.72;

        ctx.clearRect(0, 0, w, h);

        // Background Cyber Highway Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#030712');
        bgGrad.addColorStop(0.7, '#0b0f19');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Highway Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // --- LANE 0 (LEFT LANE - CYAN) ---
        const lane0Glow = eng.leftLaneGlow;
        ctx.save();
        ctx.fillStyle = lane0Glow > 0 ? `rgba(6, 182, 212, ${0.05 + lane0Glow * 0.2})` : 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(w * 0.06, 0, laneWidth, h);
        ctx.strokeStyle = lane0Glow > 0 ? `rgba(6, 182, 212, ${0.4 + lane0Glow * 0.6})` : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.06, 0, laneWidth, h);
        ctx.restore();

        // --- LANE 1 (RIGHT LANE - ROSE) ---
        const lane1Glow = eng.rightLaneGlow;
        ctx.save();
        ctx.fillStyle = lane1Glow > 0 ? `rgba(244, 63, 94, ${0.05 + lane1Glow * 0.2})` : 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(w * 0.50, 0, laneWidth, h);
        ctx.strokeStyle = lane1Glow > 0 ? `rgba(244, 63, 94, ${0.4 + lane1Glow * 0.6})` : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.50, 0, laneWidth, h);
        ctx.restore();

        // Decay Lane Glows
        eng.leftLaneGlow = Math.max(0, eng.leftLaneGlow - 0.08);
        eng.rightLaneGlow = Math.max(0, eng.rightLaneGlow - 0.08);

        // Center Track Divider
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        ctx.lineTo(w * 0.5, h);
        ctx.stroke();
        ctx.restore();

        // --- BOTTOM TARGET HIT LINE ---
        // EXACT SYNC: When note.time === currentSongTime, the block touches this line!
        ctx.save();
        const pulse = Math.sin(performance.now() * 0.01) * 0.2 + 0.8;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12 * pulse;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * pulse})`;
        ctx.lineWidth = 4;

        // Target Line across both lanes
        ctx.beginPath();
        ctx.moveTo(w * 0.04, targetLineY);
        ctx.lineTo(w * 0.96, targetLineY);
        ctx.stroke();

        // Left Hit Zone Target Box
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(lane0CenterX - 70, targetLineY - 24, 140, 48, 12);
        ctx.fill();
        ctx.stroke();

        // Right Hit Zone Target Box
        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(lane1CenterX - 70, targetLineY - 24, 140, 48, 12);
        ctx.fill();
        ctx.stroke();

        // Target Key Label Glyphs
        ctx.font = '900 13px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#38bdf8';
        ctx.fillText('← LEFT ARROW', lane0CenterX, targetLineY + 1);

        ctx.fillStyle = '#fda4af';
        ctx.fillText('RIGHT ARROW →', lane1CenterX, targetLineY + 1);

        ctx.restore();

        // --- DRAW FALLING RHYTHM NOTE BLOCKS ---
        // Visual formula: Progress is 0 at top (currentSongTime = note.time - FALL_DURATION)
        // Progress is 1.0 (at targetLineY) at exact note.time!
        eng.notes.forEach((note) => {
          if (note.hit) return;

          const timeUntilHit = note.time - currentSongTime;
          // Only draw notes that are within fall horizon
          if (timeUntilHit <= FALL_DURATION && timeUntilHit >= -0.25) {
            const progress = (FALL_DURATION - timeUntilHit) / FALL_DURATION;
            const blockHeight = Math.max(34, note.duration * 50);
            const blockWidth = laneWidth * 0.82;
            const blockX = note.lane === 0 ? lane0CenterX - blockWidth / 2 : lane1CenterX - blockWidth / 2;
            const blockBottomY = progress * targetLineY;
            const blockTopY = blockBottomY - blockHeight;

            const isAccent = note.isAccent;
            const isLeft = note.lane === 0;

            ctx.save();
            // Block Neon Glow
            ctx.shadowColor = isLeft ? '#06b6d4' : '#f43f5e';
            ctx.shadowBlur = isAccent ? 16 : 8;

            // Block Fill Gradient
            const blockGrad = ctx.createLinearGradient(0, blockTopY, 0, blockBottomY);
            if (isLeft) {
              blockGrad.addColorStop(0, isAccent ? '#38bdf8' : '#0284c7');
              blockGrad.addColorStop(1, isAccent ? '#bae6fd' : '#38bdf8');
            } else {
              blockGrad.addColorStop(0, isAccent ? '#fb7185' : '#e11d48');
              blockGrad.addColorStop(1, isAccent ? '#fecdd3' : '#fb7185');
            }

            ctx.fillStyle = blockGrad;
            ctx.beginPath();
            ctx.roundRect(blockX, blockTopY, blockWidth, blockHeight, 10);
            ctx.fill();

            // Block Inner Highlight border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = isAccent ? 2.5 : 1.5;
            ctx.stroke();

            // Note Name / Piano Icon
            ctx.font = 'bold 12px "Chakra Petch", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              isAccent ? `⚡ ${note.noteName}` : note.noteName,
              blockX + blockWidth / 2,
              blockTopY + blockHeight / 2
            );

            ctx.restore();
          }
        });

        // --- DRAW PARTICLES ---
        eng.particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // subtle gravity
          p.life -= 0.035;

          if (p.life > 0) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            eng.particles.splice(idx, 1);
          }
        });

        // --- DRAW FLOATING HIT FEEDBACK TEXTS ---
        eng.floatingTexts.forEach((ft, idx) => {
          ft.y -= 1.2;
          ft.life -= 0.025;

          if (ft.life > 0) {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 14px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 6;
            ctx.fillText(ft.text, ft.x, ft.y);

            if (ft.subtext) {
              ctx.font = '600 10px "Space Grotesk", sans-serif';
              ctx.fillStyle = '#e2e8f0';
              ctx.fillText(ft.subtext, ft.x, ft.y + 14);
            }
            ctx.restore();
          } else {
            eng.floatingTexts.splice(idx, 1);
          }
        });
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState]);

  // Finish Game & Compute Final Single Composite Score
  const handleFinishGame = () => {
    const eng = engineRef.current;
    sounds.playLevelUp();
    confetti({ particleCount: 80, spread: 75, origin: { y: 0.55 } });

    const totalNotesCount = eng.notes.length;
    const totalHitCount = eng.perfectHits + eng.greatHits + eng.goodHits;
    const accuracy = totalNotesCount > 0 ? Math.round((totalHitCount / totalNotesCount) * 100) : 0;

    // Single Composite Score Engine Calculation
    // Base score accumulated + Streak Bonus + Accuracy Multiplier
    const rawScore = eng.currentScore;
    const streakBonus = eng.maxStreak * 25;
    const cleanAccuracyBonus = accuracy >= 90 ? 1500 : accuracy >= 80 ? 800 : 0;
    const singleCompositeScore = Math.max(0, rawScore + streakBonus + cleanAccuracyBonus);

    setStats({
      perfectHits: eng.perfectHits,
      greatHits: eng.greatHits,
      goodHits: eng.goodHits,
      misses: eng.misses,
      wrongTaps: eng.wrongTaps,
      totalNotes: totalNotesCount,
      maxStreak: eng.maxStreak,
      accuracyRate: accuracy,
    });

    setScore(singleCompositeScore);
    setMaxCombo(eng.maxStreak);
    setGameState('gameover');

    const earnedXp = Math.round(singleCompositeScore * 0.3) + 150;
    const earnedCoins = Math.round(singleCompositeScore * 0.08) + 40;
    onUpdateScore('music-matrix', singleCompositeScore, earnedXp, earnedCoins);

    const record = recordGameScore(
      'music-matrix',
      profile,
      singleCompositeScore,
      `${selectedTrack.title} • ${accuracy}% Acc`
    );
    setPlayerRank(record.rank);
  };

  // Rank Determination
  const getRankBadge = () => {
    if (stats.accuracyRate >= 95 && stats.misses === 0) {
      return { rank: 'S', title: 'SYNTH MAESTRO', color: 'text-amber-300 border-amber-400 bg-amber-500/20' };
    }
    if (stats.accuracyRate >= 85) {
      return { rank: 'A+', title: 'VIRTUOSO HITTER', color: 'text-cyan-300 border-cyan-400 bg-cyan-500/20' };
    }
    if (stats.accuracyRate >= 70) {
      return { rank: 'A', title: 'RHYTHM PILOT', color: 'text-emerald-300 border-emerald-400 bg-emerald-500/20' };
    }
    if (stats.accuracyRate >= 50) {
      return { rank: 'B', title: 'BEAT APPRENTICE', color: 'text-fuchsia-300 border-fuchsia-400 bg-fuchsia-500/20' };
    }
    return { rank: 'C', title: 'RHYTHM NOVICE', color: 'text-slate-300 border-slate-500 bg-slate-800/50' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHub();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-cyber text-xs tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO HUB</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/30">
            🎹
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black font-cyber text-cyan-300 tracking-wider">
              MUSIC MATRIX
            </h1>
            <span className="text-[11px] text-slate-400 font-cyber flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              2-Lane Beat Synchronizer • {selectedTrack.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-cyber text-xs sm:text-sm">
          <button
            id="music-matrix-leaderboard-btn"
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

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-amber-300 font-bold shadow-inner">
            SCORE: {score.toLocaleString()}
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
            🔥 {combo}x
          </div>
        </div>
      </div>

      {/* 1. READY SCREEN - SONG SELECTOR */}
      {gameState === 'ready' && (
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/40 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/40 animate-pulse">
              🎹
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">
              SELECT YOUR FAMOUS INSTRUMENTAL TRACK
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto font-body leading-relaxed">
              Tiles fall across <strong className="text-cyan-300">2 lanes (Left & Right)</strong>. Exactly as the beat drops and hits the bottom line, press{' '}
              <strong className="text-amber-300 font-bold">[← Left Arrow]</strong> or <strong className="text-amber-300 font-bold">[Right Arrow →]</strong>!
            </p>
          </div>

          {/* Track Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
            {SONG_TRACKS.map((track) => {
              const isSelected = selectedTrack.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedTrack(track);
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-[1.02]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{track.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-cyber font-bold text-white text-sm">
                          {track.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-cyber font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {track.bpm} BPM
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-body mt-0.5">
                        {track.composer} • {track.difficulty}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Controls & Scoring Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-center font-cyber">
            <div className="p-3 rounded-2xl bg-black/40 border border-cyan-500/30">
              <span className="text-cyan-400 text-xs font-bold block">Left Lane Control</span>
              <span className="text-sm font-black text-white mt-1 block">← Left Arrow / Tap</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Hit cyan falling tiles</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-fuchsia-500/30">
              <span className="text-rose-400 text-xs font-bold block">Right Lane Control</span>
              <span className="text-sm font-black text-white mt-1 block">Right Arrow → / Tap</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Hit rose falling tiles</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="text-amber-400 text-xs font-bold block">Composite Scoring</span>
              <span className="text-sm font-black text-white mt-1 block">+250 Hit / -80 Miss</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Single Final Score output</span>
            </div>
          </div>

          {/* Start Action */}
          <div className="text-center pt-2">
            <button
              onClick={() => handleStartTrack(selectedTrack)}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-cyber font-black text-base uppercase tracking-wider shadow-2xl shadow-cyan-500/40 transform hover:-translate-y-0.5 transition-all cursor-pointer inline-flex items-center gap-3"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>PLAY {selectedTrack.title.toUpperCase()}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. PLAYING SCREEN - 2-LANE HIGHWAY CANVAS */}
      {gameState === 'playing' && (
        <div className="relative rounded-3xl bg-slate-950 border-2 border-cyan-500/40 p-4 shadow-2xl max-w-2xl mx-auto space-y-3">
          {/* Progress Bar & Live Status */}
          <div className="flex items-center justify-between px-2 text-xs font-cyber text-slate-300">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="font-bold text-white">{selectedTrack.title}</span>
              <span className="text-slate-400 text-[10px]">({selectedTrack.bpm} BPM)</span>
            </div>

            <div className="flex items-center gap-3">
              {combo >= 10 && (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-[10px] animate-pulse">
                  FEVER MODE 🔥
                </span>
              )}
              <span className="text-cyan-300 font-bold">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          {/* Song Progress Track */}
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 2-Lane Synchronized Highway Canvas */}
          <div className="relative w-full aspect-[4/3] max-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <canvas
              ref={canvasRef}
              width={560}
              height={460}
              className="w-full h-full block"
            />
          </div>

          {/* Large On-Screen Responsive Lane Buttons (Touch & Click Friendly) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleTapLane(0)}
              className={`py-4 px-4 rounded-2xl border-2 font-cyber font-black text-sm tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                activeLanePress?.lane === 0
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-xl shadow-cyan-500/50 scale-[0.98]'
                  : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400'
              }`}
            >
              <ArrowLeftCircle className="w-5 h-5" />
              <span>LEFT LANE [←]</span>
            </button>

            <button
              onClick={() => handleTapLane(1)}
              className={`py-4 px-4 rounded-2xl border-2 font-cyber font-black text-sm tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                activeLanePress?.lane === 1
                  ? 'bg-rose-500 text-white border-rose-300 shadow-xl shadow-rose-500/50 scale-[0.98]'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40 hover:border-rose-400'
              }`}
            >
              <span>RIGHT LANE [→]</span>
              <ArrowRightCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. GAME OVER SCREEN - SINGLE COMPOSITE SCORE METRIC */}
      {gameState === 'gameover' && (
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border-2 border-cyan-500/50 shadow-2xl text-center space-y-6 max-w-2xl mx-auto">
          {/* Trophy Header */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-cyan-500 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30 animate-bounce">
            🏆
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-cyber font-black border ${getRankBadge().color}`}>
                RANK {getRankBadge().rank} • {getRankBadge().title}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white mt-2">
              TRACK COMPLETE! RHYTHM MASTERED
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Outstanding synth synchronization, <span className="text-cyan-300 font-bold">{profile.name}</span>!
            </p>
          </div>

          {/* SINGLE COMPOSITE SCORE HERO DISPLAY */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-amber-500/40 shadow-2xl max-w-md mx-auto space-y-2">
            <span className="text-[11px] font-cyber text-amber-400 uppercase tracking-widest block font-bold">
              ★ SINGLE COMPOSITE SCORE ★
            </span>
            <div className="text-4xl sm:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
              {score.toLocaleString()} <span className="text-xl text-amber-400">PTS</span>
            </div>
            <span className="text-xs text-slate-400 font-body block">
              Evaluated from precision timing, beat sync %, combo chains, & penalties
            </span>
          </div>

          {/* Performance Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto font-cyber text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30">
              <span className="text-cyan-400 text-[10px] block">PERFECT (&lt;45ms)</span>
              <span className="text-lg font-black text-white mt-0.5 block">{stats.perfectHits}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-fuchsia-500/30">
              <span className="text-fuchsia-400 text-[10px] block">GREAT (&lt;90ms)</span>
              <span className="text-lg font-black text-white mt-0.5 block">{stats.greatHits}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30">
              <span className="text-amber-400 text-[10px] block">MAX COMBO</span>
              <span className="text-lg font-black text-white mt-0.5 block">{stats.maxStreak}x</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30">
              <span className="text-rose-400 text-[10px] block">MISSES / WRONG</span>
              <span className="text-lg font-black text-rose-300 mt-0.5 block">{stats.misses + stats.wrongTaps}</span>
            </div>
          </div>

          {/* Rewards Pill */}
          <div className="flex justify-center gap-4 text-xs font-cyber">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              +{Math.round(score * 0.3) + 150} XP EARNED
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              +{Math.round(score * 0.08) + 40} COINS
            </div>
          </div>

          {/* Brain Power Unlocked Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 text-left space-y-4 shadow-xl max-w-xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-cyber">
                🧠 BRAIN POWER UNLOCKED: MULTISENSORY TIME PERCEPTION
              </span>
              <span className="text-xs font-mono-tag text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sound + Sight + Touch Sync</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white uppercase font-cyber tracking-tight">
              Wait... Why Did We Play This? How Does Your Brain Measure Time?
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-body">
              {/* Concept Card 1: The Three Senses Working Together */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>🎵 + 👁️ + 👆</span>
                  <span>1. The 3-Way Sensory Symphony:</span>
                </div>
                <p>
                  Your brain doesn&apos;t have a mechanical clock or stopwatch inside your head. Instead, it measures time by <strong className="text-white font-semibold">fusing three different senses at once</strong>:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300 text-xs">
                  <li><strong className="text-amber-300 font-semibold">Sound (Ears):</strong> Hearing the beat gives your brain an invisible metronome. Sound travels to your brain faster than sight!</li>
                  <li><strong className="text-cyan-300 font-semibold">Visual (Eyes):</strong> Watching the neon tile fall tells your eyes the distance and speed.</li>
                  <li><strong className="text-pink-300 font-semibold">Touch (Fingers):</strong> Tapping the screen or key gives physical feedback at the exact millisecond of impact.</li>
                </ul>
              </div>

              {/* Concept Card 2: Guiding Time Perception */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="font-cyber font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>2. How Sync Guides Your Perception of Time:</span>
                </div>
                <p>
                  When sound, touch, and sight fire together in harmony, your brain can predict the future! You don&apos;t wait until the tile crosses the line to react—your auditory rhythm guides your fingers to strike <strong className="text-white font-semibold">before</strong> it even hits. Sound anchored your sense of time, vision showed the target, and touch locked the groove!
                </p>
              </div>

              {/* Concept Card 3: Real world connection */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
                <span className="font-cyber font-bold text-emerald-300 text-xs block mb-1">
                  🌟 Your Real-Life Brain Superpower:
                </span>
                <p className="text-xs">
                  This 3-way synchronization is what allows drummers, pianists, dancers, and video gamers to enter the &quot;flow state.&quot; When sound, vision, and touch lock into sync, time feels smooth and effortless!
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="view-leaderboard-music-btn"
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
              onClick={() => handleStartTrack(selectedTrack)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-cyber font-bold text-sm tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>REPLAY TRACK</span>
            </button>
            <button
              onClick={() => setGameState('ready')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-cyber font-bold text-sm tracking-wider cursor-pointer"
            >
              SELECT TRACK
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onBackToHub();
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-cyber font-bold text-sm tracking-wider cursor-pointer"
            >
              RETURN TO HUB
            </button>
          </div>
        </div>
      )}

      {/* 3. DEDICATED LEADERBOARD SCREEN */}
      {gameState === 'leaderboard' && (
        <div className="bg-[#0f172a] rounded-3xl border border-white/15 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="music-matrix"
            profile={profile}
            onClose={() => setGameState('gameover')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'music-matrix' && onSelectGame) {
                onSelectGame(targetGameId);
              } else {
                handleStartTrack(selectedTrack);
              }
            }}
            isEmbeddedInGame={true}
          />
        </div>
      )}
    </div>
  );
};
