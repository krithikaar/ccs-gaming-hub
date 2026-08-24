import React, { useEffect, useState } from 'react';

export type BlowfishEmotion = 'joy' | 'anger' | 'fear' | 'sadness' | 'neutral';

interface ChibiBlowfishProps {
  scale?: number; // 0.7 (deflated) to 1.35 (inflated)
  emotion?: BlowfishEmotion;
  isWigglingFins?: boolean;
  isTrembling?: boolean;
  verticalDip?: number; // downward offset during sadness sigh
  breathPhase?: 'inhale' | 'exhale' | 'idle';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ChibiBlowfish: React.FC<ChibiBlowfishProps> = ({
  scale = 1.0,
  emotion = 'neutral',
  isWigglingFins = true,
  isTrembling = false,
  verticalDip = 0,
  breathPhase = 'idle',
  size = 'lg',
}) => {
  const [blink, setBlink] = useState(false);
  const [finAngle, setFinAngle] = useState(0);

  // Natural cute blinking loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3200 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Fin flutter animation loop
  useEffect(() => {
    let animId: number;
    let t = 0;
    const flutterSpeed = emotion === 'anger' ? 0.35 : emotion === 'fear' ? 0.45 : 0.18;

    const loop = () => {
      t += flutterSpeed;
      setFinAngle(Math.sin(t) * (emotion === 'fear' ? 22 : 14));
      animId = requestAnimationFrame(loop);
    };

    if (isWigglingFins) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isWigglingFins, emotion]);

  const sizePixels = {
    sm: 120,
    md: 180,
    lg: 260,
    xl: 320,
  }[size];

  // Radial nub spikes surrounding spherical body (8 evenly distributed soft rounded nubs)
  const nubAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  // Base Body Radius
  const baseR = 72;

  // Emotion-specific aura & blush styles
  const getGlowColor = () => {
    switch (emotion) {
      case 'joy':
        return 'rgba(250, 204, 21, 0.45)';
      case 'anger':
        return 'rgba(239, 68, 68, 0.55)';
      case 'fear':
        return 'rgba(6, 182, 212, 0.55)';
      case 'sadness':
        return 'rgba(96, 165, 250, 0.45)';
      default:
        return 'rgba(56, 189, 248, 0.3)';
    }
  };

  const getCheekColor = () => {
    switch (emotion) {
      case 'joy':
        return '#f472b6';
      case 'anger':
        return '#ef4444';
      case 'fear':
        return '#93c5fd';
      case 'sadness':
        return '#a5b4fc';
      default:
        return '#fda4af';
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none transition-transform duration-75 ${
        isTrembling ? 'animate-shiver' : ''
      }`}
      style={{
        width: sizePixels,
        height: sizePixels,
        transform: `translateY(${verticalDip}px) scale(${scale})`,
      }}
    >
      {/* Dynamic Ambient Breathing Aura Glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-300"
        style={{
          width: baseR * 2.35,
          height: baseR * 2.35,
          backgroundColor: getGlowColor(),
          filter: 'blur(24px)',
          opacity: breathPhase === 'inhale' ? 0.9 : breathPhase === 'exhale' ? 0.45 : 0.6,
        }}
      />

      <svg
        viewBox="-110 -110 220 220"
        className="w-full h-full drop-shadow-2xl overflow-visible"
      >
        <defs>
          {/* Body Golden-Yellow Gradient */}
          <radialGradient id="blowfishBodyGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="90%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>

          {/* Creamy Off-White Belly Gradient */}
          <linearGradient id="blowfishBellyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>

          {/* Fin Gradient */}
          <linearGradient id="blowfishFinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* 1. SOFT ROUNDED NUB SPIKES (Radially Spaced) */}
        <g id="nub-spikes">
          {nubAngles.map((deg, idx) => {
            const rad = (deg * Math.PI) / 180;
            // Place nubs around body edge
            const nx = Math.cos(rad) * (baseR - 2);
            const ny = Math.sin(rad) * (baseR - 2);
            return (
              <g
                key={idx}
                transform={`translate(${nx}, ${ny}) rotate(${deg + 90})`}
              >
                <path
                  d="M -7,0 C -6,-10 6,-10 7,0 Z"
                  fill="#ca8a04"
                  stroke="#b45309"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </g>

        {/* 2. STUBBY FLAPPABLE SIDE FINS (Left & Right) */}
        {/* Left Fin */}
        <g
          transform={`translate(-${baseR - 8}, 10) rotate(${-finAngle - 15})`}
          className="transition-transform duration-75"
        >
          <path
            d="M 0,0 C -22,-12 -28,16 -2,12 Z"
            fill="url(#blowfishFinGrad)"
            stroke="#ca8a04"
            strokeWidth="2"
          />
          {/* Fin ridges */}
          <path
            d="M -6,0 C -16,2 -18,8 -2,10"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1"
            opacity="0.6"
          />
        </g>

        {/* Right Fin */}
        <g
          transform={`translate(${baseR - 8}, 10) rotate(${finAngle + 15})`}
          className="transition-transform duration-75"
        >
          <path
            d="M 0,0 C 22,-12 28,16 2,12 Z"
            fill="url(#blowfishFinGrad)"
            stroke="#ca8a04"
            strokeWidth="2"
          />
          {/* Fin ridges */}
          <path
            d="M 6,0 C 16,2 18,8 2,10"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1"
            opacity="0.6"
          />
        </g>

        {/* 3. PERFECTLY SPHERICAL CHIBI BODY */}
        <circle
          cx="0"
          cy="0"
          r={baseR}
          fill="url(#blowfishBodyGrad)"
          stroke="#b45309"
          strokeWidth="3.5"
        />

        {/* 4. CREAMY OFF-WHITE BELLY OVAL */}
        <ellipse
          cx="0"
          cy="26"
          rx={baseR * 0.72}
          ry={baseR * 0.48}
          fill="url(#blowfishBellyGrad)"
          stroke="#eab308"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Cute subtle belly texture stripes */}
        <path
          d="M -30,34 Q 0,44 30,34"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M -22,46 Q 0,54 22,46"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* 5. ROSY CHEEK PATCHES */}
        <ellipse
          cx="-42"
          cy="8"
          rx="12"
          ry="7"
          fill={getCheekColor()}
          opacity="0.6"
        />
        <ellipse
          cx="42"
          cy="8"
          rx="12"
          ry="7"
          fill={getCheekColor()}
          opacity="0.6"
        />

        {/* 6. LARGE EXPRESSIVE ANIME-STYLE EYES */}
        {/* Left Eye */}
        <g transform="translate(-30, -12)">
          {blink ? (
            // Blinking Curved Eye
            <path
              d="M -14,0 Q 0,8 14,0"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : emotion === 'joy' ? (
            // Joyful Happy Crescent Eyes ^^
            <path
              d="M -14,4 Q 0,-10 14,4"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          ) : emotion === 'sadness' ? (
            // Droopy sad eyes with teardrop
            <g>
              <ellipse cx="0" cy="0" rx="13" ry="15" fill="#0f172a" />
              {/* Highlight glints */}
              <circle cx="-3" cy="-4" r="5" fill="#ffffff" />
              <circle cx="4" cy="5" r="2.5" fill="#ffffff" />
              {/* Teardrop under eye */}
              <path
                d="M 6,14 C 10,18 2,24 6,24 C 10,24 10,18 6,14 Z"
                fill="#60a5fa"
              />
            </g>
          ) : (
            // Standard / Anger / Fear Wide Anime Eyes
            <g>
              <ellipse
                cx="0"
                cy="0"
                rx={emotion === 'fear' ? 14 : 12}
                ry={emotion === 'fear' ? 17 : 15}
                fill="#0f172a"
              />
              {/* Anime High Glints */}
              <circle
                cx="-3"
                cy="-4"
                r={emotion === 'fear' ? 3.5 : 4.5}
                fill="#ffffff"
              />
              <circle
                cx="4"
                cy="5"
                r={emotion === 'fear' ? 1.5 : 2.5}
                fill="#ffffff"
              />
            </g>
          )}

          {/* Eyebrows */}
          {emotion === 'anger' && (
            <path
              d="M -16,-16 L 14,-8"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          )}
          {emotion === 'fear' && (
            <path
              d="M -14,-12 Q 0,-18 14,-10"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {emotion === 'sadness' && (
            <path
              d="M -14,-10 L 14,-16"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Right Eye */}
        <g transform="translate(30, -12)">
          {blink ? (
            <path
              d="M -14,0 Q 0,8 14,0"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : emotion === 'joy' ? (
            <path
              d="M -14,4 Q 0,-10 14,4"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          ) : emotion === 'sadness' ? (
            <g>
              <ellipse cx="0" cy="0" rx="13" ry="15" fill="#0f172a" />
              <circle cx="-3" cy="-4" r="5" fill="#ffffff" />
              <circle cx="4" cy="5" r="2.5" fill="#ffffff" />
              {/* Teardrop */}
              <path
                d="M -6,14 C -10,18 -2,24 -6,24 C -10,24 -10,18 -6,14 Z"
                fill="#60a5fa"
              />
            </g>
          ) : (
            <g>
              <ellipse
                cx="0"
                cy="0"
                rx={emotion === 'fear' ? 14 : 12}
                ry={emotion === 'fear' ? 17 : 15}
                fill="#0f172a"
              />
              <circle
                cx="-3"
                cy="-4"
                r={emotion === 'fear' ? 3.5 : 4.5}
                fill="#ffffff"
              />
              <circle
                cx="4"
                cy="5"
                r={emotion === 'fear' ? 1.5 : 2.5}
                fill="#ffffff"
              />
            </g>
          )}

          {/* Eyebrows */}
          {emotion === 'anger' && (
            <path
              d="M -14,-8 L 16,-16"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          )}
          {emotion === 'fear' && (
            <path
              d="M -14,-10 Q 0,-18 14,-12"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {emotion === 'sadness' && (
            <path
              d="M -14,-16 L 14,-10"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* 7. TINY ROUND OPEN MOUTH (Expands on Inhale, Pouts on Exhale) */}
        <g transform="translate(0, 10)">
          {emotion === 'joy' ? (
            // Wide happy smile
            <path
              d="M -12,0 Q 0,14 12,0 Z"
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth="2"
            />
          ) : emotion === 'sadness' ? (
            // Downturned trembling sad mouth
            <path
              d="M -10,6 Q 0,-4 10,6"
              fill="none"
              stroke="#7f1d1d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : emotion === 'anger' ? (
            // Tense grimace / jagged pout
            <path
              d="M -10,4 L -4,0 L 4,4 L 10,0"
              fill="none"
              stroke="#7f1d1d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : breathPhase === 'inhale' ? (
            // Round open O mouth for inhaling bubbles
            <ellipse
              cx="0"
              cy="2"
              rx="7"
              ry="9"
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth="2"
            />
          ) : (
            // Cute tiny puckered mouth
            <circle
              cx="0"
              cy="2"
              r="4.5"
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth="1.5"
            />
          )}
        </g>

        {/* 8. EMOTION QUIRK OVERLAYS */}
        {emotion === 'joy' && (
          <g>
            <text x="-48" y="-36" fontSize="16" fill="#fbbf24">✨</text>
            <text x="36" y="-40" fontSize="18" fill="#fbbf24">🌟</text>
          </g>
        )}
        {emotion === 'anger' && (
          <g>
            {/* Angry Steam Mark 💢 */}
            <path
              d="M 44,-36 L 56,-36 M 50,-42 L 50,-30 M 46,-40 L 54,-32 M 54,-40 L 46,-32"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
        {emotion === 'fear' && (
          <g>
            {/* Cold Sweat Drops 💧 */}
            <path
              d="M -50,-24 C -46,-20 -54,-14 -50,-14 C -46,-14 -46,-20 -50,-24 Z"
              fill="#38bdf8"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
