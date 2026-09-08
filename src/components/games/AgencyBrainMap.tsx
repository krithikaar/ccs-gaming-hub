import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle, Eye, Hand, Brain, Compass } from 'lucide-react';

export interface AgencyBrainMapProps {
  game: 'animal-mind-control' | 'spider-rabbit';
  className?: string;
}

interface BrainRegion {
  id: string;
  name: string;
  scientificName: string;
  simpleRole: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  animalGameRole: string;
  spiderGameRole: string;
}

const BRAIN_REGIONS: Record<string, BrainRegion> = {
  prefrontal: {
    id: 'prefrontal',
    name: 'The Goal & Decision Maker',
    scientificName: 'Prefrontal Cortex (DLPFC & Frontal Gyrus)',
    simpleRole: 'Decides what you want to achieve before your body moves.',
    color: '#facc15', // Yellow
    badgeBg: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    textColor: 'text-yellow-300',
    animalGameRole: 'Decided: "I want to test the Left Arrow to see which animal hops left."',
    spiderGameRole: 'Decided: "I need to steer right to keep Spider-Rabbit centered on the road."',
  },
  motor_planning: {
    id: 'motor_planning',
    name: 'The Movement Planner',
    scientificName: 'Premotor Cortex & SMA (Supplementary Motor Area)',
    simpleRole: 'Drafts the secret blueprint and timing for your finger muscles.',
    color: '#fb923c', // Orange
    badgeBg: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-300',
    animalGameRole: 'Prepares the exact finger tap on the arrow button.',
    spiderGameRole: 'Prepares tiny micro-adjustments on the joystick or steering keys.',
  },
  motor_execution: {
    id: 'motor_execution',
    name: 'The Muscle Command Center',
    scientificName: 'Primary Motor Cortex (M1)',
    simpleRole: 'Fires electrical pulses down the spinal cord to move your hand and fingers.',
    color: '#f43f5e', // Rose / Red
    badgeBg: 'bg-rose-500/20',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-300',
    animalGameRole: 'Sends the physical command to press the key right now.',
    spiderGameRole: 'Sends signals to your fingers to steer Spider-Rabbit left or right.',
  },
  agency_judge: {
    id: 'agency_judge',
    name: 'The Agency Matcher ("Did I Do That?" Judge)',
    scientificName: 'Posterior Parietal Cortex, Angular Gyrus & rTPJ',
    simpleRole: 'Compares your plan with what actually happened on screen to decide if YOU caused it.',
    color: '#c084fc', // Purple / Violet
    badgeBg: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-300',
    animalGameRole: 'Compares your "Sneak Preview" to the 4 animals: "Only the Panda hopped exactly when I pressed! That one is mine!"',
    spiderGameRole: 'Catches when a surprise breeze moved Spider-Rabbit: "Wait! My hand didn\'t steer that way! That wasn\'t me!"',
  },
  sensory_vision: {
    id: 'sensory_vision',
    name: 'The Live Camera Reporters',
    scientificName: 'Visual Cortex & Somatosensory Cortex',
    simpleRole: 'Receives the live feed of what your eyes see and what your fingers feel.',
    color: '#38bdf8', // Cyan / Light Blue
    badgeBg: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-300',
    animalGameRole: 'Watches the screen to see which of the 4 animals actually moved.',
    spiderGameRole: 'Tracks Spider-Rabbit sliding along the road and watches out for sudden wind drifts.',
  },
  cerebellum: {
    id: 'cerebellum',
    name: 'The Precision & Timing Coach',
    scientificName: 'Cerebellum & Subcortical Network',
    simpleRole: 'Smooths out jerky movements and fine-tunes timing down to milliseconds.',
    color: '#34d399', // Emerald
    badgeBg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-300',
    animalGameRole: 'Helps your brain measure tiny millisecond delays between your tap and the animal movement.',
    spiderGameRole: 'Smooths your steering so Spider-Rabbit glides gently rather than violently swerving.',
  },
};

const STEPS = [
  {
    step: 1,
    title: '1. The Intention (Idea)',
    highlightRegion: 'prefrontal',
    signal: 'intent',
    description: 'Your brain forms a conscious goal: "I want to move!"',
    badge: 'Frontal Cortex',
  },
  {
    step: 2,
    title: '2. Action Command + Sneak Preview',
    highlightRegion: 'motor_execution',
    signal: 'action_and_copy',
    description: 'Your brain orders your fingers to tap, AND simultaneously whispers a "Sneak Preview" to the Agency Judge!',
    badge: 'Motor Cortex ➔ Sneak Preview',
  },
  {
    step: 3,
    title: '3. Eyes Report Back',
    highlightRegion: 'sensory_vision',
    signal: 'feedback',
    description: 'Light from the screen reaches your eyes, reporting what actually happened in the physical world.',
    badge: 'Visual Feedback',
  },
  {
    step: 4,
    title: '4. The Match = "I DID THAT!"',
    highlightRegion: 'agency_judge',
    signal: 'agency_match',
    description: 'The Agency Judge compares the "Sneak Preview" with the "Eye Report". Perfect match = 100% Sense of Agency!',
    badge: 'Agency Judge (Parietal Hub)',
  },
];

export const AgencyBrainMap: React.FC<AgencyBrainMapProps> = ({ game, className = '' }) => {
  const [activeStep, setActiveStep] = useState<number>(0); // 0 = overview/all, 1..4 = steps
  const [selectedRegionId, setSelectedRegionId] = useState<string>('agency_judge');
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(true);

  // Auto step cycle when playing
  useEffect(() => {
    if (!isPlayingAnimation) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % (STEPS.length + 1);
        if (next > 0) {
          setSelectedRegionId(STEPS[next - 1].highlightRegion);
        }
        return next;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [isPlayingAnimation]);

  const selectedRegion = BRAIN_REGIONS[selectedRegionId] || BRAIN_REGIONS.agency_judge;
  const currentStepData = activeStep > 0 ? STEPS[activeStep - 1] : null;

  return (
    <div className={`w-full rounded-3xl bg-slate-900/95 border-2 border-cyan-500/30 overflow-hidden shadow-2xl p-4 sm:p-6 select-none ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40 font-cyber flex items-center gap-1">
              <Brain className="w-3 h-3 text-violet-400" />
              <span>NEUROSCIENCE LAB</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono-tag">
              THE &quot;I DID THAT!&quot; NETWORK
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black font-cyber text-white tracking-tight flex items-center gap-2">
            <span>Inside Your Brain: The Sense of Agency Circuit</span>
          </h2>
        </div>

        {/* Play/Pause & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-cyber text-slate-200 transition-colors cursor-pointer"
            title={isPlayingAnimation ? 'Pause automatic tour' : 'Play automatic tour'}
          >
            {isPlayingAnimation ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isPlayingAnimation ? 'PAUSE TOUR' : 'PLAY TOUR'}</span>
          </button>

          <button
            onClick={() => {
              setActiveStep(0);
              setSelectedRegionId('agency_judge');
              setIsPlayingAnimation(false);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset to full brain view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Navigator Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {STEPS.map((s) => {
          const isActive = activeStep === s.step;
          return (
            <button
              key={s.step}
              onClick={() => {
                setActiveStep(s.step);
                setSelectedRegionId(s.highlightRegion);
                setIsPlayingAnimation(false);
              }}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="text-[10px] font-mono-tag font-bold uppercase text-cyan-400 mb-0.5">
                STEP {s.step}
              </div>
              <div className="text-xs font-bold font-cyber truncate">{s.title.replace(/^\d+\.\s*/, '')}</div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: SVG Brain Diagram on Left, Live Explanation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* SVG Diagram Canvas (7 Cols) */}
        <div className="lg:col-span-7 relative w-full bg-slate-950/90 rounded-3xl border border-white/10 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center">
          {/* Active Step Indicator Pill */}
          <div className="w-full flex items-center justify-between text-xs font-mono-tag text-slate-400 mb-2 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>LATERAL VIEW (HUMAN BRAIN)</span>
            </span>
            <span className="text-[11px] text-amber-300">
              {activeStep === 0 ? 'CLICK ANY ZONE TO EXPLORE' : `STAGE ${activeStep} OF 4 ACTIVE`}
            </span>
          </div>

          <div className="relative w-full max-w-[560px] aspect-[16/11]">
            <svg
              viewBox="0 0 760 520"
              className="w-full h-full filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
            >
              <defs>
                {/* Glow Filters */}
                <filter id="brainGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="signalPulse" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Shading Gradients */}
                <linearGradient id="cortexBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2c283d" />
                  <stop offset="50%" stopColor="#1e1b2e" />
                  <stop offset="100%" stopColor="#13111f" />
                </linearGradient>

                <linearGradient id="sneakPreviewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>

                <linearGradient id="visualFeedbackGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>

                {/* Arrow Markers */}
                <marker id="arrowPreview" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#c084fc" />
                </marker>
                <marker id="arrowAction" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
                </marker>
                <marker id="arrowFeedback" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* ===== 1. BRAIN STEM & SPINAL CORD ===== */}
              <g id="brainstem-group" opacity="0.85">
                <path
                  d="M 390 380 Q 405 440 405 510 L 435 510 Q 435 440 430 380 Z"
                  fill="#84cc16"
                  opacity="0.75"
                  stroke="#a3e635"
                  strokeWidth="2"
                />
                <text x="420" y="475" textAnchor="middle" fill="#d9f99d" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  Spinal Cord ➔ Hand
                </text>
              </g>

              {/* ===== 2. CEREBELLUM (Green / Posterior Inferior) ===== */}
              <g
                id="cerebellum-zone"
                className="cursor-pointer transition-transform hover:scale-[1.01]"
                onClick={() => {
                  setSelectedRegionId('cerebellum');
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 380 340 Q 430 320 490 330 Q 560 345 560 400 Q 550 450 470 450 Q 420 450 395 385 Z"
                  fill="#059669"
                  opacity={selectedRegionId === 'cerebellum' ? 0.95 : 0.65}
                  stroke="#34d399"
                  strokeWidth={selectedRegionId === 'cerebellum' ? 3.5 : 2}
                  filter={selectedRegionId === 'cerebellum' ? 'url(#brainGlow)' : undefined}
                />
                {/* Folia lines */}
                <path d="M 420 370 Q 480 360 520 380" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.6" />
                <path d="M 430 390 Q 480 380 520 400" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.6" />
                <path d="M 435 410 Q 470 400 500 420" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.6" />
                <text x="475" y="405" textAnchor="middle" fill="#a7f3d0" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                  CEREBELLUM
                </text>
                <text x="475" y="420" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="sans-serif">
                  (Timing &amp; Tuning)
                </text>
              </g>

              {/* ===== 3. MAIN CEREBRAL CORTEX SILHOUETTE (Dark base) ===== */}
              <path
                d="M 210 320 Q 140 280 130 220 Q 120 140 180 90 Q 250 40 370 40 Q 490 40 560 90 Q 640 150 630 240 Q 620 310 540 330 Q 460 350 420 310 Q 370 310 330 350 Q 270 360 210 320 Z"
                fill="url(#cortexBaseGrad)"
                stroke="#475569"
                strokeWidth="3"
              />

              {/* ===== 4. BRAIN REGIONS (Scientifically Accurate Lateral Lobes) ===== */}

              {/* --- A. PREFRONTAL CORTEX (DLPFC / Yellow) --- */}
              <g
                id="zone-prefrontal"
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedRegionId('prefrontal');
                  setActiveStep(1);
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 170 100 Q 125 155 132 220 Q 140 270 195 300 Q 230 305 250 250 Q 260 170 230 110 Q 200 85 170 100 Z"
                  fill="#eab308"
                  opacity={selectedRegionId === 'prefrontal' || activeStep === 1 ? 0.85 : 0.45}
                  stroke="#fde047"
                  strokeWidth={selectedRegionId === 'prefrontal' || activeStep === 1 ? 3 : 1.5}
                  filter={selectedRegionId === 'prefrontal' || activeStep === 1 ? 'url(#brainGlow)' : undefined}
                />
                <text x="185" y="190" fill="#fef08a" fontSize="13" fontWeight="900" textAnchor="middle">
                  GOAL / INTENTION
                </text>
                <text x="185" y="206" fill="#facc15" fontSize="10" textAnchor="middle" fontFamily="monospace">
                  Prefrontal Cortex (DLPFC)
                </text>
              </g>

              {/* --- B. MOTOR PLANNING AREA (Premotor & SMA / Orange) --- */}
              <g
                id="zone-planning"
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedRegionId('motor_planning');
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 230 105 Q 260 160 250 250 L 305 260 Q 320 170 300 70 Q 260 60 230 105 Z"
                  fill="#ea580c"
                  opacity={selectedRegionId === 'motor_planning' ? 0.9 : 0.45}
                  stroke="#fb923c"
                  strokeWidth={selectedRegionId === 'motor_planning' ? 3 : 1.5}
                  filter={selectedRegionId === 'motor_planning' ? 'url(#brainGlow)' : undefined}
                />
                <text x="278" y="140" fill="#ffedd5" fontSize="12" fontWeight="900" textAnchor="middle">
                  PLANNER
                </text>
                <text x="278" y="155" fill="#fed7aa" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  Premotor &amp; SMA
                </text>
              </g>

              {/* --- C. PRIMARY MOTOR CORTEX (M1 / Red - Muscle Command) --- */}
              <g
                id="zone-execution"
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedRegionId('motor_execution');
                  setActiveStep(2);
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 300 68 Q 325 170 305 260 L 350 270 Q 375 160 365 55 Q 330 52 300 68 Z"
                  fill="#e11d48"
                  opacity={selectedRegionId === 'motor_execution' || activeStep === 2 ? 0.92 : 0.45}
                  stroke="#fb7185"
                  strokeWidth={selectedRegionId === 'motor_execution' || activeStep === 2 ? 3 : 1.5}
                  filter={selectedRegionId === 'motor_execution' || activeStep === 2 ? 'url(#brainGlow)' : undefined}
                />
                <text x="335" y="125" fill="#ffe4e6" fontSize="12" fontWeight="900" textAnchor="middle">
                  ACTION
                </text>
                <text x="335" y="140" fill="#fca5a5" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  Motor Strip (M1)
                </text>
              </g>

              {/* --- D. THE AGENCY & MATCH JUDGE (Parietal / rTPJ / Angular Gyrus / Purple) --- */}
              <g
                id="zone-agency"
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedRegionId('agency_judge');
                  setActiveStep(4);
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 365 55 Q 375 160 350 270 Q 420 280 460 250 Q 490 200 480 120 Q 460 70 365 55 Z"
                  fill="#9333ea"
                  opacity={selectedRegionId === 'agency_judge' || activeStep === 4 ? 0.95 : 0.5}
                  stroke="#c084fc"
                  strokeWidth={selectedRegionId === 'agency_judge' || activeStep === 4 ? 3.5 : 2}
                  filter={selectedRegionId === 'agency_judge' || activeStep === 4 ? 'url(#brainGlow)' : undefined}
                />
                <text x="415" y="130" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
                  AGENCY JUDGE
                </text>
                <text x="415" y="147" fill="#e9d5ff" fontSize="10" textAnchor="middle" fontFamily="monospace">
                  Parietal &amp; TPJ
                </text>
                <text x="415" y="162" fill="#d8b4fe" fontSize="9" textAnchor="middle" fontWeight="bold">
                  &quot;Did I do that?&quot;
                </text>
              </g>

              {/* --- E. SENSORY & VISUAL CORTEX (Occipital & Somatosensory / Cyan) --- */}
              <g
                id="zone-sensory"
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedRegionId('sensory_vision');
                  setActiveStep(3);
                  setIsPlayingAnimation(false);
                }}
              >
                <path
                  d="M 480 120 Q 495 200 460 250 Q 530 260 595 230 Q 615 170 560 90 Q 520 80 480 120 Z"
                  fill="#0284c7"
                  opacity={selectedRegionId === 'sensory_vision' || activeStep === 3 ? 0.9 : 0.45}
                  stroke="#38bdf8"
                  strokeWidth={selectedRegionId === 'sensory_vision' || activeStep === 3 ? 3 : 1.5}
                  filter={selectedRegionId === 'sensory_vision' || activeStep === 3 ? 'url(#brainGlow)' : undefined}
                />
                <text x="545" y="160" fill="#e0f2fe" fontSize="12" fontWeight="900" textAnchor="middle">
                  EYE &amp; SENSORY
                </text>
                <text x="545" y="176" fill="#7dd3fc" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  Visual Feedback
                </text>
              </g>

              {/* --- F. TEMPORAL & AUDITORY INTEGRATION LOBE --- */}
              <path
                d="M 260 270 Q 320 270 380 280 Q 430 300 420 335 Q 360 345 280 345 Q 230 325 260 270 Z"
                fill="#1e293b"
                stroke="#64748b"
                strokeWidth="1.5"
                opacity="0.75"
              />
              <text x="330" y="315" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                Temporal &amp; Sound Integration
              </text>

              {/* ===== 5. DYNAMIC FLOW ARROWS & SNEAK PREVIEW SIGNAL ===== */}

              {/* Pathway 1: Intention ➔ Motor Command */}
              <path
                d="M 210 160 Q 250 140 310 130"
                stroke="#facc15"
                strokeWidth="3.5"
                fill="none"
                strokeDasharray="4 3"
              />

              {/* Pathway 2: Muscle Command Down to Spinal Cord / Finger */}
              <g opacity={activeStep === 2 || activeStep === 0 ? 1 : 0.3}>
                <path
                  d="M 335 170 Q 370 280 410 470"
                  stroke="#f43f5e"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="8 4"
                  markerEnd="url(#arrowAction)"
                />
                <rect x="375" y="440" width="130" height="28" rx="8" fill="#1e1b2e" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="440" y="458" fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">
                  👉 FINGER PRESSES KEY
                </text>
              </g>

              {/* Pathway 3: THE SNEAK PREVIEW (Secret Carbon Copy to Parietal Hub) */}
              {/* Scientifically: Efference Copy / Corollary Discharge, but in kid-friendly terms */}
              <g opacity={activeStep === 2 || activeStep === 4 || activeStep === 0 ? 1 : 0.35}>
                <path
                  d="M 320 60 Q 370 15 425 50"
                  stroke="url(#sneakPreviewGrad)"
                  strokeWidth="4.5"
                  fill="none"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowPreview)"
                  filter="url(#signalPulse)"
                />
                {/* Floating Label for Sneak Preview */}
                <rect x="290" y="8" width="190" height="26" rx="8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1.5" />
                <text x="385" y="25" fill="#f5d0fe" fontSize="10" fontWeight="bold" textAnchor="middle">
                  ⚡ &quot;SNEAK PREVIEW&quot; (Fast Copy)
                </text>
              </g>

              {/* Pathway 4: Live Camera Report (Sensory Feedback from Screen) */}
              <g opacity={activeStep === 3 || activeStep === 4 || activeStep === 0 ? 1 : 0.35}>
                <path
                  d="M 640 320 Q 610 240 455 180"
                  stroke="url(#visualFeedbackGrad)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowFeedback)"
                  filter="url(#signalPulse)"
                />
                <rect x="560" y="310" width="170" height="28" rx="8" fill="#0c2340" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="645" y="328" fill="#bae6fd" fontSize="10" fontWeight="bold" textAnchor="middle">
                  👀 SCREEN FEEDBACK (Eyes)
                </text>
              </g>

              {/* ===== 6. THE MOMENT OF AGENCY (Comparison Stamp) ===== */}
              {(activeStep === 4 || activeStep === 0) && (
                <g transform="translate(405, 80)">
                  <circle cx="10" cy="10" r="22" fill="#22c55e" opacity="0.9" filter="url(#brainGlow)" />
                  <path d="M 0 10 L 7 17 L 22 2" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <rect x="-30" y="36" width="80" height="20" rx="6" fill="#14532d" stroke="#4ade80" strokeWidth="1.2" />
                  <text x="10" y="50" fill="#86efac" fontSize="9" fontWeight="900" textAnchor="middle">
                    MATCH!
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Quick Legend Bar under SVG */}
          <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 pt-2 border-t border-white/5 text-[11px] font-mono-tag text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Intention
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Muscle Action
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Sneak Preview
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Eye Feedback
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Agency Match
            </span>
          </div>
        </div>

        {/* Dynamic Detail Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Step Explainer Box */}
          {currentStepData && (
            <motion.div
              key={currentStepData.step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-left space-y-1.5 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-tag font-bold uppercase tracking-wider text-cyan-300">
                  ACTIVE STAGE {currentStepData.step} / 4
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-cyber">
                  {currentStepData.badge}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black font-cyber text-amber-300">
                {currentStepData.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-body">
                {currentStepData.description}
              </p>
            </motion.div>
          )}

          {/* Selected Brain Area Details */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border-2 border-white/10 text-left space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedRegion.badgeBg} ${selectedRegion.textColor} border ${selectedRegion.borderColor} font-cyber`}>
                SELECTED BRAIN HUB
              </span>
              <span className="text-[10px] font-mono-tag text-slate-400">
                {selectedRegion.scientificName}
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black font-cyber text-white">
                {selectedRegion.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                {selectedRegion.simpleRole}
              </p>
            </div>

            {/* In-Game Connection Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-cyber font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>How this worked in {game === 'animal-mind-control' ? 'Animal Mind Control' : 'Spider-Rabbit'}:</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-body">
                {game === 'animal-mind-control' ? selectedRegion.animalGameRole : selectedRegion.spiderGameRole}
              </p>
            </div>

            {/* Secret Sauce: Why the "Sneak Preview" matters */}
            <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
              <span className="font-bold text-violet-300 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-violet-400" />
                <span>The Secret &quot;Sneak Preview&quot; Superpower:</span>
              </span>
              <p className="text-[11px] text-slate-300">
                When you move, your brain sends a secret carbon copy of your command forward to your sensory brain. When the live feedback matches your sneak preview, your brain rewards you with the instant feeling:{' '}
                <strong className="text-emerald-300 font-semibold">&quot;Yes! I am in control!&quot;</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
