import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { ChibiBlowfish, BlowfishEmotion } from './ChibiBlowfish';
import { DeepSeaBackground } from './DeepSeaBackground';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Trophy,
  CheckCircle2,
  XCircle,
  Wind,
  Shield,
  Search,
  Compass,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LearnToBreatheProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'learn-to-breathe', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

export type EmotionKey = 'joy' | 'anger' | 'fear' | 'sadness';

interface EmotionTrialConfig {
  key: EmotionKey;
  name: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  inhaleDuration: number;
  exhaleDuration: number;
  minScale: number;
  maxScale: number;
  instructionQuote: string;
  mindBodyTip: string;
  visualQuirk: string;
}

const EMOTION_CONFIGS: Record<EmotionKey, EmotionTrialConfig> = {
  joy: {
    key: 'joy',
    name: 'Joy',
    badgeName: 'Golden Sunburst Fish',
    badgeIcon: '☀️ 🐠',
    badgeColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400',
    inhaleDuration: 4.0,
    exhaleDuration: 4.0,
    minScale: 0.85,
    maxScale: 1.28,
    instructionQuote:
      '‘‘Breathe and exhale slowly and deeply through the nose; your breathing is very regular and your ribcage relaxed.’’',
    mindBodyTip:
      'Deep, steady breaths stimulate the vagus nerve, releasing muscular tension in your chest and filling your body with calm joy.',
    visualQuirk: 'Smooth sinusoidal expansion with smiling eyes & sunny golden aura.',
  },
  anger: {
    key: 'anger',
    name: 'Anger',
    badgeName: 'Fiery Coral',
    badgeIcon: '🔥 🪸',
    badgeColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-400',
    inhaleDuration: 1.5,
    exhaleDuration: 1.5,
    minScale: 0.88,
    maxScale: 1.36,
    instructionQuote:
      '‘‘Breathe and exhale quickly through the nose; slightly deeper than regular breathing amplitude. Your breathing is slightly irregular with some tremors and your ribcage is very tense.’’',
    mindBodyTip:
      'Anger pumps adrenaline, causing forceful, rapid nose breathing and chest tension with micro-tremors.',
    visualQuirk: 'Fast, forceful inflation with peak micro-jitters & furrowed brows.',
  },
  fear: {
    key: 'fear',
    name: 'Fear',
    badgeName: 'Shivering Jellyfish',
    badgeIcon: '⚡ 🪼',
    badgeColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-400',
    inhaleDuration: 1.0,
    exhaleDuration: 1.0,
    minScale: 0.90,
    maxScale: 1.18,
    instructionQuote:
      '‘‘Breathe and exhale quickly from the top of your ribcage; with a normal amplitude. Your breathing is slightly irregular with some tremors and your ribcage very tense.’’',
    mindBodyTip:
      'Fear triggers rapid, shallow upper-chest gasping and full-body shivers in high-alert survival mode.',
    visualQuirk: 'Rapid shallow breathing with continuous horizontal tremors & wide fearful gaze.',
  },
  sadness: {
    key: 'sadness',
    name: 'Sadness',
    badgeName: 'Raindrop Shell',
    badgeIcon: '💧 🐚',
    badgeColor: 'text-blue-300',
    badgeBg: 'bg-blue-500/20',
    badgeBorder: 'border-blue-400',
    inhaleDuration: 3.0,
    exhaleDuration: 4.5,
    minScale: 0.82,
    maxScale: 1.20,
    instructionQuote:
      '‘‘Breathe and exhale through the nose with a normal amplitude and pace. Your ribcage is slightly tense, and there are some sighs in your expiration.’’',
    mindBodyTip:
      'Sadness creates a heavy chest and leads to prolonged, stepped sighing exhalations as the body releases grief.',
    visualQuirk: 'Gentle inhale followed by a stepped, sinking "sigh" deflation.',
  },
};

const TRIAL_KEYS: EmotionKey[] = ['joy', 'anger', 'fear', 'sadness'];

export const LearnToBreathe: React.FC<LearnToBreatheProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  // Game Lifecycle: 'ready' | 'intro' | 'breathing' | 'choice' | 'reflection' | 'gameover' | 'leaderboard'
  const [gameState, setGameState] = useState<
    'ready' | 'intro' | 'breathing' | 'choice' | 'reflection' | 'gameover' | 'leaderboard'
  >('ready');
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // Randomize the 4 trials on game start
  const [trialsOrder, setTrialsOrder] = useState<EmotionKey[]>(() => {
    return [...TRIAL_KEYS].sort(() => Math.random() - 0.5);
  });

  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);

  // 3s Intro Countdown
  const [introSecondsLeft, setIntroSecondsLeft] = useState(3);

  // 30s Breathing Phase State
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(30);
  const [currentScale, setCurrentScale] = useState(1.0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [breathPercent, setBreathPercent] = useState(0);
  const [isTrembling, setIsTrembling] = useState(false);
  const [verticalDip, setVerticalDip] = useState(0);

  // Multiple Choice Selection & Results History
  const [selectedChoice, setSelectedChoice] = useState<EmotionKey | null>(null);
  const [trialResults, setTrialResults] = useState<
    {
      trialIndex: number;
      actualEmotion: EmotionKey;
      guessedEmotion: EmotionKey;
      isCorrect: boolean;
    }[]
  >([]);

  const currentEmotionKey = trialsOrder[currentTrialIndex] || 'joy';
  const currentConfig = EMOTION_CONFIGS[currentEmotionKey];

  // Start the entire 4-trial detective mission
  const handleStartGame = () => {
    // Shuffle all 4 emotions
    const shuffled = [...TRIAL_KEYS].sort(() => Math.random() - 0.5);
    setTrialsOrder(shuffled);
    setCurrentTrialIndex(0);
    setTrialResults([]);
    sounds.playGameStart();
    startTrial(0, shuffled[0]);
  };

  // Launch a specific trial
  const startTrial = (trialIdx: number, emotionKey: EmotionKey) => {
    setCurrentTrialIndex(trialIdx);
    setSelectedChoice(null);
    setIntroSecondsLeft(3);
    setGameState('intro');
    sounds.playOceanBubble();
  };

  // 1. Intro Countdown (3s) -> Transitions into 30s Breathing
  useEffect(() => {
    if (gameState !== 'intro') return;

    const timer = setInterval(() => {
      setIntroSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Transition to 30s breathing phase
          setBreathSecondsLeft(30);
          setGameState('breathing');
          sounds.playZenChime(528);
          return 0;
        }
        sounds.playClick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // 2. Main 30-Second Breathing Simulation Loop
  useEffect(() => {
    if (gameState !== 'breathing') return;

    let animFrameId: number;
    let startTime = performance.now();
    let lastSecondReported = 30;
    let lastPhase: 'inhale' | 'exhale' = 'inhale';

    const {
      inhaleDuration,
      exhaleDuration,
      minScale,
      maxScale,
      key,
    } = currentConfig;

    const totalCycleTime = inhaleDuration + exhaleDuration;

    // Trigger initial breath audio
    sounds.playInhaleSwell(inhaleDuration);

    const updateBreathing = (now: number) => {
      const elapsedTotalSec = (now - startTime) / 1000;
      const remainingSec = Math.max(0, 30 - elapsedTotalSec);
      const roundedSec = Math.ceil(remainingSec);

      if (roundedSec !== lastSecondReported && roundedSec >= 0) {
        lastSecondReported = roundedSec;
        setBreathSecondsLeft(roundedSec);
        if (roundedSec % 5 === 0 && roundedSec > 0) {
          sounds.playOceanBubble();
        }
      }

      // Check if 30s trial has elapsed
      if (elapsedTotalSec >= 30) {
        sounds.playZenChime(639);
        setGameState('choice');
        return;
      }

      // Current position within the looping breathing cycle
      const cycleTime = elapsedTotalSec % totalCycleTime;

      if (cycleTime < inhaleDuration) {
        // INHALE PHASE
        const t = cycleTime / inhaleDuration;
        // Inhale easing
        const smoothT = Math.sin((t * Math.PI) / 2);
        const scaleVal = minScale + (maxScale - minScale) * smoothT;
        setCurrentScale(scaleVal);
        setBreathPhase('inhale');
        setBreathPercent(Math.round(t * 100));
        setVerticalDip(0);

        // Sound trigger on phase change
        if (lastPhase !== 'inhale') {
          lastPhase = 'inhale';
          sounds.playInhaleSwell(inhaleDuration);
        }

        // Anger peak micro-tremors
        if (key === 'anger' && t > 0.65) {
          setIsTrembling(true);
        } else if (key === 'fear') {
          setIsTrembling(true);
        } else {
          setIsTrembling(false);
        }
      } else {
        // EXHALE PHASE
        const t = (cycleTime - inhaleDuration) / exhaleDuration;
        setBreathPhase('exhale');
        setBreathPercent(Math.round(t * 100));

        // Sound trigger on phase change
        if (lastPhase !== 'exhale') {
          lastPhase = 'exhale';
          sounds.playExhaleRelease(exhaleDuration);
        }

        if (key === 'sadness') {
          // Sadness "Sigh" with stepped sinking drop
          const sighEase = Math.pow(t, 1.4);
          const scaleVal = maxScale - (maxScale - minScale) * sighEase;
          setCurrentScale(scaleVal);
          // Downward body dip on sigh
          setVerticalDip(Math.sin(t * Math.PI) * 16);
          setIsTrembling(false);
        } else if (key === 'fear') {
          const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
          const scaleVal = maxScale - (maxScale - minScale) * smoothT;
          setCurrentScale(scaleVal);
          setIsTrembling(true);
          setVerticalDip(0);
        } else if (key === 'anger') {
          // Snappy rapid exhale
          const snapT = Math.sqrt(t);
          const scaleVal = maxScale - (maxScale - minScale) * snapT;
          setCurrentScale(scaleVal);
          setIsTrembling(t < 0.3);
          setVerticalDip(0);
        } else {
          // Joy smooth sinusoidal return
          const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
          const scaleVal = maxScale - (maxScale - minScale) * smoothT;
          setCurrentScale(scaleVal);
          setIsTrembling(false);
          setVerticalDip(0);
        }
      }

      animFrameId = requestAnimationFrame(updateBreathing);
    };

    animFrameId = requestAnimationFrame(updateBreathing);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, currentConfig]);

  // Handle Player Emotion Choice
  const handleSelectEmotion = (emotionGuess: EmotionKey) => {
    if (gameState !== 'choice') return;

    setSelectedChoice(emotionGuess);
    const isCorrect = emotionGuess === currentEmotionKey;

    if (isCorrect) {
      sounds.playCorrectDeduction();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      sounds.playWrongDeduction();
    }

    const newResult = {
      trialIndex: currentTrialIndex,
      actualEmotion: currentEmotionKey,
      guessedEmotion: emotionGuess,
      isCorrect,
    };

    setTrialResults((prev) => [...prev, newResult]);
    setGameState('reflection');
  };

  // Move to next trial or finish game
  const handleProceedNext = () => {
    sounds.playClick();
    if (currentTrialIndex < 3) {
      const nextIdx = currentTrialIndex + 1;
      startTrial(nextIdx, trialsOrder[nextIdx]);
    } else {
      // Finished all 4 trials
      handleFinishGame();
    }
  };

  // Final Game Over Computation
  const handleFinishGame = () => {
    sounds.playLevelUp();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 },
    });

    const correctCount = trialResults.filter((r) => r.isCorrect).length;
    // Score based on correct deductions (e.g. 400 pts per correct deduction + 400 completion bonus)
    const totalScore = correctCount * 500 + 400;
    const earnedXp = correctCount * 120 + 100;
    const earnedCoins = correctCount * 30 + 25;

    onUpdateScore('learn-to-breathe', totalScore, earnedXp, earnedCoins);

    const record = recordGameScore(
      'learn-to-breathe',
      profile,
      totalScore,
      `${correctCount}/4 Mysteries Solved`
    );
    setPlayerRank(record.rank);

    setGameState('gameover');
  };

  const totalCorrect = useMemo(() => {
    return trialResults.filter((r) => r.isCorrect).length;
  }, [trialResults]);

  // Ocean Detective Rank based on X/4
  const getDetectiveRank = () => {
    if (totalCorrect === 4) {
      return {
        title: 'MASTER DEEP-SEA EMPATH',
        icon: '👑 🌊',
        desc: 'Decoded all 4 emotional respiration patterns with flawless precision!',
        color: 'text-amber-300 border-amber-400 bg-amber-500/20',
      };
    }
    if (totalCorrect === 3) {
      return {
        title: 'OCEAN MIND DETECTIVE',
        icon: '🪼 🔍',
        desc: 'Sharp biofeedback intuition! You decoded 3 of 4 deep-sea mysteries.',
        color: 'text-cyan-300 border-cyan-400 bg-cyan-500/20',
      };
    }
    if (totalCorrect === 2) {
      return {
        title: 'CORAL REEF APPRENTICE',
        icon: '🐠 🌿',
        desc: 'Good effort! You recognized 2 distinct breathing rhythms.',
        color: 'text-emerald-300 border-emerald-400 bg-emerald-500/20',
      };
    }
    return {
      title: 'BUBBLE SCOUT',
      icon: '🫧 🐚',
      desc: 'Keep practicing! Notice how rapid and slow breaths change your feelings.',
      color: 'text-slate-300 border-slate-500 bg-slate-800/50',
    };
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 text-white select-none rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl min-h-[640px] flex flex-col justify-between">
      {/* Deep Sea Animated Canvas Backdrop with swimming fish, bubbles & seabed crabs */}
      <DeepSeaBackground
        emotionTheme={
          gameState === 'breathing' || gameState === 'choice' || gameState === 'reflection'
            ? currentEmotionKey
            : 'neutral'
        }
      />

      {/* Top Header Navigation & Status */}
      <div className="relative z-20 flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-2">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHub();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-200 font-cyber text-xs tracking-wider transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO HUB</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-amber-400 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/30">
            🐡
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-200 tracking-wider">
              AGENT BLOWFISH
            </h1>
            <span className="text-[11px] text-cyan-300/80 font-cyber flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-cyan-400 animate-spin" />
              Uncover Deep Sea Mystery • 4 Emotion Trials
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-cyber text-xs">
          <button
            id="blowfish-leaderboard-btn"
            onClick={() => {
              sounds.playClick();
              setGameState('leaderboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md backdrop-blur-md"
            title="View Global Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">LEADERBOARD</span>
          </button>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-amber-300 font-bold backdrop-blur-md">
            TRIAL {Math.min(4, currentTrialIndex + 1)} / 4
          </div>
        </div>
      </div>

      {/* STAGE 1: READY / MISSION BRIEFING */}
      {gameState === 'ready' && (
        <div className="relative z-20 p-6 sm:p-8 rounded-3xl bg-slate-900/85 backdrop-blur-md border-2 border-cyan-500/40 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-auto">
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <ChibiBlowfish size="md" emotion="neutral" scale={1.05} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-cyber font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              DEEP SEA BIOFEEDBACK DETECTIVE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">
              UNCOVER THE 4 EMOTIONAL MYSTERIES
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto font-body leading-relaxed">
              Agent Blowfish holds the secret to deep ocean emotions. In each of the <strong className="text-cyan-300 font-bold">4 trials</strong>, breathe alongside Agent Blowfish for <strong className="text-amber-300 font-bold">30 seconds</strong>:
            </p>
          </div>

          {/* Breathing Guide Cards */}
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto font-cyber text-xs">
            <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg shrink-0">
                🌬️
              </div>
              <div>
                <span className="text-cyan-300 font-bold block text-[11px]">BLOWFISH EXPANDS</span>
                <span className="text-white font-black text-xs">Inhale Deeply</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-950/60 border border-teal-500/30 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-lg shrink-0">
                💨
              </div>
              <div>
                <span className="text-teal-300 font-bold block text-[11px]">BLOWFISH CONTRACTS</span>
                <span className="text-white font-black text-xs">Exhale Smoothly</span>
              </div>
            </div>
          </div>

          {/* 4 Ocean Badges Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <span className="text-[11px] font-cyber text-slate-400 block font-bold">
              THE 4 OCEAN EMOTION BADGES TO DECODE:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-cyber">
              {TRIAL_KEYS.map((k) => (
                <span
                  key={k}
                  className={`px-3 py-1 rounded-xl border ${EMOTION_CONFIGS[k].badgeBg} ${EMOTION_CONFIGS[k].badgeBorder} ${EMOTION_CONFIGS[k].badgeColor} font-bold flex items-center gap-1.5`}
                >
                  <span>{EMOTION_CONFIGS[k].badgeIcon}</span>
                  <span>{EMOTION_CONFIGS[k].name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Start Mission Button */}
          <div className="pt-2">
            <button
              onClick={handleStartGame}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 hover:from-cyan-400 hover:to-amber-300 text-slate-950 font-cyber font-black text-base uppercase tracking-wider shadow-xl shadow-cyan-500/30 transform hover:-translate-y-0.5 transition-all cursor-pointer inline-flex items-center gap-3"
            >
              <Search className="w-5 h-5 stroke-[2.5]" />
              <span>BEGIN TRIAL 1 (DECODE MYSTERY)</span>
            </button>
          </div>

          {/* Research Scientific Citation */}
          <div className="pt-3 border-t border-slate-800/80">
            <p className="text-[10px] sm:text-[11px] text-cyan-200/40 hover:text-cyan-200/70 font-sans tracking-wide transition-colors leading-relaxed">
              Adapted from: Philippot, P., Chapelle, G., &amp; Blairy, S. (2002). Respiratory feedback in the generation of emotion. <em>Cognition and Emotion</em>, 16(5), 605–627.{' '}
              <a
                href="https://doi.org/10.1080/02699930143000392"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-cyan-300 transition-colors"
              >
                https://doi.org/10.1080/02699930143000392
              </a>
            </p>
          </div>
        </div>
      )}

      {/* STAGE 2: INTRO CUE (3s Countdown) */}
      {gameState === 'intro' && (
        <div className="relative z-20 p-8 rounded-3xl bg-slate-900/80 backdrop-blur-md border-2 border-cyan-500/40 shadow-2xl text-center space-y-6 max-w-md mx-auto my-auto animate-fade-in">
          <div className="flex justify-center">
            <ChibiBlowfish
              size="lg"
              emotion="neutral"
              isWigglingFins={true}
              scale={1.0}
            />
          </div>

          <div className="space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 font-cyber text-xs font-bold border border-cyan-500/40">
              TRIAL {currentTrialIndex + 1} OF 4
            </div>

            <h3 className="text-xl sm:text-2xl font-black font-cyber text-white">
              "Watch my bubbles and breathe with me!"
            </h3>

            <p className="text-slate-300 text-xs sm:text-sm font-body">
              Sync your breath with Agent Blowfish for the next 30 seconds to uncover the hidden emotion!
            </p>
          </div>

          <div className="text-4xl sm:text-5xl font-black font-cyber text-amber-300 animate-pulse">
            {introSecondsLeft}
          </div>
        </div>
      )}

      {/* STAGE 3: ACTIVE 30-SECOND BREATHING OBSERVATION */}
      {gameState === 'breathing' && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-between py-2 max-w-2xl mx-auto w-full">
          {/* Top Progress & Breath Countdown Bar */}
          <div className="w-full flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 font-cyber text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold text-white">OBSERVATION IN PROGRESS</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">TIME REMAINING:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-sm border border-cyan-500/40">
                {breathSecondsLeft}s
              </span>
            </div>
          </div>

          {/* Central Chibi Blowfish Canvas Anchor */}
          <div className="relative my-auto flex flex-col items-center justify-center">
            {/* Concentric Breathing Guide Aura Ring */}
            <div
              className={`absolute rounded-full pointer-events-none transition-all duration-150 border-2 ${
                breathPhase === 'inhale'
                  ? 'border-cyan-400/60 bg-cyan-500/10'
                  : 'border-teal-400/40 bg-teal-500/5'
              }`}
              style={{
                width: 280 * currentScale,
                height: 280 * currentScale,
                boxShadow:
                  breathPhase === 'inhale'
                    ? '0 0 35px rgba(6, 182, 212, 0.4)'
                    : '0 0 20px rgba(20, 184, 166, 0.2)',
              }}
            />

            <ChibiBlowfish
              size="xl"
              scale={currentScale}
              emotion={currentEmotionKey}
              isTrembling={isTrembling}
              verticalDip={verticalDip}
              breathPhase={breathPhase}
            />

            {/* Inhale / Exhale Real-time HUD Indicator */}
            <div className="mt-4 text-center space-y-1">
              <div
                className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-cyber font-black text-sm uppercase tracking-wider transition-all duration-300 ${
                  breathPhase === 'inhale'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50 scale-105'
                    : 'bg-teal-900/80 text-teal-200 border border-teal-400/40'
                }`}
              >
                <Wind className={`w-4 h-4 ${breathPhase === 'inhale' ? 'animate-bounce' : ''}`} />
                <span>
                  {breathPhase === 'inhale' ? 'INHALE (BREATHE IN)' : 'EXHALE (BREATHE OUT)'}
                </span>
              </div>

              <span className="text-[11px] text-cyan-200/70 font-cyber block">
                {currentConfig.visualQuirk}
              </span>
            </div>
          </div>

          {/* 30s Observation Timeline Bar */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-[11px] font-cyber text-slate-300 px-1">
              <span>Trial {currentTrialIndex + 1} of 4: Recording Respiration Rhythm</span>
              <span className="text-cyan-300 font-bold">{Math.round(((30 - breathSecondsLeft) / 30) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-cyan-500/20">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-amber-400 transition-all duration-200"
                style={{ width: `${((30 - breathSecondsLeft) / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: MULTIPLE CHOICE EMOTION REVEAL */}
      {gameState === 'choice' && (
        <div className="relative z-20 p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-md border-2 border-cyan-500/40 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-auto animate-fade-in">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-cyber font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              30-SECOND OBSERVATION COMPLETE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">
              WHICH EMOTION WAS AGENT BLOWFISH FEELING?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto font-body">
              Recall the speed, expansion depth, and body tremors of the breath. Select the corresponding ocean badge:
            </p>
          </div>

          {/* 4 Ocean Badges Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl mx-auto">
            {TRIAL_KEYS.map((k) => {
              const cfg = EMOTION_CONFIGS[k];
              return (
                <button
                  key={k}
                  onClick={() => handleSelectEmotion(k)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between group ${cfg.badgeBg} ${cfg.badgeBorder} hover:scale-[1.03] hover:shadow-xl hover:shadow-cyan-500/20`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl filter drop-shadow">{cfg.badgeIcon}</span>
                    <div>
                      <h3 className={`font-cyber font-black text-sm sm:text-base ${cfg.badgeColor}`}>
                        {cfg.name}
                      </h3>
                      <span className="text-[11px] text-slate-300 font-cyber block mt-0.5">
                        {cfg.badgeName}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-xs text-white font-cyber font-bold">
                    →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STAGE 5: FEEDBACK & SCIENTIFIC REFLECTION */}
      {gameState === 'reflection' && selectedChoice && (
        <div className="relative z-20 p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-md border-2 border-cyan-500/40 shadow-2xl text-center space-y-5 max-w-2xl mx-auto my-auto animate-fade-in">
          {/* Correct / Incorrect Header Badge */}
          <div className="flex items-center justify-center gap-2">
            {selectedChoice === currentEmotionKey ? (
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-cyber font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>EXCELLENT DEDUCTION! CORRECT</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-cyber font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20">
                <XCircle className="w-4 h-4" />
                <span>MISSED CLUE! ACTUAL EMOTION: {currentConfig.name.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Ocean Badge Card Display */}
          <div className={`p-4 rounded-2xl border-2 ${currentConfig.badgeBg} ${currentConfig.badgeBorder} max-w-md mx-auto flex items-center justify-center gap-4`}>
            <span className="text-4xl">{currentConfig.badgeIcon}</span>
            <div className="text-left">
              <h3 className={`text-lg font-black font-cyber ${currentConfig.badgeColor}`}>
                {currentConfig.name} ({currentConfig.badgeName})
              </h3>
              <span className="text-xs text-slate-300 font-cyber">
                Inhale: {currentConfig.inhaleDuration}s • Exhale: {currentConfig.exhaleDuration}s
              </span>
            </div>
          </div>

          {/* Scientific Quote Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 max-w-lg mx-auto">
            <span className="text-[10px] font-cyber text-cyan-400 font-bold uppercase tracking-widest block">
              // BREATHING PATTERN INSTRUCTION
            </span>
            <p className="text-xs sm:text-sm text-slate-200 font-body italic leading-relaxed">
              {currentConfig.instructionQuote}
            </p>
            <span className="text-[9px] text-slate-500 font-sans block pt-1 border-t border-slate-900">
              Philippot, Chapelle, &amp; Blairy (2002). Cognition &amp; Emotion.
            </span>
          </div>

          {/* Mind-Body Connection Educational Tip */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-left max-w-lg mx-auto flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <span className="text-xs font-cyber font-bold text-cyan-300 block">
                Mind-Body Clue:
              </span>
              <p className="text-xs text-slate-300 font-body mt-0.5 leading-relaxed">
                {currentConfig.mindBodyTip}
              </p>
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-2">
            <button
              onClick={handleProceedNext}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-cyber font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 cursor-pointer inline-flex items-center gap-2"
            >
              <span>{currentTrialIndex < 3 ? 'PROCEED TO NEXT MYSTERY' : 'VIEW FINAL REPORT'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 6: FINAL GAME OVER & OCEAN BADGES RECAP */}
      {gameState === 'gameover' && (
        <div className="relative z-20 p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-md border-2 border-cyan-500/40 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-auto animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-400 to-amber-400 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/30">
            🏆
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <span className={`px-4 py-1.5 rounded-full text-xs font-cyber font-black border ${getDetectiveRank().color}`}>
                {getDetectiveRank().icon} {getDetectiveRank().title}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white mt-2">
              ALL 4 DEEP-SEA MYSTERIES EXPLORED!
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Outstanding respiration detective work, <span className="text-cyan-300 font-bold">{profile.name}</span>!
            </p>
          </div>

          {/* FINAL SCORE HERO DISPLAY (e.g. 3/4 or 4/4) */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-cyan-500/40 shadow-2xl max-w-md mx-auto space-y-1">
            <span className="text-[11px] font-cyber text-cyan-400 uppercase tracking-widest block font-bold">
              ★ EMOTION MYSTERIES DECODED ★
            </span>
            <div className="text-4xl sm:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300">
              {totalCorrect} / 4 <span className="text-xl text-amber-400">CORRECT</span>
            </div>
            <span className="text-xs text-slate-400 font-body block">
              {getDetectiveRank().desc}
            </span>
          </div>

          {/* 4 OCEAN BADGES TRIAL RECAP GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto font-cyber text-xs">
            {trialResults.map((res, i) => {
              const cfg = EMOTION_CONFIGS[res.actualEmotion];
              return (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center relative ${
                    res.isCorrect
                      ? `${cfg.badgeBg} ${cfg.badgeBorder} shadow-md shadow-cyan-500/20`
                      : 'bg-slate-950/70 border-slate-700 opacity-75'
                  }`}
                >
                  <span className="text-2xl mb-1">{cfg.badgeIcon}</span>
                  <span className="font-bold text-white text-[11px] block">{cfg.name}</span>
                  <span className="text-[9px] text-slate-400 block">{cfg.badgeName}</span>

                  <div className="mt-2">
                    {res.isCorrect ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-black text-[9px] border border-emerald-500/40">
                        ✓ SOLVED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-black text-[9px] border border-rose-500/40">
                        ✗ MISSED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rewards Pill */}
          <div className="flex justify-center gap-4 text-xs font-cyber">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              +{totalCorrect * 120 + 100} XP EARNED
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              +{totalCorrect * 30 + 25} COINS
            </div>
          </div>

          {/* Brain Power Unlocked Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border-2 border-cyan-500/40 text-left space-y-3 shadow-xl max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-cyber">
                🧠 BRAIN POWER UNLOCKED
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-amber-300 uppercase font-cyber tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Respiration-Emotion Loop</span>
            </h3>
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                <strong className="text-cyan-300">What you just did:</strong> You decoded Agent Blowfish&apos;s feelings just by watching its breaths and faces! Your brain and body share a two-way street: emotions change how you breathe, and changing how you breathe can shift how you feel.
              </p>
              <p className="text-amber-200 pt-1 border-t border-cyan-500/20">
                <strong className="text-amber-300">Fun Fact:</strong> Professional actors use this exact trick—changing their breathing speed and depth to make themselves feel happy, scared, or calm on cue!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="view-leaderboard-blowfish-btn"
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
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-cyber font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onBackToHub();
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-cyber font-bold text-sm tracking-wider cursor-pointer"
            >
              RETURN TO HUB
            </button>
          </div>
        </div>
      )}

      {/* STAGE 7: DEDICATED LEADERBOARD SCREEN */}
      {gameState === 'leaderboard' && (
        <div className="relative z-20 bg-[#0f172a]/95 backdrop-blur-md rounded-3xl border border-cyan-500/30 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="learn-to-breathe"
            profile={profile}
            onClose={() => setGameState('gameover')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'learn-to-breathe' && onSelectGame) {
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
