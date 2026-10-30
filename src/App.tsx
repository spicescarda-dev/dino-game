import { useState, useEffect, useCallback, useTransition } from 'react';
import { DinoCanvas } from './game/DinoCanvas';
import { FriendSelector } from './components/FriendSelector';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { ControlsHUD } from './components/ControlsHUD';
import {
  FriendProfile,
  GameStatus,
} from './game/types';
import {
  getStoredFriendProfiles,
  saveFriendProfiles,
  getActiveFriendId,
  setActiveFriendId,
  getOverallHighScore,
  saveOverallHighScore,
} from './game/friendProfiles';
import { soundEngine } from './game/soundEngine';

export default function App() {
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>(() =>
    getStoredFriendProfiles()
  );
  const [activeFriendName, setActiveFriendName] = useState<string>(() =>
    getActiveFriendId()
  );
  const [, startTransition] = useTransition();

  // Active friend profile
  const activeFriend = profiles[activeFriendName] || Object.values(profiles)[0];

  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getOverallHighScore());
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDuckingIntent, setIsDuckingIntent] = useState<boolean>(false);

  // Sync document.body.dataset.state for Ultra Mode verification
  useEffect(() => {
    document.body.dataset.state = gameStatus;
  }, [gameStatus]);

  // Handle ?autostart=1 URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      soundEngine.preloadProfileAssets(activeFriend).then(() => {
        setGameStatus('playing');
      });
    } else {
      // Preload active friend assets on title load
      soundEngine.preloadProfileAssets(activeFriend);
    }
  }, [activeFriend]);

  // Select a friend
  const handleSelectFriend = useCallback((profile: FriendProfile) => {
    setActiveFriendName(profile.name);
    setActiveFriendId(profile.name);
  }, []);

  // Update a friend profile (e.g. after uploading portrait image or custom sound)
  const handleUpdateProfile = useCallback(
    (updated: FriendProfile) => {
      setProfiles((prev) => {
        const next = { ...prev, [updated.name]: updated };
        saveFriendProfiles(next);
        return next;
      });
    },
    []
  );

  // Add a newly created friend profile
  const handleAddNewProfile = useCallback(
    async (newProfile: FriendProfile) => {
      setProfiles((prev) => {
        const next = { ...prev, [newProfile.name]: newProfile };
        saveFriendProfiles(next);
        return next;
      });
      setActiveFriendName(newProfile.name);
      setActiveFriendId(newProfile.name);
      await soundEngine.preloadProfileAssets(newProfile);
    },
    []
  );

  // Start game action
  const handleStartGame = useCallback(async () => {
    await soundEngine.preloadProfileAssets(activeFriend);
    setScore(0);
    setFinalScore(0);
    setGameStatus('playing');
  }, [activeFriend]);

  // Restart after gameover
  const handleRestart = useCallback(async () => {
    await soundEngine.preloadProfileAssets(activeFriend);
    setScore(0);
    setFinalScore(0);
    setGameStatus('playing');
  }, [activeFriend]);

  // Game over trigger
  const handleGameOver = useCallback(
    (finishedScore: number) => {
      setFinalScore(finishedScore);
      setGameStatus('gameover');
      if (finishedScore > highScore) {
        setHighScore(finishedScore);
        saveOverallHighScore(finishedScore);
      }
    },
    [highScore]
  );

  // Pause toggle
  const handleTogglePause = useCallback(() => {
    setGameStatus((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  }, []);

  // Mute toggle
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  }, [isMuted]);

  // Return to Friend Selector
  const handleOpenSelector = useCallback(() => {
    setGameStatus('title');
  }, []);

  // Keyboard shortcut for sound toggle (M)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleToggleMute]);

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-3 sm:p-6 transition-colors">
      {/* Top Banner / Game Lockup */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm tracking-tighter">
            D
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">
              CHROME DINO RUNNER
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Friend Profile Edition
            </p>
          </div>
        </div>

        {gameStatus !== 'title' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              Score: {(Number.isFinite(score) ? score : 0).toString().padStart(5, '0')}
            </span>
          </div>
        )}
      </header>

      {/* Primary Game Region */}
      <section className="max-w-5xl w-full mx-auto my-auto relative space-y-4">
        {gameStatus === 'title' ? (
          /* Title Screen: Friend Selector / Login System */
          <FriendSelector
            profiles={profiles}
            activeFriendId={activeFriendName}
            onSelectFriend={handleSelectFriend}
            onUpdateProfile={handleUpdateProfile}
            onAddNewProfile={handleAddNewProfile}
            onStartGame={handleStartGame}
            highScore={highScore}
          />
        ) : (
          /* Active Playing Canvas & HUD */
          <div className="relative space-y-3">
            <ControlsHUD
              friend={activeFriend}
              isMuted={isMuted}
              isPaused={gameStatus === 'paused'}
              onToggleMute={handleToggleMute}
              onTogglePause={handleTogglePause}
              onOpenSelector={handleOpenSelector}
              onTouchJump={() => {
                // Trigger canvas jump
                window.dispatchEvent(
                  new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
                );
              }}
              onTouchDuckStart={() => setIsDuckingIntent(true)}
              onTouchDuckEnd={() => setIsDuckingIntent(false)}
            />

            <div className="relative">
              <DinoCanvas
                friend={activeFriend}
                gameStatus={gameStatus}
                highScore={highScore}
                onScoreUpdate={(s, hs) => {
                  setScore(s);
                  if (hs > highScore) {
                    setHighScore(hs);
                    saveOverallHighScore(hs);
                  }
                }}
                onGameOver={handleGameOver}
                onRestart={handleRestart}
                onTogglePause={handleTogglePause}
                isDuckingIntent={isDuckingIntent}
              />

              {/* Status Modals over Canvas */}
              {gameStatus === 'gameover' && (
                <GameOverModal
                  friend={activeFriend}
                  finalScore={finalScore}
                  highScore={highScore}
                  onRestart={handleRestart}
                  onOpenSelector={handleOpenSelector}
                />
              )}

              {gameStatus === 'paused' && (
                <PauseModal
                  friend={activeFriend}
                  currentScore={score}
                  onResume={() => setGameStatus('playing')}
                  onRestart={handleRestart}
                  onOpenSelector={handleOpenSelector}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {/* Minimal Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-4 text-center text-[11px] text-slate-400 dark:text-slate-600">
        Dino Runner with Friend Profiles · Classic Canvas Runner · Zero-Latency Web Audio
      </footer>
    </main>
  );
}
