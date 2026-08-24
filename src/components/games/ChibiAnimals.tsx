import React from 'react';

export type AnimalType = 'bunny' | 'fox' | 'panda' | 'cat' | 'bear';

export interface AnimalConfig {
  id: AnimalType;
  name: string;
  species: string;
  circleColor: string;
  hexColor: string;
  glowColor: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  themeGradient: string;
  description: string;
  soundPitch: number;
}

export const ANIMAL_CONFIGS: Record<AnimalType, AnimalConfig> = {
  bunny: {
    id: 'bunny',
    name: 'Moon Rabbit',
    species: 'Moon Rabbit',
    circleColor: 'from-pink-500/30 to-rose-600/30',
    hexColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.6)',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-400',
    themeGradient: 'from-rose-500 to-pink-600',
    description: 'Bouncy, hyper-sensitive lunar spirit with quick telepathic reflexes.',
    soundPitch: 659.25, // E5
  },
  fox: {
    id: 'fox',
    name: 'Spirit Fox',
    species: 'Spirit Fox',
    circleColor: 'from-cyan-500/30 to-blue-600/30',
    hexColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-400',
    themeGradient: 'from-cyan-500 to-blue-600',
    description: 'Clever spirit fox that mirrors subtle wrist gestures and agile turns.',
    soundPitch: 587.33, // D5
  },
  panda: {
    id: 'panda',
    name: 'Bamboo Panda',
    species: 'Bamboo Guardian',
    circleColor: 'from-emerald-500/30 to-teal-600/30',
    hexColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-400',
    themeGradient: 'from-emerald-500 to-teal-600',
    description: 'Gentle, zen master panda responsive to calm, flowing brainwaves.',
    soundPitch: 523.25, // C5
  },
  cat: {
    id: 'cat',
    name: 'Star Cat',
    species: 'Star Cat',
    circleColor: 'from-amber-500/30 to-yellow-600/30',
    hexColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-400',
    themeGradient: 'from-amber-500 to-yellow-600',
    description: 'Playful celestial cat with sharp twitches and rapid curiosities.',
    soundPitch: 783.99, // G5
  },
  bear: {
    id: 'bear',
    name: 'Honey Bear',
    species: 'Honey Bear',
    circleColor: 'from-purple-500/30 to-violet-600/30',
    hexColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-400',
    themeGradient: 'from-purple-500 to-violet-600',
    description: 'Sturdy mystic bear with weighty, deliberate telepathic sway.',
    soundPitch: 440.00, // A4
  },
};

export const ANIMAL_LIST: AnimalType[] = ['bunny', 'fox', 'panda', 'cat', 'bear'];

interface ChibiAvatarProps {
  type: AnimalType;
  size?: number;
  isControlled?: boolean;
  highlight?: boolean;
  animate?: boolean;
}

export const ChibiAvatar: React.FC<ChibiAvatarProps> = ({
  type,
  size = 72,
  isControlled = false,
  highlight = false,
  animate = true,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        animate ? 'transition-transform duration-75' : ''
      }`}
      style={{ width: size, height: size }}
    >
      {/* Telepathic Aura when controlled/highlighted */}
      {(isControlled || highlight) && (
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-60 pointer-events-none"
          style={{
            backgroundColor: ANIMAL_CONFIGS[type].hexColor,
            transform: 'scale(1.25)',
          }}
        />
      )}

      {/* Main SVG Graphic */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {type === 'bunny' && <BunnySVG />}
        {type === 'fox' && <FoxSVG />}
        {type === 'panda' && <PandaSVG />}
        {type === 'cat' && <CatSVG />}
        {type === 'bear' && <BearSVG />}
      </svg>
    </div>
  );
};

// ==========================================
// 1. CHIBI BUNNY SVG
// ==========================================
const BunnySVG: React.FC = () => (
  <g>
    {/* Ears */}
    <ellipse cx="36" cy="22" rx="9" ry="20" fill="#ffffff" stroke="#f43f5e" strokeWidth="2.5" transform="rotate(-10 36 22)" />
    <ellipse cx="36" cy="23" rx="5.5" ry="14" fill="#fda4af" transform="rotate(-10 36 23)" />

    <ellipse cx="64" cy="22" rx="9" ry="20" fill="#ffffff" stroke="#f43f5e" strokeWidth="2.5" transform="rotate(10 64 22)" />
    <ellipse cx="64" cy="23" rx="5.5" ry="14" fill="#fda4af" transform="rotate(10 64 23)" />

    {/* Body */}
    <ellipse cx="50" cy="72" rx="26" ry="20" fill="#ffffff" stroke="#f43f5e" strokeWidth="2.5" />
    <ellipse cx="50" cy="74" rx="16" ry="12" fill="#ffe4e6" />

    {/* Head */}
    <circle cx="50" cy="50" r="28" fill="#ffffff" stroke="#f43f5e" strokeWidth="3" />

    {/* Anime Blush Marks */}
    <ellipse cx="30" cy="57" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
    <ellipse cx="70" cy="57" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />

    {/* Big Kawaii Anime Eyes */}
    <ellipse cx="38" cy="48" rx="5.5" ry="7" fill="#1e1b4b" />
    <circle cx="36.5" cy="45" r="2.2" fill="#ffffff" />
    <circle cx="40" cy="51" r="1.2" fill="#ffffff" />

    <ellipse cx="62" cy="48" rx="5.5" ry="7" fill="#1e1b4b" />
    <circle cx="60.5" cy="45" r="2.2" fill="#ffffff" />
    <circle cx="64" cy="51" r="1.2" fill="#ffffff" />

    {/* Cute Nose & Mouth */}
    <ellipse cx="50" cy="54" rx="2.5" ry="1.8" fill="#f43f5e" />
    <path d="M47 57 Q50 60 53 57" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Little Paws */}
    <ellipse cx="40" cy="70" rx="4.5" ry="6" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
    <ellipse cx="60" cy="70" rx="4.5" ry="6" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
  </g>
);

// ==========================================
// 2. CHIBI FOX (KITSUNE) SVG
// ==========================================
const FoxSVG: React.FC = () => (
  <g>
    {/* Bushy Tail */}
    <path
      d="M72 65 C88 55 94 75 80 88 C70 94 65 80 72 65 Z"
      fill="#f97316"
      stroke="#06b6d4"
      strokeWidth="2.5"
    />
    <path d="M84 76 C88 80 84 86 80 88 C76 89 77 84 84 76 Z" fill="#ffffff" />

    {/* Ears */}
    <polygon points="24,32 36,8 46,28" fill="#ea580c" stroke="#06b6d4" strokeWidth="2.5" />
    <polygon points="28,29 36,14 43,26" fill="#fed7aa" />

    <polygon points="76,32 64,8 54,28" fill="#ea580c" stroke="#06b6d4" strokeWidth="2.5" />
    <polygon points="72,29 64,14 57,26" fill="#fed7aa" />

    {/* Body */}
    <ellipse cx="50" cy="72" rx="24" ry="20" fill="#f97316" stroke="#06b6d4" strokeWidth="2.5" />
    <ellipse cx="50" cy="74" rx="14" ry="12" fill="#ffffff" />

    {/* Head */}
    <circle cx="50" cy="48" r="27" fill="#f97316" stroke="#06b6d4" strokeWidth="3" />

    {/* White Fox Cheek Fluff */}
    <path d="M24 50 C24 62 38 68 50 68 C62 68 76 62 76 50 C70 54 62 56 50 56 C38 56 30 54 24 50 Z" fill="#ffffff" />

    {/* Forehead Kitsune Jewel Dot */}
    <ellipse cx="50" cy="32" rx="2.5" ry="4" fill="#06b6d4" />

    {/* Blush */}
    <ellipse cx="30" cy="55" rx="5" ry="3" fill="#fdba74" opacity="0.8" />
    <ellipse cx="70" cy="55" rx="5" ry="3" fill="#fdba74" opacity="0.8" />

    {/* Kawaii Fox Eyes */}
    <ellipse cx="38" cy="46" rx="5" ry="6.5" fill="#1e1b4b" />
    <circle cx="36.5" cy="43.5" r="2" fill="#ffffff" />
    <circle cx="39.5" cy="48.5" r="1.1" fill="#ffffff" />

    <ellipse cx="62" cy="46" rx="5" ry="6.5" fill="#1e1b4b" />
    <circle cx="60.5" cy="43.5" r="2" fill="#ffffff" />
    <circle cx="63.5" cy="48.5" r="1.1" fill="#ffffff" />

    {/* Black cute snout */}
    <ellipse cx="50" cy="53" rx="3" ry="2" fill="#1e1b4b" />
    <path d="M47 56 Q50 58.5 53 56" stroke="#1e1b4b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </g>
);

// ==========================================
// 3. CHIBI PANDA SVG
// ==========================================
const PandaSVG: React.FC = () => (
  <g>
    {/* Black Round Ears */}
    <circle cx="28" cy="24" r="10" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />
    <circle cx="28" cy="24" r="5" fill="#334155" />

    <circle cx="72" cy="24" r="10" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />
    <circle cx="72" cy="24" r="5" fill="#334155" />

    {/* Body */}
    <ellipse cx="50" cy="74" rx="25" ry="20" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
    {/* Panda Black Vest/Shoulders */}
    <path d="M26 68 C35 60 65 60 74 68 C70 78 30 78 26 68 Z" fill="#1e293b" />

    {/* Head */}
    <circle cx="50" cy="50" r="28" fill="#ffffff" stroke="#10b981" strokeWidth="3" />

    {/* Black Eye Patches (Slanted Panda) */}
    <ellipse cx="36" cy="48" rx="8" ry="9" fill="#1e293b" transform="rotate(-15 36 48)" />
    <ellipse cx="64" cy="48" rx="8" ry="9" fill="#1e293b" transform="rotate(15 64 48)" />

    {/* Big Shiny Eyes */}
    <circle cx="36" cy="47" r="4.5" fill="#ffffff" />
    <circle cx="36" cy="47" r="3.2" fill="#0f172a" />
    <circle cx="35" cy="45" r="1.6" fill="#ffffff" />

    <circle cx="64" cy="47" r="4.5" fill="#ffffff" />
    <circle cx="64" cy="47" r="3.2" fill="#0f172a" />
    <circle cx="63" cy="45" r="1.6" fill="#ffffff" />

    {/* Rosy Cheeks */}
    <ellipse cx="26" cy="58" rx="5" ry="3" fill="#a7f3d0" opacity="0.8" />
    <ellipse cx="74" cy="58" rx="5" ry="3" fill="#a7f3d0" opacity="0.8" />

    {/* Panda Snout */}
    <ellipse cx="50" cy="56" rx="3.5" ry="2.2" fill="#1e293b" />
    <path d="M47 59 Q50 62 53 59" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Bamboo shoot leaf */}
    <path d="M54 59 C62 58 66 52 64 48 C60 52 56 56 54 59 Z" fill="#10b981" />
  </g>
);

// ==========================================
// 4. CHIBI CAT (NEKO) SVG
// ==========================================
const CatSVG: React.FC = () => (
  <g>
    {/* Curled Tail */}
    <path d="M72 74 C86 70 90 84 82 90 C75 92 72 84 75 78" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" />

    {/* Pointy Cat Ears */}
    <polygon points="26,30 34,10 46,26" fill="#fef08a" stroke="#f59e0b" strokeWidth="2.5" />
    <polygon points="29,28 34,16 43,25" fill="#fca5a5" />

    <polygon points="74,30 66,10 54,26" fill="#fef08a" stroke="#f59e0b" strokeWidth="2.5" />
    <polygon points="71,28 66,16 57,25" fill="#fca5a5" />

    {/* Body */}
    <ellipse cx="50" cy="72" rx="24" ry="20" fill="#fef9c3" stroke="#f59e0b" strokeWidth="2.5" />
    <ellipse cx="50" cy="74" rx="14" ry="12" fill="#ffffff" />

    {/* Head */}
    <circle cx="50" cy="48" r="27" fill="#fef9c3" stroke="#f59e0b" strokeWidth="3" />

    {/* Tiger stripes on forehead */}
    <path d="M46 26 L50 32 L54 26" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Cheek Whiskers */}
    <path d="M20 48 L12 46 M20 52 L12 52 M20 56 L13 58" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M80 48 L88 46 M80 52 L88 52 M80 56 L87 58" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />

    {/* Kawaii Anime Cat Eyes (Amber sparkle) */}
    <ellipse cx="38" cy="46" rx="5.5" ry="7" fill="#0f172a" />
    <ellipse cx="38" cy="46" rx="4" ry="5.5" fill="#d97706" />
    <ellipse cx="38" cy="46" rx="2.5" ry="4.5" fill="#0f172a" />
    <circle cx="36" cy="43" r="2" fill="#ffffff" />
    <circle cx="39.5" cy="48" r="1.1" fill="#ffffff" />

    <ellipse cx="62" cy="46" rx="5.5" ry="7" fill="#0f172a" />
    <ellipse cx="62" cy="46" rx="4" ry="5.5" fill="#d97706" />
    <ellipse cx="62" cy="46" rx="2.5" ry="4.5" fill="#0f172a" />
    <circle cx="60" cy="43" r="2" fill="#ffffff" />
    <circle cx="63.5" cy="48" r="1.1" fill="#ffffff" />

    {/* Blush */}
    <ellipse cx="28" cy="54" rx="4.5" ry="3" fill="#fca5a5" opacity="0.8" />
    <ellipse cx="72" cy="54" rx="4.5" ry="3" fill="#fca5a5" opacity="0.8" />

    {/* Cute Cat Mouth (:3) */}
    <ellipse cx="50" cy="52" rx="2.2" ry="1.5" fill="#f43f5e" />
    <path d="M46 55 Q48.5 58 50 55 Q51.5 58 54 55" stroke="#92400e" strokeWidth="2" strokeLinecap="round" fill="none" />
  </g>
);

// ==========================================
// 5. CHIBI BEAR (KUMA) SVG
// ==========================================
const BearSVG: React.FC = () => (
  <g>
    {/* Round Teddy Ears */}
    <circle cx="28" cy="25" r="10" fill="#b45309" stroke="#a855f7" strokeWidth="2.5" />
    <circle cx="28" cy="25" r="5.5" fill="#fde68a" />

    <circle cx="72" cy="25" r="10" fill="#b45309" stroke="#a855f7" strokeWidth="2.5" />
    <circle cx="72" cy="25" r="5.5" fill="#fde68a" />

    {/* Body */}
    <ellipse cx="50" cy="74" rx="25" ry="20" fill="#b45309" stroke="#a855f7" strokeWidth="2.5" />
    <ellipse cx="50" cy="76" rx="15" ry="12" fill="#fde68a" />

    {/* Head */}
    <circle cx="50" cy="50" r="28" fill="#b45309" stroke="#a855f7" strokeWidth="3" />

    {/* Big Honey Snout Area */}
    <ellipse cx="50" cy="56" rx="14" ry="10" fill="#fde68a" />
    <ellipse cx="50" cy="52" rx="4" ry="2.5" fill="#1e1b4b" />
    <path d="M47 56 Q50 59 53 56" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Big Anime Eyes */}
    <ellipse cx="37" cy="44" rx="5.5" ry="6.5" fill="#1e1b4b" />
    <circle cx="35.5" cy="42" r="2.2" fill="#ffffff" />
    <circle cx="39" cy="46" r="1.2" fill="#ffffff" />

    <ellipse cx="63" cy="44" rx="5.5" ry="6.5" fill="#1e1b4b" />
    <circle cx="61.5" cy="42" r="2.2" fill="#ffffff" />
    <circle cx="65" cy="46" r="1.2" fill="#ffffff" />

    {/* Rosy Cheeks */}
    <ellipse cx="28" cy="54" rx="5" ry="3" fill="#f472b6" opacity="0.75" />
    <ellipse cx="72" cy="54" rx="5" ry="3" fill="#f472b6" opacity="0.75" />

    {/* Heart symbol on belly */}
    <path d="M48 74 C46 71 44 72 44 74 C44 76 48 79 48 79 C48 79 52 76 52 74 C52 72 50 71 48 74 Z" fill="#a855f7" />
  </g>
);
