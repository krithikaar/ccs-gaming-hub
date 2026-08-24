import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GameId } from '../../types';
import { sounds } from '../../utils/audio';
import { recordGameScore } from '../../utils/leaderboard';
import { LeaderboardView } from '../LeaderboardView';
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Sparkles,
  Clock,
  Zap,
  Check,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BobaDinoProps {
  profile: UserProfile;
  onBackToHub: () => void;
  onUpdateScore: (gameId: 'boba-dino', score: number, earnedXp: number, coins: number) => void;
  onSelectGame?: (gameId: GameId) => void;
}

export type TurnType = 'player' | 'dino';

export interface TrialConfig {
  trialNumber: number;
  turnType: TurnType;
  actualDelay: 250 | 500 | 750;
}

export interface TrialResult {
  trialNumber: number;
  turnType: TurnType;
  actualDelay: number;
  estimatedDelay: number;
  errorMs: number;
}

// Generate 6 randomized trials (3 Player Turn, 3 Dino Turn with 250ms, 500ms, 750ms delays)
function generateTrials(): TrialConfig[] {
  const delays: (250 | 500 | 750)[] = [250, 500, 750];
  const list: { turnType: TurnType; actualDelay: 250 | 500 | 750 }[] = [];

  delays.forEach((delay) => {
    list.push({ turnType: 'player', actualDelay: delay });
    list.push({ turnType: 'dino', actualDelay: delay });
  });

  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list.map((item, idx) => ({
    trialNumber: idx + 1,
    turnType: item.turnType,
    actualDelay: item.actualDelay,
  }));
}

export const BobaDino: React.FC<BobaDinoProps> = ({
  profile,
  onBackToHub,
  onUpdateScore,
  onSelectGame,
}) => {
  // Lifecycle States: 'intro' | 'ready_to_act' | 'delay_and_sip' | 'response' | 'debrief' | 'leaderboard'
  const [gameState, setGameState] = useState<
    'intro' | 'ready_to_act' | 'delay_and_sip' | 'response' | 'debrief' | 'leaderboard'
  >('intro');

  // Trials state
  const [trials, setTrials] = useState<TrialConfig[]>([]);
  const [currentTrialIdx, setCurrentTrialIdx] = useState<number>(0);
  const [trialResults, setTrialResults] = useState<TrialResult[]>([]);

  // Response Slider Value (0 to 1000 ms)
  const [sliderValue, setSliderValue] = useState<number>(500);

  // Visual Animation States
  const [showSparkle, setShowSparkle] = useState<boolean>(false);
  const [bobaTravelProgress, setBobaTravelProgress] = useState<number>(0); // 0 (bottom) to 1 (mouth)
  const [isDinoDrinking, setIsDinoDrinking] = useState<boolean>(false);
  const [showPopBurst, setShowPopBurst] = useState<boolean>(false);

  // Time tracking & Timers
  const actionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Leaderboard state
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [calculatedScore, setCalculatedScore] = useState<number>(0);

  const currentTrial = trials[currentTrialIdx] || null;

  // Clear all pending timers
  const clearAllTimers = () => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    if (sipTimerRef.current) clearTimeout(sipTimerRef.current);
    if (autoTurnTimerRef.current) clearTimeout(autoTurnTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Start fresh 6-trial session
  const startNewGame = useCallback(() => {
    clearAllTimers();
    sounds.playGameStart();
    const newTrials = generateTrials();
    setTrials(newTrials);
    setCurrentTrialIdx(0);
    setTrialResults([]);
    setSliderValue(500);
    setShowSparkle(false);
    setBobaTravelProgress(0);
    setIsDinoDrinking(false);
    setShowPopBurst(false);
    setGameState('ready_to_act');
  }, []);

  // Executes the exact DING + delay + Boba Sip & POP sequence
  const executeDingAndSipSequence = useCallback(
    (delayMs: number) => {
      // 1. Immediately display Sparkle & play DING sound
      setShowSparkle(true);
      sounds.playDing();
      setGameState('delay_and_sip');
      setBobaTravelProgress(0);
      setIsDinoDrinking(false);
      setShowPopBurst(false);

      const startTime = performance.now();

      // Smoothly animate the boba traveling up the straw during the delay
      const animateBobaRise = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / Math.max(100, delayMs));
        setBobaTravelProgress(progress);

        if (elapsed < delayMs) {
          animFrameRef.current = requestAnimationFrame(animateBobaRise);
        }
      };
      animFrameRef.current = requestAnimationFrame(animateBobaRise);

      // 2. After exactly the delay (250 / 500 / 750 ms), trigger the SIP + POP
      sipTimerRef.current = setTimeout(() => {
        setBobaTravelProgress(1);
        setIsDinoDrinking(true);
        sounds.playSlurp();
        sounds.playBobaPop();
        sounds.playDinoChirp();
        setShowPopBurst(true);

        // 3. Keep celebratory sip expression briefly, then show the slider question
        actionTimerRef.current = setTimeout(() => {
          setShowSparkle(false);
          setIsDinoDrinking(false);
          setShowPopBurst(false);
          setBobaTravelProgress(0);
          setSliderValue(500); // reset to center
          setGameState('response');
        }, 550);
      }, delayMs);
    },
    []
  );

  // Player Turn: Triggered on tap / spacebar / mouse click
  const handlePlayerTrigger = useCallback(() => {
    if (gameState !== 'ready_to_act' || !currentTrial) return;
    if (currentTrial.turnType !== 'player') return;

    executeDingAndSipSequence(currentTrial.actualDelay);
  }, [gameState, currentTrial, executeDingAndSipSequence]);

  // Spacebar listener for Player Turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayerTrigger();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerTrigger]);

  // Dino Turn: Automatic trigger after random 1000ms–2000ms gap
  useEffect(() => {
    if (gameState === 'ready_to_act' && currentTrial && currentTrial.turnType === 'dino') {
      const dinoWaitGap = Math.floor(Math.random() * 1000) + 1000; // 1000ms to 2000ms
      autoTurnTimerRef.current = setTimeout(() => {
        executeDingAndSipSequence(currentTrial.actualDelay);
      }, dinoWaitGap);
    }

    return () => {
      if (autoTurnTimerRef.current) clearTimeout(autoTurnTimerRef.current);
    };
  }, [gameState, currentTrial, executeDingAndSipSequence]);

  // Clean up on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Submit Slider Response
  const handleSubmitEstimate = () => {
    if (!currentTrial) return;
    sounds.playCandyChime(950);

    const error = Math.abs(sliderValue - currentTrial.actualDelay);
    const newResult: TrialResult = {
      trialNumber: currentTrial.trialNumber,
      turnType: currentTrial.turnType,
      actualDelay: currentTrial.actualDelay,
      estimatedDelay: sliderValue,
      errorMs: error,
    };

    const nextResults = [...trialResults, newResult];
    setTrialResults(nextResults);

    if (currentTrialIdx + 1 < trials.length) {
      setCurrentTrialIdx((prev) => prev + 1);
      setGameState('ready_to_act');
    } else {
      finalizeGame(nextResults);
    }
  };

  // Finalize all 6 trials
  const finalizeGame = (results: TrialResult[]) => {
    const playerTrials = results.filter((r) => r.turnType === 'player');
    const dinoTrials = results.filter((r) => r.turnType === 'dino');

    const pMean =
      playerTrials.reduce((sum, r) => sum + r.estimatedDelay, 0) / (playerTrials.length || 1);
    const dMean =
      dinoTrials.reduce((sum, r) => sum + r.estimatedDelay, 0) / (dinoTrials.length || 1);

    const bindingCompression = Math.round(dMean - pMean);
    const avgError = results.reduce((sum, r) => sum + r.errorMs, 0) / results.length;

    // Score calculation
    const accuracyBonus = Math.max(0, Math.round(2500 - avgError * 3));
    const totalScore = 2000 + accuracyBonus;
    setCalculatedScore(totalScore);

    const earnedXp = Math.round(totalScore * 0.4) + 100;
    const earnedCoins = Math.round(totalScore * 0.1) + 25;
    onUpdateScore('boba-dino', totalScore, earnedXp, earnedCoins);

    const record = recordGameScore(
      'boba-dino',
      profile,
      totalScore,
      `${bindingCompression > 0 ? `+${bindingCompression}ms Binding` : 'Precise Timing'} • 6/6 Fed`
    );
    setPlayerRank(record.rank);

    sounds.playLevelUp();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    setGameState('debrief');
  };

  // Summary Metrics for results
  const playerTrialsList = trialResults.filter((r) => r.turnType === 'player');
  const dinoTrialsList = trialResults.filter((r) => r.turnType === 'dino');
  const meanPlayerEst = Math.round(
    playerTrialsList.reduce((sum, r) => sum + r.estimatedDelay, 0) / (playerTrialsList.length || 1)
  );
  const meanDinoEst = Math.round(
    dinoTrialsList.reduce((sum, r) => sum + r.estimatedDelay, 0) / (dinoTrialsList.length || 1)
  );
  const timeDifference = meanDinoEst - meanPlayerEst;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 select-none font-sans">
      {/* ───────────────────────────────────────────────────────── */}
      {/* VIEW 1: CANDY SHOP MISSION BRIEFING / INTRO SCREEN       */}
      {/* ───────────────────────────────────────────────────────── */}
      {gameState === 'intro' && (
        <div className="bg-gradient-to-br from-[#1a1226] via-[#102419] to-[#25102a] rounded-3xl border-2 border-pink-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Sweet Candy Shop Ambient Blobs */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
            <div className="flex items-center gap-3">
              <button
                id="boba-dino-back-hub-btn"
                onClick={() => {
                  sounds.playClick();
                  onBackToHub();
                }}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shadow"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/40 font-cyber">
                    🍬 CANDY SHOP COGNITIVE LAB
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-cyber">
                    6 TRIALS
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-300 to-emerald-400 uppercase tracking-tight mt-1 font-cyber">
                  BOBADINO: TIME WARP CANDY SHOP
                </h1>
              </div>
            </div>

            <button
              id="boba-dino-intro-leaderboard-btn"
              onClick={() => {
                sounds.playClick();
                setGameState('leaderboard');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md self-start sm:self-auto"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>LEADERBOARD</span>
            </button>
          </div>

          {/* Intro Content Grid */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
            {/* Dino Character Preview */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/70 border-2 border-emerald-400/30 relative shadow-inner">
              <div className="w-56 h-56 sm:w-64 sm:h-64 relative flex items-center justify-center">
                {/* Floating Candies */}
                <div className="absolute top-2 left-4 text-3xl animate-bounce">🍭</div>
                <div className="absolute top-4 right-4 text-3xl animate-bounce delay-150">🍬</div>
                <div className="absolute bottom-4 left-6 text-2xl animate-pulse">🧁</div>
                <div className="absolute bottom-6 right-6 text-3xl animate-bounce delay-300">🍡</div>

                {/* SVG Dino Avatar Preview */}
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]">
                  {/* Candyshop Counter */}
                  <rect x="15" y="162" width="170" height="26" rx="6" fill="#fb7185" />
                  <rect x="15" y="162" width="170" height="6" fill="#f43f5e" />

                  {/* Dino Body */}
                  <ellipse cx="100" cy="115" rx="46" ry="50" fill="#22c55e" />
                  {/* Dino Purple Spots (Barney homage) */}
                  <ellipse cx="75" cy="110" rx="9" ry="6" fill="#c084fc" opacity="0.8" />
                  <ellipse cx="125" cy="110" rx="8" ry="5" fill="#c084fc" opacity="0.8" />
                  <ellipse cx="80" cy="135" rx="7" ry="5" fill="#c084fc" opacity="0.8" />
                  <ellipse cx="120" cy="135" rx="8" ry="6" fill="#c084fc" opacity="0.8" />

                  {/* Dino Belly */}
                  <ellipse cx="100" cy="120" rx="30" ry="38" fill="#a7f3d0" />

                  {/* Dino Head */}
                  <circle cx="100" cy="65" r="38" fill="#22c55e" />
                  {/* Head Purple Spots */}
                  <ellipse cx="85" cy="45" rx="6" ry="4" fill="#c084fc" opacity="0.8" />
                  <ellipse cx="115" cy="45" rx="6" ry="4" fill="#c084fc" opacity="0.8" />

                  {/* Back Spikes */}
                  <polygon points="68,50 58,45 66,60" fill="#15803d" />
                  <polygon points="62,75 52,72 60,85" fill="#15803d" />
                  <polygon points="60,105 50,105 58,118" fill="#15803d" />

                  {/* Pink Cute Cheeks */}
                  <ellipse cx="76" cy="72" rx="7" ry="4" fill="#f472b6" />
                  <ellipse cx="124" cy="72" rx="7" ry="4" fill="#f472b6" />

                  {/* Cute Big Eyes */}
                  <ellipse cx="86" cy="60" rx="6.5" ry="8.5" fill="#0f172a" />
                  <circle cx="84" cy="57" r="2.5" fill="#ffffff" />
                  <ellipse cx="114" cy="60" rx="6.5" ry="8.5" fill="#0f172a" />
                  <circle cx="112" cy="57" r="2.5" fill="#ffffff" />

                  {/* Dino Mouth with Straw in it */}
                  <ellipse cx="100" cy="75" rx="9" ry="6" fill="#14532d" />

                  {/* Striped Boba Straw */}
                  <path
                    d="M 100 75 L 100 152"
                    stroke="#ec4899"
                    strokeWidth="5"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                  />

                  {/* Transparent Boba Glass Cup */}
                  <path
                    d="M 82 110 L 86 156 Q 100 160 114 156 L 118 110 Z"
                    fill="rgba(253, 230, 138, 0.75)"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {/* Boba Pearls */}
                  <circle cx="92" cy="151" r="3.5" fill="#1e1b4b" />
                  <circle cx="100" cy="153" r="3.5" fill="#1e1b4b" />
                  <circle cx="108" cy="150" r="3.5" fill="#1e1b4b" />
                  <circle cx="96" cy="144" r="3.5" fill="#1e1b4b" />
                  <circle cx="104" cy="145" r="3.5" fill="#1e1b4b" />

                  {/* Arms Holding Glass */}
                  <path
                    d="M 70 110 Q 80 120 88 120"
                    stroke="#16a34a"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 130 110 Q 120 120 112 120"
                    stroke="#16a34a"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-pink-300 font-cyber font-bold text-xs uppercase tracking-widest mt-2">
                BOBADINO • GREEN T-REX
              </p>
            </div>

            {/* Quick Rules */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                <h3 className="text-pink-300 font-cyber font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>How to Play (6 Quick Rounds)</span>
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  Dino is sitting at the candy shop counter holding a giant cup of boba tea with a straw in his mouth.
                  In each trial, you will witness a bright <strong className="text-yellow-300">Sparkle + DING sound</strong> at the bottom of the cup,
                  followed by Dino drinking a boba bubble up the straw ending with a <strong className="text-pink-300">POP sound</strong>!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30">
                  <div className="flex items-center gap-2 text-cyan-300 font-cyber font-bold text-xs uppercase">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Your Turn (Active)</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px]">SPACE</kbd> or tap anywhere to start the sparkle DING, then time until the POP!
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-300 font-cyber font-bold text-xs uppercase">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dino's Turn (Passive)</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Watch closely as Dino triggers the sparkle DING on his own, then time until the POP!
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-200 text-xs leading-relaxed">
                  🍭 <strong>Candy Cane Slider:</strong> After each sip, estimate the duration (0 ms to 1000 ms) to discover the brain's Intentional Binding superpower!
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/10">
            <button
              id="boba-dino-start-btn"
              onClick={startNewGame}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-yellow-400 to-emerald-400 hover:from-pink-400 hover:to-emerald-300 text-slate-950 font-black font-cyber text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-3 cursor-pointer transition-all transform active:scale-95"
            >
              <Sparkles className="w-5 h-5 fill-slate-950" />
              <span>START CANDY SHOP GAME (6 ROUNDS)</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* VIEW 2: GAMEPLAY SCREEN (Ready to Act / Delay & Sip)      */}
      {/* ───────────────────────────────────────────────────────── */}
      {(gameState === 'ready_to_act' || gameState === 'delay_and_sip') && currentTrial && (
        <div className="w-full bg-[#120a1f] rounded-3xl border-2 border-pink-500/40 p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
          {/* Top Status Bar */}
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  onBackToHub();
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Return to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-pink-500/40 text-pink-300 font-cyber font-bold text-xs uppercase tracking-wider">
                TRIAL {currentTrial.trialNumber} / 6
              </div>
            </div>

            {/* Turn Type Badge */}
            <div
              className={`px-4 py-1.5 rounded-full font-cyber font-black text-xs uppercase tracking-wider flex items-center gap-2 border shadow-lg ${
                currentTrial.turnType === 'player'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/60'
              }`}
            >
              {currentTrial.turnType === 'player' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>YOUR TURN</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>DINO'S TURN</span>
                </>
              )}
            </div>

            {/* In-Game Leaderboard */}
            <button
              onClick={() => {
                sounds.playClick();
                setGameState('leaderboard');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">RANK</span>
            </button>
          </div>

          {/* Turn Banner (Clean instructions: "Tap anywhere to feed Dino" or "Watch closely...") */}
          <div className="w-full mb-4">
            {currentTrial.turnType === 'player' ? (
              <div
                onClick={handlePlayerTrigger}
                className={`w-full py-3.5 px-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-center transition-all cursor-pointer select-none ${
                  gameState === 'ready_to_act'
                    ? 'bg-gradient-to-r from-pink-500/25 via-yellow-500/25 to-emerald-500/25 border-yellow-400 text-yellow-200 animate-pulse shadow-lg'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="font-cyber font-black text-xs sm:text-sm uppercase tracking-wider">
                  {gameState === 'ready_to_act'
                    ? 'YOUR TURN: TAP ANYWHERE OR PRESS SPACE TO FEED DINO!'
                    : 'SIP IN PROGRESS...'}
                </span>
              </div>
            ) : (
              <div className="w-full py-3.5 px-4 rounded-2xl border-2 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 border-purple-400 text-purple-200 shadow-lg flex items-center justify-center gap-2 text-center select-none">
                <Clock className="w-4 h-4 text-purple-300" />
                <span className="font-cyber font-black text-xs sm:text-sm uppercase tracking-wider">
                  {gameState === 'ready_to_act'
                    ? "DINO'S TURN: WATCH CLOSELY..."
                    : 'DINO IS SIPPING...'}
                </span>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────── */}
          {/* MAIN STAGE: VIBRANT CANDY SHOP BACKDROP & GIANT DINO  */}
          {/* ───────────────────────────────────────────────────── */}
          <div
            id="candy-shop-stage"
            onClick={handlePlayerTrigger}
            className="w-full relative min-h-[380px] sm:min-h-[460px] rounded-3xl bg-gradient-to-b from-[#ff80bf] via-[#ffe066] to-[#6ee7b7] border-4 border-pink-400/80 flex items-center justify-center overflow-hidden cursor-pointer select-none shadow-2xl"
          >
            {/* Pastel Candy Wallpaper Vertical Stripes */}
            <div className="absolute inset-0 flex pointer-events-none opacity-40">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full ${
                    i % 2 === 0 ? 'bg-pink-300/60' : 'bg-yellow-200/60'
                  }`}
                />
              ))}
            </div>

            {/* Candy Shop Awning Header */}
            <div className="absolute top-0 left-0 right-0 h-10 flex overflow-hidden z-0 shadow-md">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-b-xl ${
                    i % 2 === 0 ? 'bg-pink-500' : 'bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Candy Shop Bunting Flags & Hanging Sweets */}
            <div className="absolute top-12 left-4 right-4 flex justify-between items-center text-3xl sm:text-4xl opacity-90 pointer-events-none z-10 drop-shadow">
              <span className="animate-bounce">🍭</span>
              <span className="animate-pulse">🍬</span>
              <span>🧁</span>
              <span className="animate-bounce delay-150">🍡</span>
              <span className="animate-pulse">🍩</span>
              <span className="animate-bounce delay-300">🍫</span>
              <span>🍭</span>
            </div>

            {/* Candy Jars on Background Shelves (Left & Right) */}
            <div className="absolute top-28 left-3 sm:left-6 flex flex-col gap-3 pointer-events-none z-10">
              <div className="w-12 h-14 sm:w-16 sm:h-18 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-pink-400 flex items-center justify-center text-xl sm:text-2xl shadow-md">
                🍬
              </div>
              <div className="w-12 h-14 sm:w-16 sm:h-18 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-yellow-400 flex items-center justify-center text-xl sm:text-2xl shadow-md">
                🍡
              </div>
            </div>

            <div className="absolute top-28 right-3 sm:right-6 flex flex-col gap-3 pointer-events-none z-10">
              <div className="w-12 h-14 sm:w-16 sm:h-18 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-emerald-400 flex items-center justify-center text-xl sm:text-2xl shadow-md">
                🍭
              </div>
              <div className="w-12 h-14 sm:w-16 sm:h-18 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-purple-400 flex items-center justify-center text-xl sm:text-2xl shadow-md">
                🧁
              </div>
            </div>

            {/* Floating Sweet Cotton Candy Clouds */}
            <div className="absolute top-20 left-1/4 text-4xl opacity-70 pointer-events-none animate-pulse">
              ☁️
            </div>
            <div className="absolute top-24 right-1/4 text-4xl opacity-70 pointer-events-none animate-pulse delay-200">
              ☁️
            </div>

            {/* ───────────────────────────────────────────────────── */}
            {/* SVG CHIBI T-REX CHARACTER WITH BOBA CUP & STRAW       */}
            {/* ───────────────────────────────────────────────────── */}
            <div className="relative z-20 w-full max-w-[340px] sm:max-w-[420px] h-[340px] sm:h-[400px] flex items-center justify-center drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]">
              <svg viewBox="0 0 240 260" className="w-full h-full">
                {/* Candy Shop Glossy Wooden Counter Table */}
                <rect x="15" y="215" width="210" height="35" rx="8" fill="#ff70a6" stroke="#ffffff" strokeWidth="2" />
                <rect x="15" y="215" width="210" height="6" fill="#ff477e" />

                {/* Dino Green Body (Barney style chubby cute T-Rex) */}
                <ellipse cx="120" cy="148" rx="58" ry="64" fill="#22c55e" stroke="#15803d" strokeWidth="2" />

                {/* Purple Barney Spots on Dino Body */}
                <ellipse cx="80" cy="138" rx="12" ry="8" fill="#c084fc" opacity="0.85" />
                <ellipse cx="160" cy="138" rx="11" ry="7" fill="#c084fc" opacity="0.85" />
                <ellipse cx="88" cy="172" rx="9" ry="6" fill="#c084fc" opacity="0.85" />
                <ellipse cx="152" cy="172" rx="10" ry="7" fill="#c084fc" opacity="0.85" />

                {/* Dino Pastel Belly */}
                <ellipse cx="120" cy="154" rx="38" ry="48" fill="#a7f3d0" />

                {/* Dino Back Spikes */}
                <polygon points="68,60 52,54 65,76" fill="#15803d" />
                <polygon points="60,98 44,94 58,112" fill="#15803d" />
                <polygon points="56,140 40,140 54,156" fill="#15803d" />

                {/* Dino Head */}
                <circle cx="120" cy="80" r="50" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
                {/* Purple Spots on Head */}
                <ellipse cx="98" cy="52" rx="8" ry="5" fill="#c084fc" opacity="0.85" />
                <ellipse cx="142" cy="52" rx="8" ry="5" fill="#c084fc" opacity="0.85" />

                {/* Cheeks (Puff Up / Glow when sipping) */}
                <ellipse
                  cx={isDinoDrinking ? 88 : 90}
                  cy="90"
                  rx={isDinoDrinking ? 15 : 10}
                  ry={isDinoDrinking ? 11 : 7}
                  fill="#f472b6"
                  stroke="#fb7185"
                  strokeWidth="1.5"
                />
                <ellipse
                  cx={isDinoDrinking ? 152 : 150}
                  cy="90"
                  rx={isDinoDrinking ? 15 : 10}
                  ry={isDinoDrinking ? 11 : 7}
                  fill="#f472b6"
                  stroke="#fb7185"
                  strokeWidth="1.5"
                />

                {/* Dino Eyes */}
                {isDinoDrinking ? (
                  <>
                    {/* Happy Satisfied Slurp Wink Eyes */}
                    <path
                      d="M 94 74 Q 104 64 114 74"
                      stroke="#0f172a"
                      strokeWidth="4.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 126 74 Q 136 64 146 74"
                      stroke="#0f172a"
                      strokeWidth="4.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <>
                    {/* Large Bright Anime Eyes */}
                    <ellipse cx="102" cy="74" rx="8.5" ry="11" fill="#0f172a" />
                    <circle cx="99" cy="70" r="4" fill="#ffffff" />
                    <circle cx="104" cy="77" r="1.5" fill="#ffffff" />

                    <ellipse cx="138" cy="74" rx="8.5" ry="11" fill="#0f172a" />
                    <circle cx="135" cy="70" r="4" fill="#ffffff" />
                    <circle cx="140" cy="77" r="1.5" fill="#ffffff" />
                  </>
                )}

                {/* Dino Mouth with Giant Straw in it */}
                <ellipse cx="120" cy="98" rx="12" ry="8" fill="#14532d" />

                {/* Giant Candy Striped Boba Straw (from cup bottom directly into mouth) */}
                <path
                  d="M 120 98 L 120 206"
                  stroke="#ff007f"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 120 98 L 120 206"
                  stroke="#ffffff"
                  strokeWidth="8"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                />

                {/* Animated Boba Bubble Traveling Up the Straw */}
                {bobaTravelProgress > 0 && (
                  <circle
                    cx="120"
                    cy={206 - bobaTravelProgress * (206 - 98)}
                    r="5"
                    fill="#1e1b4b"
                    stroke="#ffd166"
                    strokeWidth="2"
                  />
                )}

                {/* Transparent Boba Glass Cup */}
                <path
                  d="M 96 142 L 102 210 Q 120 216 138 210 L 144 142 Z"
                  fill="rgba(255, 230, 160, 0.85)"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                />

                {/* Milk Tea Liquid Surface */}
                <ellipse cx="120" cy="144" rx="22" ry="5" fill="#f59e0b" />

                {/* Floating Ice Cubes */}
                <rect x="106" y="152" width="10" height="10" rx="3" fill="rgba(255,255,255,0.7)" />
                <rect x="124" y="160" width="9" height="9" rx="3" fill="rgba(255,255,255,0.7)" />

                {/* Boba Pearls inside Cup Bottom */}
                <circle cx="110" cy="202" r="5" fill="#0f172a" />
                <circle cx="120" cy="205" r="5" fill="#0f172a" />
                <circle cx="130" cy="201" r="5" fill="#0f172a" />
                <circle cx="114" cy="193" r="4.5" fill="#0f172a" />
                <circle cx="126" cy="194" r="4.5" fill="#0f172a" />

                {/* Dino Cute Arms Holding Glass */}
                <path
                  d="M 80 144 Q 94 160 104 160"
                  stroke="#16a34a"
                  strokeWidth="11"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 160 144 Q 146 160 136 160"
                  stroke="#16a34a"
                  strokeWidth="11"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* ─────────────────────────────────────────────────── */}
                {/* SPARKLE AT BOTTOM OF BOBA CUP (Event A)             */}
                {/* ─────────────────────────────────────────────────── */}
                {showSparkle && (
                  <g className="animate-ping">
                    {/* Glowing Sparkle Ring */}
                    <circle cx="120" cy="206" r="24" fill="none" stroke="#facc15" strokeWidth="4" />
                    {/* Starburst rays */}
                    <path
                      d="M 120 176 L 120 236 M 90 206 L 150 206 M 98 184 L 142 228 M 142 184 L 98 228"
                      stroke="#facc15"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx="120" cy="206" r="10" fill="#ffffff" />
                  </g>
                )}

                {/* ─────────────────────────────────────────────────── */}
                {/* POP BURST CELEBRATION HEARTS & STARS (Event B)      */}
                {/* ─────────────────────────────────────────────────── */}
                {showPopBurst && (
                  <g>
                    <text x="65" y="55" fontSize="24" className="animate-bounce">
                      💖
                    </text>
                    <text x="155" y="50" fontSize="24" className="animate-bounce delay-100">
                      💖
                    </text>
                    <text x="110" y="30" fontSize="24" className="animate-bounce delay-200">
                      ✨
                    </text>
                    <text x="120" y="90" fontSize="20" className="animate-ping">
                      💥
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Visual Sparkle Cue Banner at Bottom */}
            {showSparkle && (
              <div className="absolute bottom-4 px-6 py-2.5 rounded-full bg-yellow-400 text-slate-950 font-black font-cyber text-sm uppercase tracking-widest animate-bounce shadow-2xl flex items-center gap-2 border-2 border-white">
                <Sparkles className="w-5 h-5" />
                <span>✨ DING! 🔔</span>
              </div>
            )}

            {/* Visual Pop Banner */}
            {showPopBurst && (
              <div className="absolute top-14 px-6 py-2.5 rounded-full bg-pink-500 text-white font-black font-cyber text-sm uppercase tracking-widest animate-pulse shadow-2xl flex items-center gap-2 border-2 border-white">
                <span>🧋 SLURP-POP! 💥</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* VIEW 3: CANDY CANE SLIDER RESPONSE SCREEN                 */}
      {/* ───────────────────────────────────────────────────────── */}
      {gameState === 'response' && currentTrial && (
        <div className="w-full bg-gradient-to-br from-[#1b0e2b] via-[#102419] to-[#250f20] rounded-3xl border-4 border-yellow-400/60 p-6 sm:p-8 shadow-2xl flex flex-col items-center animate-fadeIn">
          {/* Header Title */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-cyber">
                  TRIAL {currentTrial.trialNumber} OF 6
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border font-cyber ${
                    currentTrial.turnType === 'player'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  }`}
                >
                  {currentTrial.turnType === 'player' ? 'YOUR TURN' : "DINO'S TURN"}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-300 to-emerald-400 uppercase font-cyber tracking-tight">
                How long did Dino take to drink?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Estimate the time between the <strong className="text-yellow-300">Sparkle DING! 🔔</strong> and the <strong className="text-pink-300">Boba POP! 🧋</strong>
              </p>
            </div>

            {/* High-Contrast Live Millisecond Readout Badge */}
            <div className="px-6 py-3 rounded-2xl bg-slate-950 border-2 border-yellow-400 text-yellow-300 font-mono font-black text-2xl sm:text-3xl tracking-wider shadow-xl flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <span>{sliderValue} ms</span>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────── */}
          {/* CANDY CANE SLIDER: 0ms to 1000ms with 100ms TICKS     */}
          {/* ───────────────────────────────────────────────────── */}
          <div className="w-full max-w-2xl px-4 py-6">
            <div className="relative flex flex-col items-center">
              {/* Range Input with Candy Cane Striped Track */}
              <input
                id="boba-dino-cane-slider"
                type="range"
                min={0}
                max={1000}
                step={10}
                value={sliderValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSliderValue(val);
                  if (val % 100 === 0) {
                    sounds.playCandyChime(val + 350);
                  }
                }}
                className="w-full h-5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-pink-500 via-yellow-400 to-emerald-400 shadow-inner focus:outline-none accent-yellow-400"
              />

              {/* Ticks Container: Large ticks at 0 & 1000, Mini ticks every 100ms */}
              <div className="w-full flex justify-between items-center mt-4 text-[11px] font-cyber font-bold text-slate-300 px-1">
                {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((ms) => {
                  const isEnd = ms === 0 || ms === 1000;
                  const isCenter = ms === 500;
                  return (
                    <div
                      key={ms}
                      className="flex flex-col items-center select-none"
                      style={{ transform: 'translateX(-50%)' }}
                    >
                      {/* Tick Line */}
                      <div
                        className={`w-1 rounded-full ${
                          isEnd
                            ? 'h-4 bg-yellow-400 shadow-[0_0_8px_#facc15]'
                            : isCenter
                            ? 'h-3 bg-pink-400'
                            : 'h-2 bg-slate-500'
                        }`}
                      />
                      {/* Label */}
                      <span
                        className={`mt-1.5 ${
                          isEnd
                            ? 'text-yellow-300 font-black text-xs'
                            : isCenter
                            ? 'text-pink-300 font-bold text-[10px]'
                            : 'hidden sm:inline text-[9px] text-slate-400'
                        }`}
                      >
                        {ms}
                        {isEnd && 'ms'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Adjustment Stepper Buttons */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => {
                  sounds.playClick();
                  setSliderValue((v) => Math.max(0, v - 50));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              >
                -50 ms
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setSliderValue((v) => Math.max(0, v - 10));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              >
                -10 ms
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setSliderValue((v) => Math.min(1000, v + 10));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              >
                +10 ms
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setSliderValue((v) => Math.min(1000, v + 50));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              >
                +50 ms
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="boba-dino-submit-estimate-btn"
            onClick={handleSubmitEstimate}
            className="mt-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-yellow-400 to-emerald-400 hover:from-pink-400 hover:to-emerald-300 text-slate-950 font-black font-cyber text-sm sm:text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>SUBMIT ESTIMATE ({sliderValue} MS)</span>
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* VIEW 4: RESULTS & INTENTIONAL BINDING DEBRIEF SCREEN     */}
      {/* ───────────────────────────────────────────────────────── */}
      {gameState === 'debrief' && (
        <div className="bg-gradient-to-br from-[#120a1f] via-[#102419] to-[#250f20] rounded-3xl border-2 border-pink-500/40 p-6 sm:p-10 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-cyber">
                  6/6 TRIALS COMPLETE
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-cyber">
                  SCORE: {calculatedScore.toLocaleString()} PTS
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-300 to-emerald-400 uppercase tracking-tight font-cyber mt-1">
                TIME-WARP RESULTS & DEBRIEF
              </h2>
            </div>

            {playerRank && (
              <div className="px-5 py-2.5 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="font-cyber font-black text-amber-300 text-sm tracking-wider">
                  GLOBAL RANK #{playerRank}
                </span>
              </div>
            )}
          </div>

          {/* Core Intentional Binding Scientific Comparison Card */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border-2 border-pink-500/30 mb-6">
            <h3 className="text-lg font-black text-yellow-300 uppercase font-cyber tracking-tight flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span>Time-Warp Superpower Discovered!</span>
            </h3>

            {/* Visual Comparison Bar Chart */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Active (Player Action) */}
              <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest font-cyber">
                    PLAYER ACTION (YOUR TURN)
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-cyan-200 font-mono mt-1">
                    {meanPlayerEst} ms
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Mean estimated duration</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (meanPlayerEst / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Passive (Dino Action) */}
              <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest font-cyber">
                    DINO ACTION (PASSIVE)
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-purple-200 font-mono mt-1">
                    {meanDinoEst} ms
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Mean estimated duration</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (meanDinoEst / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Actual Delay Baseline */}
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest font-cyber">
                    ACTUAL AVERAGE DELAY
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-200 font-mono mt-1">
                    500 ms
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Average delay (250/500/750ms)</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: '50%' }}
                  />
                </div>
              </div>
            </div>

            {/* Brain Power Unlocked Scientific Explanation Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border-2 border-pink-500/40 text-left space-y-3 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/40 font-cyber">
                  🧠 BRAIN POWER UNLOCKED
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-amber-300 uppercase font-cyber tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Intentional Binding (Sense of Agency)</span>
              </h3>
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2">
                <p className="font-semibold text-pink-300">
                  {timeDifference > 0 ? (
                    <>
                      🎉 <strong>Time Compression Detected!</strong> Your estimates were on average{' '}
                      <span className="text-yellow-300 font-bold font-mono">
                        {timeDifference} ms shorter
                      </span>{' '}
                      when you pressed the button compared to when Dino moved on his own!
                    </>
                  ) : (
                    <>
                      ✨ <strong>High Time Precision!</strong> Your time estimates stayed closely
                      aligned across both active feeding and passive watching trials.
                    </>
                  )}
                </p>
                <p className="text-slate-300">
                  <strong className="text-pink-300">What you just did:</strong> When your brain decides to act and feed the Dino, it connects your action and the sound together, making time feel compressed. Scientists call this <strong className="text-yellow-300">Intentional Binding</strong>—your mind’s secret superpower that gives you a <strong className="text-emerald-300">Sense of Agency</strong> (knowing you are in control of what happens next!).
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="boba-dino-view-leaderboard-btn"
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
              onClick={startNewGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-yellow-400 to-emerald-400 hover:from-pink-400 hover:to-emerald-300 text-slate-950 font-cyber font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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

      {/* ───────────────────────────────────────────────────────── */}
      {/* VIEW 5: LEADERBOARD SCREEN                                */}
      {/* ───────────────────────────────────────────────────────── */}
      {gameState === 'leaderboard' && (
        <div className="relative z-20 bg-[#0f172a]/95 backdrop-blur-md rounded-3xl border border-pink-500/30 p-4 sm:p-8 shadow-2xl">
          <LeaderboardView
            initialGameId="boba-dino"
            profile={profile}
            onClose={() => setGameState(trialResults.length === 6 ? 'debrief' : 'intro')}
            onPlayGame={(targetGameId) => {
              if (targetGameId && targetGameId !== 'boba-dino' && onSelectGame) {
                onSelectGame(targetGameId);
              } else {
                startNewGame();
              }
            }}
            isEmbeddedInGame={true}
          />
        </div>
      )}
    </div>
  );
};
