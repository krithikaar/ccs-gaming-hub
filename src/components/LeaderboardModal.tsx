import React from 'react';
import { GameId, UserProfile } from '../types';
import { LeaderboardView } from './LeaderboardView';
import { X } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameId?: GameId;
  profile?: UserProfile | null;
  onPlayGame?: (gameId: GameId) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  initialGameId = 'animal-mind-control',
  profile,
  onPlayGame,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#020617] border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(34,211,238,0.2)] my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors z-20 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <LeaderboardView
          initialGameId={initialGameId}
          profile={profile}
          onClose={onClose}
          onPlayGame={(gId) => {
            onClose();
            if (onPlayGame) {
              onPlayGame(gId);
            }
          }}
          isEmbeddedInGame={false}
        />
      </div>
    </div>
  );
};
