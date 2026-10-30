import React from 'react';
import { FriendProfile } from '../game/types';
import { Play, RotateCcw, Users } from 'lucide-react';

interface PauseModalProps {
  friend: FriendProfile;
  currentScore: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSelector: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  friend,
  currentScore,
  onResume,
  onRestart,
  onOpenSelector,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
      className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-5">
        <div>
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            {friend.name} · Running
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            GAME PAUSED
          </h2>
          <div className="mt-2 font-mono text-xl font-bold text-slate-700 dark:text-slate-300">
            Score: {currentScore.toString().padStart(5, '0')}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={onResume}
            className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume [Esc]</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Run</span>
          </button>

          <button
            type="button"
            onClick={onOpenSelector}
            className="w-full py-2 px-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Choose Different Friend</span>
          </button>
        </div>
      </div>
    </div>
  );
};
