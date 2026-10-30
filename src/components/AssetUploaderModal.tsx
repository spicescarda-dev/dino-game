import React, { useState, useRef, useEffect } from 'react';
import { FriendProfile } from '../game/types';
import { soundEngine } from '../game/soundEngine';
import { storeCustomProfile, storeMediaAsset } from '../game/assetStorage';
import {
  Upload,
  Mic,
  Square,
  Play,
  RotateCcw,
  Check,
  X,
  Volume2,
  Sparkles,
  Camera,
  Music,
} from 'lucide-react';
import { generateAvatarSvg } from '../game/friendProfiles';

interface AssetUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: FriendProfile;
  onSaveProfile: (updatedProfile: FriendProfile) => void;
}

export const AssetUploaderModal: React.FC<AssetUploaderModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentProfile.name);
  const [subtitle, setSubtitle] = useState(currentProfile.subtitle);
  const [accentColor, setAccentColor] = useState(currentProfile.accentColor);
  const [soundPreset, setSoundPreset] = useState(currentProfile.soundPreset);

  // Portrait images
  const [portraitUrl, setPortraitUrl] = useState(currentProfile.portraitUrl);
  const [duckPortraitUrl, setDuckPortraitUrl] = useState(currentProfile.duckPortraitUrl || currentProfile.portraitUrl);
  const [crashPortraitUrl, setCrashPortraitUrl] = useState(currentProfile.crashPortraitUrl || currentProfile.portraitUrl);

  // Sound slots
  const [customSounds, setCustomSounds] = useState(currentProfile.customSounds || {});

  // Mic recording state
  const [recordingSlot, setRecordingSlot] = useState<'jump' | 'duck' | 'gameover' | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Hidden file input refs
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const duckPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const crashPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const jumpSoundInputRef = useRef<HTMLInputElement | null>(null);
  const duckSoundInputRef = useRef<HTMLInputElement | null>(null);
  const gameoverSoundInputRef = useRef<HTMLInputElement | null>(null);

  // Reset local state when opened with a new profile
  useEffect(() => {
    if (isOpen) {
      setName(currentProfile.name);
      setSubtitle(currentProfile.subtitle);
      setAccentColor(currentProfile.accentColor);
      setSoundPreset(currentProfile.soundPreset);
      setPortraitUrl(currentProfile.portraitUrl);
      setDuckPortraitUrl(currentProfile.duckPortraitUrl || currentProfile.portraitUrl);
      setCrashPortraitUrl(currentProfile.crashPortraitUrl || currentProfile.portraitUrl);
      setCustomSounds(currentProfile.customSounds || {});
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  // Handle Photo Upload with automatic squish & crash generation
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'main' | 'duck' | 'crash'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      if (type === 'main') {
        setPortraitUrl(dataUrl);
        // Also default duck and crash to this photo if they weren't explicitly set
        setDuckPortraitUrl(dataUrl);
        setCrashPortraitUrl(dataUrl);
        await storeMediaAsset(`${name}_portrait`, dataUrl);
      } else if (type === 'duck') {
        setDuckPortraitUrl(dataUrl);
        await storeMediaAsset(`${name}_duck_portrait`, dataUrl);
      } else {
        setCrashPortraitUrl(dataUrl);
        await storeMediaAsset(`${name}_crash_portrait`, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Audio File Upload
  const handleAudioUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 'jump' | 'duck' | 'gameover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      const updated = {
        ...customSounds,
        [slot]: {
          fileName: file.name,
          dataUrl,
        },
      };
      setCustomSounds(updated);
      await storeMediaAsset(`${name}_sound_${slot}`, dataUrl);

      // Instant preview
      const tempProfile: FriendProfile = {
        ...currentProfile,
        customSounds: updated,
      };
      await soundEngine.preloadProfileAssets(tempProfile);
      soundEngine.previewSound(tempProfile, slot);
    };
    reader.readAsDataURL(file);
  };

  // In-Browser Microphone Recording
  const startRecording = async (slot: 'jump' | 'duck' | 'gameover') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const updated = {
            ...customSounds,
            [slot]: {
              fileName: `mic_recorded_${slot}.webm`,
              dataUrl,
            },
          };
          setCustomSounds(updated);
          await storeMediaAsset(`${name}_sound_${slot}`, dataUrl);

          // Preview recorded sound
          const tempProfile: FriendProfile = {
            ...currentProfile,
            customSounds: updated,
          };
          await soundEngine.preloadProfileAssets(tempProfile);
          soundEngine.previewSound(tempProfile, slot);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecordingSlot(slot);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 4) {
            // Auto stop after 5s
            stopRecording();
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordingSlot(null);
  };

  // Reset to default vector avatar and sounds
  const handleResetToDefault = () => {
    const defaultRun = generateAvatarSvg(name, accentColor, '#1e293b', 'headband', 'run');
    const defaultDuck = generateAvatarSvg(name, accentColor, '#1e293b', 'headband', 'duck');
    const defaultCrash = generateAvatarSvg(name, accentColor, '#1e293b', 'headband', 'crash');

    setPortraitUrl(defaultRun);
    setDuckPortraitUrl(defaultDuck);
    setCrashPortraitUrl(defaultCrash);
    setCustomSounds({});
  };

  // Save changes
  const handleSave = async () => {
    const updatedProfile: FriendProfile = {
      ...currentProfile,
      name: name.trim() || currentProfile.name,
      subtitle: subtitle.trim() || currentProfile.subtitle,
      accentColor,
      soundPreset,
      portraitUrl,
      duckPortraitUrl,
      crashPortraitUrl,
      customSounds,
    };

    await storeCustomProfile(updatedProfile);
    await soundEngine.preloadProfileAssets(updatedProfile);
    onSaveProfile(updatedProfile);
    onClose();
  };

  const presetColors = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#3b82f6'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload Friend Photo and Sound Assets"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Friend Asset Uploader & Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload real photos and custom sound effects directly through the browser.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close uploader"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Friend Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Friend's Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Jordan"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Subtitle / Nickname
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. The Track Star"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Theme Accent Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      accentColor === color ? 'scale-115 ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-200' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Photo Uploader Slots */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Friend Photo & Avatar Slots
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload a photo of your friend. It replaces the default runner sprite.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Slot A: Main Running Photo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  1. Running Portrait
                </span>
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center p-2 border-2 overflow-hidden bg-white dark:bg-slate-900 shadow-inner"
                  style={{ borderColor: accentColor }}
                >
                  <img
                    src={portraitUrl}
                    alt="Running pose preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'main')}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
              </div>

              {/* Slot B: Ducking Pose Photo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  2. Ducking Pose
                </span>
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center p-2 border-2 overflow-hidden bg-white dark:bg-slate-900 shadow-inner"
                  style={{ borderColor: accentColor }}
                >
                  <img
                    src={duckPortraitUrl}
                    alt="Ducking pose preview"
                    className="w-full h-full object-contain scale-y-75"
                  />
                </div>
                <input
                  type="file"
                  ref={duckPhotoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'duck')}
                />
                <button
                  type="button"
                  onClick={() => duckPhotoInputRef.current?.click()}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Custom Duck Photo
                </button>
              </div>

              {/* Slot C: Game Over / Crash Photo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  3. Crash / KO Photo
                </span>
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center p-2 border-2 overflow-hidden bg-white dark:bg-slate-900 shadow-inner"
                  style={{ borderColor: accentColor }}
                >
                  <img
                    src={crashPortraitUrl}
                    alt="Crash pose preview"
                    className="w-full h-full object-contain filter hue-rotate-90"
                  />
                </div>
                <input
                  type="file"
                  ref={crashPhotoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'crash')}
                />
                <button
                  type="button"
                  onClick={() => crashPhotoInputRef.current?.click()}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Custom Crash Photo
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Sound Uploader & Microphone Voice Recorder */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-600" />
                Custom Sound File Slots & Mic Recorder
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload `.mp3`, `.wav`, or `.ogg` audio files, OR click the Mic to record your friend's voice lines live!
              </p>
            </div>

            <div className="space-y-3">
              {(
                [
                  { slot: 'jump' as const, label: 'jump.mp3', trigger: 'Space / Up Arrow', ref: jumpSoundInputRef },
                  { slot: 'duck' as const, label: 'duck.mp3', trigger: 'Down Arrow', ref: duckSoundInputRef },
                  { slot: 'gameover' as const, label: 'gameover.mp3', trigger: 'Collision Hit', ref: gameoverSoundInputRef },
                ] as const
              ).map(({ slot, label, trigger, ref }) => {
                const isRecordingThis = recordingSlot === slot;
                const hasCustom = Boolean(customSounds[slot]);

                return (
                  <div
                    key={slot}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {trigger}
                        </span>
                        {hasCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            Custom Loaded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {customSounds[slot]?.fileName || `${soundPreset} default synth preset`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Hidden audio input */}
                      <input
                        type="file"
                        ref={ref}
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleAudioUpload(e, slot)}
                      />

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const tempProf = { ...currentProfile, customSounds };
                          soundEngine.previewSound(tempProf, slot);
                        }}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 text-emerald-600 transition-colors shadow-2xs"
                        title={`Preview ${label}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {/* Upload Audio File Button */}
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </button>

                      {/* Microphone Recorder Button */}
                      {isRecordingThis ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-rose-600 text-white animate-pulse transition-all cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop ({recordingSeconds}s)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startRecording(slot)}
                          className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Record using your microphone"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Record Mic</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Assets to Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
