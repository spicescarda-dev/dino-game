import React from 'react';
import { FriendProfile } from '../game/types';
import { Volume2, VolumeX, Pause, Play, Users, ArrowUp, ArrowDown } from 'lucide-react';

interface ControlsHUDProps {
  friend: FriendProfile;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenSelector: () => void;
  onTouchJump: () => void;
  onTouchDuckStart: () => void;
  onTouchDuckEnd: () => void;
}

export const ControlsHUD: React.FC<ControlsHUDProps> = ({
  friend,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onOpenSelector,
  onTouchJump,
  onTouchDuckStart,
  onTouchDuckEnd,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-3">
      {/* Top HUD utility bar */}
      <div className="flex items-center justify-between px-2">
        {/* Active Friend Tag */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center p-1 border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800"
            style={{ borderColor: friend.accentColor }}
          >
            <img
              src={friend.portraitUrl}
              alt={friend.name}
              className="w-6 h-6 object-contain"
            />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
              {friend.name}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
              {friend.soundPreset}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title={isMuted ? 'Unmute [M]' : 'Mute [M]'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title="Pause [Esc / P]"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSelector}
            aria-label="Switch friend profile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Friend</span>
          </button>
        </div>
      </div>

      {/* On-screen touch buttons for mobile / responsive play */}
      <div className="flex items-center justify-between gap-4 pt-1 sm:hidden px-2">
        <button
          type="button"
          onTouchStart={onTouchDuckStart}
          onTouchEnd={onTouchDuckEnd}
          onMouseDown={onTouchDuckStart}
          onMouseUp={onTouchDuckEnd}
          className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 active:bg-amber-500 active:text-white rounded-xl text-center font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 select-none touch-none shadow-sm"
        >
          <ArrowDown className="w-5 h-5" />
          <span>DUCK</span>
        </button>

        <button
          type="button"
          onTouchStart={onTouchJump}
          onClick={onTouchJump}
          className="flex-1 py-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-center font-extrabold flex items-center justify-center gap-2 select-none touch-none shadow-md shadow-emerald-600/30"
        >
          <ArrowUp className="w-5 h-5" />
          <span>JUMP</span>
        </button>
      </div>
    </div>
  );
};
