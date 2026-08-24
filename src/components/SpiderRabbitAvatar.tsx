import React from 'react';

interface SpiderRabbitAvatarProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  animate?: boolean;
}

export const SpiderRabbitAvatar: React.FC<SpiderRabbitAvatarProps> = ({
  className = '',
  size = 'md',
  animate = false,
}) => {
  // Size dimensions in pixels
  const sizeMap = {
    xs: 24,
    sm: 36,
    md: 48,
    lg: 64,
    xl: 88,
    '2xl': 128,
    hero: 160,
  };

  const dim = sizeMap[size] || 48;

  return (
    <div
      className={`inline-flex items-center justify-center relative select-none ${className} ${
        animate ? 'hover:scale-105 transition-transform duration-300' : ''
      }`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 100 110"
        width={dim}
        height={dim}
        className="w-full h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="suitRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          <linearGradient id="suitBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="furWhite" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <linearGradient id="eyeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Group centered */}
        <g filter="url(#softGlow)">
          {/* ================= BACK / EARS ================= */}
          {/* Left Rabbit Ear */}
          <g>
            {/* Outer Ear with Mask Red Hood */}
            <path
              d="M 33 42 C 24 25, 20 4, 30 2 C 40 0, 43 20, 39 42 Z"
              fill="url(#suitRed)"
              stroke="#991b1b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Inner Ear Spider Web Suit Lining */}
            <path
              d="M 32 38 C 26 23, 23 8, 30 6 C 36 4, 38 19, 36 38 Z"
              fill="url(#suitBlue)"
              opacity="0.85"
            />
            {/* Web lines on Left Ear */}
            <path d="M 30 6 L 35 37" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
            <path d="M 27 18 Q 30 20 34 18" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" fill="none" />
            <path d="M 29 27 Q 32 29 36 27" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" fill="none" />
          </g>

          {/* Right Rabbit Ear */}
          <g>
            {/* Outer Ear with Mask Red Hood */}
            <path
              d="M 67 42 C 76 25, 80 4, 70 2 C 60 0, 57 20, 61 42 Z"
              fill="url(#suitRed)"
              stroke="#991b1b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Inner Ear Spider Web Suit Lining */}
            <path
              d="M 68 38 C 74 23, 77 8, 70 6 C 64 4, 62 19, 64 38 Z"
              fill="url(#suitBlue)"
              opacity="0.85"
            />
            {/* Web lines on Right Ear */}
            <path d="M 70 6 L 65 37" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
            <path d="M 66 18 Q 70 20 73 18" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" fill="none" />
            <path d="M 64 27 Q 68 29 71 27" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" fill="none" />
          </g>

          {/* Cute Fluffy Bunny Tail */}
          <ellipse cx="50" cy="98" rx="8" ry="6" fill="url(#furWhite)" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* ================= FULL CHIBI BODY & LEGS ================= */}
          {/* Feet / Boots (Red Superhero Boots) */}
          {/* Left Foot */}
          <ellipse
            cx="34"
            cy="98"
            rx="10"
            ry="7"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="1.8"
          />
          {/* Right Foot */}
          <ellipse
            cx="66"
            cy="98"
            rx="10"
            ry="7"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="1.8"
          />

          {/* Chibi Torso (Blue Suit with Red Chest V) */}
          <path
            d="M 32 68 C 30 84, 34 94, 50 94 C 66 94, 70 84, 68 68 C 65 65, 35 65, 32 68 Z"
            fill="url(#suitBlue)"
            stroke="#1e3a8a"
            strokeWidth="2"
          />

          {/* Red Chest Inset */}
          <path
            d="M 38 66 Q 50 70 62 66 L 58 88 Q 50 92 42 88 Z"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="1.5"
          />

          {/* Chest Webbing */}
          <path d="M 50 68 L 50 90" stroke="#000000" strokeWidth="1" opacity="0.5" />
          <path d="M 42 74 Q 50 78 58 74" stroke="#000000" strokeWidth="1" opacity="0.5" fill="none" />
          <path d="M 44 82 Q 50 85 56 82" stroke="#000000" strokeWidth="1" opacity="0.5" fill="none" />

          {/* Tiny Spider Emblem on Chest */}
          <circle cx="50" cy="78" r="2.5" fill="#0f172a" />
          <path d="M 46 76 L 54 80 M 54 76 L 46 80" stroke="#0f172a" strokeWidth="1.2" />

          {/* Chibi Paws / Hands */}
          {/* Left Paw */}
          <ellipse
            cx="26"
            cy="76"
            rx="6.5"
            ry="6.5"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          {/* Right Paw */}
          <ellipse
            cx="74"
            cy="76"
            rx="6.5"
            ry="6.5"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="1.5"
          />

          {/* ================= CHIBI HEAD & SPIDER-MAN MASK ================= */}
          {/* Chubby Round Head */}
          <path
            d="M 50 25 C 28 25, 20 38, 20 52 C 20 66, 32 72, 50 72 C 68 72, 80 66, 80 52 C 80 38, 72 25, 50 25 Z"
            fill="url(#suitRed)"
            stroke="#991b1b"
            strokeWidth="2.5"
          />

          {/* Spider-Man Webbing Lines on Mask */}
          {/* Vertical & Radial Web Lines */}
          <path d="M 50 26 L 50 71" stroke="#0f172a" strokeWidth="1.2" opacity="0.75" />
          <path d="M 22 52 Q 50 50 78 52" stroke="#0f172a" strokeWidth="1.2" opacity="0.75" fill="none" />
          <path d="M 28 36 Q 50 42 72 36" stroke="#0f172a" strokeWidth="1.2" opacity="0.75" fill="none" />
          <path d="M 26 62 Q 50 58 74 62" stroke="#0f172a" strokeWidth="1.2" opacity="0.75" fill="none" />
          
          {/* Diagonal Radials */}
          <path d="M 32 30 L 68 66" stroke="#0f172a" strokeWidth="1.1" opacity="0.6" />
          <path d="M 68 30 L 32 66" stroke="#0f172a" strokeWidth="1.1" opacity="0.6" />

          {/* ================= SPIDER-MAN HERO MASK EYES ================= */}
          {/* Left Mask Eye */}
          <g>
            {/* Black Bold Eye Border */}
            <path
              d="M 30 45 C 32 38, 42 39, 46 47 C 45 54, 34 56, 30 45 Z"
              fill="#0f172a"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* White Luminous Lens */}
            <path
              d="M 32 45 C 34 40, 40 41, 43 47 C 42 52, 35 53, 32 45 Z"
              fill="url(#eyeGlow)"
            />
            {/* Eye Highlight shine */}
            <circle cx="37" cy="44" r="1.5" fill="#ffffff" />
          </g>

          {/* Right Mask Eye */}
          <g>
            {/* Black Bold Eye Border */}
            <path
              d="M 70 45 C 68 38, 58 39, 54 47 C 55 54, 66 56, 70 45 Z"
              fill="#0f172a"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* White Luminous Lens */}
            <path
              d="M 68 45 C 66 40, 60 41, 57 47 C 58 52, 65 53, 68 45 Z"
              fill="url(#eyeGlow)"
            />
            {/* Eye Highlight shine */}
            <circle cx="63" cy="44" r="1.5" fill="#ffffff" />
          </g>

          {/* Cute Bunny Nose / Snout detail */}
          <ellipse cx="50" cy="56" rx="2.5" ry="1.8" fill="#fda4af" stroke="#f43f5e" strokeWidth="0.8" />
          {/* Subtle chibi mouth */}
          <path d="M 48 58 Q 50 60 52 58" stroke="#000000" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* Cute Rosy Cheek Glows on Mask */}
          <ellipse cx="26" cy="56" rx="4" ry="2.5" fill="#fda4af" opacity="0.4" />
          <ellipse cx="74" cy="56" rx="4" ry="2.5" fill="#fda4af" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
};
