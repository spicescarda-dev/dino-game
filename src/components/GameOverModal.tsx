import React, { useEffect } from 'react';
import { FriendProfile } from '../game/types';
import { RotateCcw, Users, Trophy } from 'lucide-react';

interface GameOverModalProps {
  friend: FriendProfile;
  finalScore: number;
  highScore: number;
  onRestart: () => void;
  onOpenSelector: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  friend,
  finalScore,
  highScore,
  onRestart,
  onOpenSelector,
}) => {
  const isNewHighScore = finalScore > 0 && finalScore >= highScore;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over"
      className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-5">
        {/* Friend Avatar & Status Badge */}
        <div className="relative inline-block mx-auto">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center p-2 border-2 mx-auto overflow-hidden shadow-inner"
            style={{
              backgroundColor: `${friend.accentColor}18`,
              borderColor: friend.accentColor,
            }}
          >
            <img
              src={friend.crashPortraitUrl || friend.portraitUrl}
              alt={friend.name}
              className="w-16 h-16 object-contain"
            />
          </div>
          <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
            KO Crash
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            GAME OVER
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {friend.name} collided with an obstacle!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="text-left">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Run Score
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {finalScore.toString().padStart(5, '0')}
            </span>
          </div>

          <div className="text-left relative">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              High Score
            </span>
            <span className="font-mono text-2xl font-black text-amber-500 dark:text-amber-400 tabular-nums">
              {highScore.toString().padStart(5, '0')}
            </span>
            {isNewHighScore && (
              <span className="absolute top-0 right-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-500 text-white rounded-full">
                New Best!
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
            <kbd className="hidden sm:inline-block text-xs font-mono bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100 font-normal ml-1">
              Space / Enter
            </kbd>
          </button>

          <button
            type="button"
            onClick={onOpenSelector}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Change Friend Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
