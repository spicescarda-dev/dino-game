import React, { useState, useRef } from 'react';
import { FriendProfile } from '../game/types';
import { soundEngine } from '../game/soundEngine';
import { Volume2, Upload, RotateCcw, Play, Plus, Check, Sparkles, Music, Sliders } from 'lucide-react';
import { generateAvatarSvg } from '../game/friendProfiles';
import { AssetUploaderModal } from './AssetUploaderModal';

interface FriendSelectorProps {
  profiles: Record<string, FriendProfile>;
  activeFriendId: string;
  onSelectFriend: (profile: FriendProfile) => void;
  onUpdateProfile: (profile: FriendProfile) => void;
  onAddNewProfile: (newProfile: FriendProfile) => void;
  onStartGame: () => void;
  highScore: number;
}

export const FriendSelector: React.FC<FriendSelectorProps> = ({
  profiles,
  activeFriendId,
  onSelectFriend,
  onUpdateProfile,
  onAddNewProfile,
  onStartGame,
  highScore,
}) => {
  const currentProfile = profiles[activeFriendId] || Object.values(profiles)[0];
  const [avatarPreviewState, setAvatarPreviewState] = useState<'run' | 'duck' | 'crash'>('run');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPreset, setNewFriendPreset] = useState<FriendProfile['soundPreset']>('retro-arcade');

  // File input refs for asset slots
  const portraitInputRef = useRef<HTMLInputElement | null>(null);
  const jumpSoundInputRef = useRef<HTMLInputElement | null>(null);
  const duckSoundInputRef = useRef<HTMLInputElement | null>(null);
  const gameoverSoundInputRef = useRef<HTMLInputElement | null>(null);

  // Handle friend selection
  const handleSelect = async (profile: FriendProfile) => {
    onSelectFriend(profile);
    await soundEngine.preloadProfileAssets(profile);
    soundEngine.previewSound(profile, 'jump');
  };

  // Upload custom portrait image
  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated: FriendProfile = {
        ...currentProfile,
        portraitUrl: dataUrl,
        duckPortraitUrl: dataUrl, // Image can be used across states
        crashPortraitUrl: dataUrl,
      };
      onUpdateProfile(updated);
    };
    reader.readAsDataURL(file);
  };

  // Upload custom audio file for asset slots (jump.mp3, duck.mp3, gameover.mp3)
  const handleAudioUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    eventSlot: 'jump' | 'duck' | 'gameover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const updated: FriendProfile = {
        ...currentProfile,
        customSounds: {
          ...currentProfile.customSounds,
          [eventSlot]: {
            fileName: file.name,
            dataUrl,
          },
        },
      };
      onUpdateProfile(updated);
      await soundEngine.preloadProfileAssets(updated);
      soundEngine.previewSound(updated, eventSlot);
    };
    reader.readAsDataURL(file);
  };

  // Reset assets to default
  const handleResetAssets = async () => {
    const defaultColor = currentProfile.accentColor;
    const defaultRun = generateAvatarSvg(currentProfile.name, defaultColor, '#1e293b', 'headband', 'run');
    const defaultDuck = generateAvatarSvg(currentProfile.name, defaultColor, '#1e293b', 'headband', 'duck');
    const defaultCrash = generateAvatarSvg(currentProfile.name, defaultColor, '#1e293b', 'headband', 'crash');

    const updated: FriendProfile = {
      ...currentProfile,
      portraitUrl: defaultRun,
      duckPortraitUrl: defaultDuck,
      crashPortraitUrl: defaultCrash,
      customSounds: {},
    };
    onUpdateProfile(updated);
    await soundEngine.preloadProfileAssets(updated);
  };

  // Create brand new friend profile
  const handleCreateFriend = () => {
    if (!newFriendName.trim()) return;
    const colors = ['#06b6d4', '#ec4899', '#84cc16', '#3b82f6', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = newFriendName.toLowerCase().replace(/\s+/g, '-');

    const newProfile: FriendProfile = {
      id,
      name: newFriendName.trim(),
      subtitle: 'Custom Friend Runner',
      accentColor: randomColor,
      portraitUrl: generateAvatarSvg(newFriendName, randomColor, '#334155', 'glasses', 'run'),
      duckPortraitUrl: generateAvatarSvg(newFriendName, randomColor, '#334155', 'glasses', 'duck'),
      crashPortraitUrl: generateAvatarSvg(newFriendName, randomColor, '#334155', 'glasses', 'crash'),
      soundPaths: {
        jump: `/assets/sounds/${id}/jump.mp3`,
        duck: `/assets/sounds/${id}/duck.mp3`,
        gameover: `/assets/sounds/${id}/gameover.mp3`,
      },
      soundPreset: newFriendPreset,
      stats: {
        gamesPlayed: 0,
        highScore: 0,
        totalDistance: 0,
      },
    };

    onAddNewProfile(newProfile);
    setIsCreatingNew(false);
    setNewFriendName('');
  };

  const getActiveDisplayImage = () => {
    if (avatarPreviewState === 'duck' && currentProfile.duckPortraitUrl) {
      return currentProfile.duckPortraitUrl;
    }
    if (avatarPreviewState === 'crash' && currentProfile.crashPortraitUrl) {
      return currentProfile.crashPortraitUrl;
    }
    return currentProfile.portraitUrl;
  };

  return (
    <div
      role="region"
      aria-label="Friend Selector and Login System"
      className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Friend Profile Runner
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Select Your Friend Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pick a friend to run as! Each profile features custom portrait sprites and zero-latency sound effects.
          </p>
        </div>

        {/* Action Controls & High Score */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsUploaderOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photos & Sounds Studio</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              All-Time Best
            </span>
            <span className="font-mono text-lg font-black text-amber-500 dark:text-amber-400">
              {highScore.toString().padStart(5, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Friend Profiles Tab Grid */}
      <div>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
          Choose Friend:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.values(profiles).map((prof) => {
            const isSelected = prof.name === currentProfile.name;
            return (
              <button
                key={prof.name}
                type="button"
                onClick={() => handleSelect(prof)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: `${prof.accentColor}18` }}
                >
                  <img
                    src={prof.portraitUrl}
                    alt={prof.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {prof.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    {prof.soundPreset}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Add custom friend button */}
          <button
            type="button"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/30 text-slate-600 dark:text-slate-400 transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* New Friend Creator Drawer */}
      {isCreatingNew && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Create Custom Friend Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Friend Name:
              </label>
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="e.g. Sam, Riley, Chris"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Sound Theme:
              </label>
              <select
                value={newFriendPreset}
                onChange={(e) => setNewFriendPreset(e.target.value as FriendProfile['soundPreset'])}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="retro-arcade">Retro Arcade (8-bit)</option>
                <option value="cartoon-boing">Cartoon Boing (Playful)</option>
                <option value="synth-wave">Synthwave (Electronic)</option>
                <option value="8bit-hero">8-Bit Hero</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleCreateFriend}
                disabled={!newFriendName.trim()}
                className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Save Friend
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Profile & Asset Slots Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80">
        {/* Left column: Portrait preview & animation states */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Runner Avatar Sprite Slot
          </span>

          {/* Avatar Canvas/Image Frame */}
          <div
            className="w-36 h-36 rounded-2xl flex items-center justify-center p-3 border-2 relative overflow-hidden transition-all shadow-inner"
            style={{
              backgroundColor: `${currentProfile.accentColor}12`,
              borderColor: currentProfile.accentColor,
            }}
          >
            <img
              src={getActiveDisplayImage()}
              alt={`${currentProfile.name} avatar`}
              className="w-24 h-24 object-contain transition-transform duration-150"
            />
            {avatarPreviewState === 'duck' && (
              <span className="absolute bottom-1 right-2 text-[10px] font-mono font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                Ducking (28px)
              </span>
            )}
            {avatarPreviewState === 'crash' && (
              <span className="absolute bottom-1 right-2 text-[10px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded">
                KO Crash
              </span>
            )}
          </div>

          {/* Stance preview selector */}
          <div className="flex gap-1.5 mt-3">
            {(['run', 'duck', 'crash'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAvatarPreviewState(mode)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  avatarPreviewState === mode
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {mode === 'run' ? 'Running' : mode === 'duck' ? 'Ducking' : 'Game Over'}
              </button>
            ))}
          </div>

          {/* Profile Name & Subtitle */}
          <div className="text-center mt-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {currentProfile.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentProfile.subtitle}
            </p>
          </div>

          {/* Portrait Asset Slot upload action */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="file"
              ref={portraitInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePortraitUpload}
            />
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Portrait Image
            </button>
            <button
              type="button"
              title="Reset to default avatar"
              onClick={handleResetAssets}
              className="py-2 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right column: Audio Asset Slots mapping (jump.mp3, duck.mp3, gameover.mp3) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-emerald-600" />
                Custom Audio Asset Slots
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Zero-Latency Preloaded
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Slot 1: jump.mp3 */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      jump.mp3
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                      Space / Up
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentProfile.customSounds?.jump?.fileName || `${currentProfile.soundPreset} synth`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    ref={jumpSoundInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleAudioUpload(e, 'jump')}
                  />
                  <button
                    type="button"
                    onClick={() => soundEngine.previewSound(currentProfile, 'jump')}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors"
                    title="Preview jump sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpSoundInputRef.current?.click()}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    title="Upload custom jump.mp3"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slot 2: duck.mp3 */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      duck.mp3
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-medium">
                      Down Arrow
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentProfile.customSounds?.duck?.fileName || `${currentProfile.soundPreset} synth`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    ref={duckSoundInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleAudioUpload(e, 'duck')}
                  />
                  <button
                    type="button"
                    onClick={() => soundEngine.previewSound(currentProfile, 'duck')}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900 text-slate-700 dark:text-slate-300 hover:text-amber-700 transition-colors"
                    title="Preview duck sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duckSoundInputRef.current?.click()}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    title="Upload custom duck.mp3"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slot 3: gameover.mp3 */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      gameover.mp3
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-medium">
                      Collision Event
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentProfile.customSounds?.gameover?.fileName || `${currentProfile.soundPreset} synth`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    ref={gameoverSoundInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleAudioUpload(e, 'gameover')}
                  />
                  <button
                    type="button"
                    onClick={() => soundEngine.previewSound(currentProfile, 'gameover')}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900 text-slate-700 dark:text-slate-300 hover:text-rose-700 transition-colors"
                    title="Preview gameover sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => gameoverSoundInputRef.current?.click()}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    title="Upload custom gameover.mp3"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Start CTA Handshake */}
          <div className="pt-2">
            <button
              type="button"
              data-start="true"
              onClick={onStartGame}
              className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Run as {currentProfile.name}</span>
              <kbd className="hidden sm:inline-block text-xs font-mono bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100 font-normal">
                Press Space / Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Control Hints Bar */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span><strong className="text-slate-700 dark:text-slate-300">Space / Up</strong> Jump (hold for height)</span>
        <span><strong className="text-slate-700 dark:text-slate-300">Down Arrow</strong> Duck (shrinks collision box)</span>
        <span><strong className="text-slate-700 dark:text-slate-300">Down (mid-air)</strong> Fast drop</span>
        <span><strong className="text-slate-700 dark:text-slate-300">Esc / P</strong> Pause</span>
      </div>

      {/* Asset Uploader Studio Modal */}
      <AssetUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        currentProfile={currentProfile}
        onSaveProfile={(updated) => {
          onUpdateProfile(updated);
        }}
      />
    </div>
  );
};
