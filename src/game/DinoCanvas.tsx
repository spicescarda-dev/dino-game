import React, { useEffect, useRef, useCallback } from 'react';
import { FriendProfile, GameStatus, Obstacle, Cloud, Star, Particle } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  RUNNER_CONFIG,
  getRunnerBoundingBox,
  checkCollision,
  calculateSpeed,
  getObstacleDimensions,
  shouldSpawnObstacle,
  pickNextObstacleType,
} from './physics';
import { soundEngine } from './soundEngine';

interface DinoCanvasProps {
  friend: FriendProfile;
  gameStatus: GameStatus;
  highScore: number;
  onScoreUpdate: (score: number, highScore: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart: () => void;
  onTogglePause: () => void;
  isDuckingIntent?: boolean;
}

export const DinoCanvas: React.FC<DinoCanvasProps> = ({
  friend,
  gameStatus,
  highScore,
  onScoreUpdate,
  onGameOver,
  onRestart,
  onTogglePause,
  isDuckingIntent = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preloaded image element references for runner
  const imgRunRef = useRef<HTMLImageElement | null>(null);
  const imgDuckRef = useRef<HTMLImageElement | null>(null);
  const imgCrashRef = useRef<HTMLImageElement | null>(null);

  // Mutable game simulation state preserved across render frames
  const simRef = useRef({
    score: 0,
    distance: 0,
    speed: RUNNER_CONFIG.initialSpeed,
    jumpY: 0,
    jumpVy: 0,
    isGrounded: true,
    isDucking: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    obstacles: [] as Obstacle[],
    clouds: [] as Cloud[],
    stars: [] as Star[],
    particles: [] as Particle[],
    groundOffset: 0,
    groundBumps: [] as Array<{ x: number; type: number }>,
    nextObstacleId: 1,
    distanceSinceLastObstacle: 200,
    lastTime: 0,
    hitstopTimer: 0,
    trauma: 0, // Camera shake
    runCycleTimer: 0,
    milestoneFlashTimer: 0,
    milestoneScore: 0,
    nightFactor: 0, // 0 = day, 1 = full night
  });

  // Track held keyboard keys
  const keysRef = useRef<{
    jumpHeld: boolean;
    duckHeld: boolean;
    jumpJustPressed: boolean;
    duckJustPressed: boolean;
  }>({
    jumpHeld: false,
    duckHeld: false,
    jumpJustPressed: false,
    duckJustPressed: false,
  });

  // Load and cache avatar images for the active friend
  useEffect(() => {
    const runImg = new Image();
    runImg.src = friend.portraitUrl;
    imgRunRef.current = runImg;

    if (friend.duckPortraitUrl) {
      const duckImg = new Image();
      duckImg.src = friend.duckPortraitUrl;
      imgDuckRef.current = duckImg;
    } else {
      imgDuckRef.current = runImg;
    }

    if (friend.crashPortraitUrl) {
      const crashImg = new Image();
      crashImg.src = friend.crashPortraitUrl;
      imgCrashRef.current = crashImg;
    } else {
      imgCrashRef.current = runImg;
    }
  }, [friend]);

  // Reset simulation when game restarts
  const resetSimulation = useCallback(() => {
    const bumps: Array<{ x: number; type: number }> = [];
    for (let x = 0; x < CANVAS_WIDTH + 150; x += 32) {
      bumps.push({ x, type: Math.floor(Math.random() * 4) });
    }

    const clouds: Cloud[] = [
      { x: 180, y: 55, speed: 28, scale: 1 },
      { x: 490, y: 35, speed: 34, scale: 0.8 },
      { x: 820, y: 70, speed: 24, scale: 1.1 },
    ];

    const stars: Star[] = [];
    for (let i = 0; i < 28; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (GROUND_Y - 90) + 15,
        size: Math.random() > 0.6 ? 2.5 : 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    simRef.current = {
      score: 0,
      distance: 0,
      speed: RUNNER_CONFIG.initialSpeed,
      jumpY: 0,
      jumpVy: 0,
      isGrounded: true,
      isDucking: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      obstacles: [],
      clouds,
      stars,
      particles: [],
      groundOffset: 0,
      groundBumps: bumps,
      nextObstacleId: 1,
      distanceSinceLastObstacle: -250, // 700px clear opening runway before first obstacle
      lastTime: 0,
      hitstopTimer: 0,
      trauma: 0,
      runCycleTimer: 0,
      milestoneFlashTimer: 0,
      milestoneScore: 0,
      nightFactor: 0,
    };
  }, []);

  // Initialize simulation state on mount and whenever game starts or restarts
  useEffect(() => {
    resetSimulation();
  }, [resetSimulation, gameStatus]);

  // Spawn running dust puff
  const spawnDust = (x: number, y: number, count = 2) => {
    for (let i = 0; i < count; i++) {
      simRef.current.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y - Math.random() * 4,
        vx: -(Math.random() * 80 + 30),
        vy: -(Math.random() * 25 + 10),
        alpha: 0.8,
        color: '#9ca3af',
        size: Math.random() * 3 + 2,
        life: 0,
        maxLife: 0.28,
      });
    }
  };

  // Spawn crash explosion burst
  const spawnCrashBurst = (x: number, y: number) => {
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 190 + 50;
      simRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        alpha: 1,
        color: Math.random() > 0.4 ? friend.accentColor : '#ef4444',
        size: Math.random() * 5 + 3,
        life: 0,
        maxLife: 0.45,
      });
    }
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on Space / ArrowUp / ArrowDown
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameStatus === 'title' || gameStatus === 'gameover') {
          onRestart();
          return;
        }
        if (!keysRef.current.jumpHeld) {
          keysRef.current.jumpJustPressed = true;
          simRef.current.jumpBufferTimer = 0.18; // 180ms generous jump buffering
        }
        keysRef.current.jumpHeld = true;
      }

      if (e.code === 'ArrowDown') {
        if (!keysRef.current.duckHeld) {
          keysRef.current.duckJustPressed = true;
        }
        keysRef.current.duckHeld = true;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameStatus === 'playing' || gameStatus === 'paused') {
          onTogglePause();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        keysRef.current.jumpHeld = false;
        // Only gently damp if already above minimum safe apex (85px)
        // so quick taps never cut short into obstacles!
        if (simRef.current.jumpVy < -4 && simRef.current.jumpY > RUNNER_CONFIG.minJumpApex) {
          simRef.current.jumpVy *= RUNNER_CONFIG.jumpCutMultiplier;
        }
      }

      if (e.code === 'ArrowDown') {
        keysRef.current.duckHeld = false;
      }
    };

    const handleBlur = () => {
      keysRef.current.jumpHeld = false;
      keysRef.current.duckHeld = false;
      keysRef.current.jumpJustPressed = false;
      keysRef.current.duckJustPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameStatus, onRestart, onTogglePause]);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);

      const sim = simRef.current;
      if (!sim.lastTime || sim.lastTime > now) {
        sim.lastTime = now;
      }
      const rawDt = Math.max(0, (now - sim.lastTime) / 1000);
      sim.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

      // Process simulation if in 'playing' state
      if (gameStatus === 'playing') {
        // Sim hitstop check
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer -= dt;
        } else {
          // Update game progress & speed
          sim.speed = calculateSpeed(sim.score);
          const distanceStep = sim.speed * dt;
          sim.distance += distanceStep;
          const prevScore = sim.score;
          sim.score = Math.floor(sim.distance / 12);

          // Milestone check (every 100 points)
          if (Math.floor(sim.score / 100) > Math.floor(prevScore / 100)) {
            sim.milestoneFlashTimer = 1.2;
            sim.milestoneScore = Math.floor(sim.score / 100) * 100;
            soundEngine.play('milestone');
          }
          if (sim.milestoneFlashTimer > 0) {
            sim.milestoneFlashTimer -= dt;
          }

          // Day / Night cycle: every 700 points, 220 points of night
          const cyclePosition = sim.score % 920;
          if (cyclePosition > 700) {
            const nightProgress = (cyclePosition - 700) / 220;
            sim.nightFactor = Math.sin(nightProgress * Math.PI);
          } else {
            sim.nightFactor = 0;
          }

          onScoreUpdate(sim.score, Math.max(sim.score, highScore));

          // Coyote time & jump buffering
          if (sim.isGrounded) {
            sim.coyoteTimer = 0.16; // 160ms coyote time
          } else {
            sim.coyoteTimer -= dt;
          }

          if (sim.jumpBufferTimer > 0) {
            sim.jumpBufferTimer -= dt;
          }

          // Ducking state
          const duckActive = keysRef.current.duckHeld || isDuckingIntent;
          const wasDucking = sim.isDucking;
          sim.isDucking = duckActive;

          if (duckActive && !wasDucking && keysRef.current.duckJustPressed) {
            soundEngine.play('duck');
            keysRef.current.duckJustPressed = false;
          }

          // Jump Trigger (jump buffered or just pressed while coyote time active)
          const canJump = sim.isGrounded || sim.coyoteTimer > 0;
          if ((keysRef.current.jumpJustPressed || sim.jumpBufferTimer > 0) && canJump) {
            sim.jumpVy = RUNNER_CONFIG.jumpVelocity;
            sim.isGrounded = false;
            sim.coyoteTimer = 0;
            sim.jumpBufferTimer = 0;
            keysRef.current.jumpJustPressed = false;
            soundEngine.play('jump');
            spawnDust(RUNNER_CONFIG.x + 20, GROUND_Y, 4);
          }

          // Mid-air Jump Physics
          if (!sim.isGrounded) {
            let gravity = RUNNER_CONFIG.gravity;
            // Holding down in mid-air initiates fast-drop!
            if (duckActive) {
              gravity *= RUNNER_CONFIG.fastDropFactor;
            }

            sim.jumpVy += gravity;
            sim.jumpY -= sim.jumpVy;

            // Touch ground
            if (sim.jumpY <= 0) {
              sim.jumpY = 0;
              sim.jumpVy = 0;
              sim.isGrounded = true;
              spawnDust(RUNNER_CONFIG.x + 20, GROUND_Y, 3);
            }
          }

          // Run animation timer
          sim.runCycleTimer += dt * (sim.speed / 28);

          // Update Ground
          sim.groundOffset = (sim.groundOffset + distanceStep) % 64;
          for (const bump of sim.groundBumps) {
            bump.x -= distanceStep;
            if (bump.x < -40) {
              bump.x += CANVAS_WIDTH + 80;
              bump.type = Math.floor(Math.random() * 4);
            }
          }

          // Update Clouds
          for (const cloud of sim.clouds) {
            cloud.x -= cloud.speed * dt;
            if (cloud.x < -80) {
              cloud.x = CANVAS_WIDTH + Math.random() * 120;
              cloud.y = Math.random() * 65 + 25;
            }
          }

          // Update Obstacles
          sim.distanceSinceLastObstacle += distanceStep;
          if (shouldSpawnObstacle(sim.distanceSinceLastObstacle, sim.speed, Math.random())) {
            const obsType = pickNextObstacleType(sim.score, Math.random());
            const dims = getObstacleDimensions(obsType, GROUND_Y);
            sim.obstacles.push({
              id: sim.nextObstacleId++,
              type: obsType,
              x: CANVAS_WIDTH + 20,
              y: dims.y,
              width: dims.width,
              height: dims.height,
              frame: 0,
              frameTimer: 0,
            });
            sim.distanceSinceLastObstacle = 0;
          }

          // Move active obstacles
          for (let i = sim.obstacles.length - 1; i >= 0; i--) {
            const obs = sim.obstacles[i];
            obs.x -= distanceStep;

            // Wing flapping animation for pterodactyls
            if (obs.type.startsWith('pterodactyl')) {
              obs.frameTimer = (obs.frameTimer ?? 0) + dt;
              if (obs.frameTimer > 0.15) {
                obs.frame = ((obs.frame ?? 0) + 1) % 2;
                obs.frameTimer = 0;
              }
            }

            // Remove off-screen obstacles
            if (obs.x + obs.width < -30) {
              sim.obstacles.splice(i, 1);
            }
          }

          // Collision Detection
          const runnerBox = getRunnerBoundingBox(
            RUNNER_CONFIG.x,
            GROUND_Y,
            sim.jumpY,
            sim.isDucking
          );

          for (const obs of sim.obstacles) {
            const obsBox = {
              x: obs.x,
              y: obs.y,
              width: obs.width,
              height: obs.height,
            };

            if (checkCollision(runnerBox, obsBox)) {
              // Crash!
              sim.trauma = 0.85;
              sim.hitstopTimer = 0.08;
              spawnCrashBurst(runnerBox.x + runnerBox.width / 2, runnerBox.y + runnerBox.height / 2);
              soundEngine.play('gameover');
              onGameOver(sim.score);
              break;
            }
          }
        }
      }

      // Update Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife) {
          sim.particles.splice(i, 1);
        }
      }

      // Decay screen shake
      if (sim.trauma > 0) {
        sim.trauma = Math.max(0, sim.trauma - dt * 2.8);
      }

      // -------------------------------------------------------------
      // RENDERING (HTML5 CANVAS)
      // -------------------------------------------------------------
      ctx.save();

      // Camera Shake
      if (sim.trauma > 0) {
        const shake = sim.trauma * sim.trauma * 12;
        const offsetX = (Math.random() * 2 - 1) * shake;
        const offsetY = (Math.random() * 2 - 1) * shake;
        ctx.translate(offsetX, offsetY);
      }

      // Background Day / Night transition
      const night = sim.nightFactor;
      if (night > 0.05) {
        // Interpolate background to night indigo
        const r = Math.round(250 * (1 - night) + 20 * night);
        const g = Math.round(250 * (1 - night) + 24 * night);
        const b = Math.round(250 * (1 - night) + 40 * night);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      } else {
        ctx.fillStyle = '#f9fafb'; // Crisp clean desert sky
      }
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const isNight = night > 0.35;
      const fgColor = isNight ? '#e2e8f0' : '#4b5563';
      const groundColor = isNight ? '#94a3b8' : '#6b7280';

      // Draw Night Stars and Moon
      if (night > 0.05) {
        ctx.save();
        ctx.globalAlpha = night;

        // Crescent Moon
        const moonX = CANVAS_WIDTH - 120;
        const moonY = 48;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ctx.fillStyle = isNight ? `rgb(20, 24, 40)` : '#f9fafb';
        ctx.beginPath();
        ctx.arc(moonX + 6, moonY - 3, 13, 0, Math.PI * 2);
        ctx.fill();

        // Twinkling pixel stars
        ctx.fillStyle = '#ffffff';
        for (const star of sim.stars) {
          const twinkle = (Math.sin(now * 0.004 + star.twinklePhase) + 1) * 0.5;
          ctx.globalAlpha = night * (0.35 + twinkle * 0.65);
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        ctx.restore();
      }

      // Draw Parallax Clouds
      ctx.fillStyle = isNight ? '#475569' : '#d1d5db';
      for (const cloud of sim.clouds) {
        ctx.save();
        ctx.translate(cloud.x, cloud.y);
        ctx.scale(cloud.scale, cloud.scale);
        // Cloud pixel shape
        ctx.beginPath();
        ctx.rect(0, 10, 46, 12);
        ctx.rect(8, 4, 30, 8);
        ctx.rect(14, 0, 16, 6);
        ctx.fill();
        ctx.restore();
      }

      // Draw Classic Ground Line & Horizon Texture
      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Scrolling ground bumps and dashes
      ctx.fillStyle = groundColor;
      for (const bump of sim.groundBumps) {
        if (bump.type === 0) {
          ctx.fillRect(bump.x, GROUND_Y + 4, 14, 2);
        } else if (bump.type === 1) {
          ctx.fillRect(bump.x, GROUND_Y + 7, 8, 2);
          ctx.fillRect(bump.x + 12, GROUND_Y + 11, 6, 2);
        } else if (bump.type === 2) {
          ctx.fillRect(bump.x, GROUND_Y + 3, 4, 2);
          ctx.fillRect(bump.x + 8, GROUND_Y + 5, 18, 2);
        } else {
          ctx.fillRect(bump.x, GROUND_Y + 8, 16, 2);
        }
      }

      // Draw Obstacles (Cacti & Pterodactyls)
      for (const obs of sim.obstacles) {
        ctx.save();
        ctx.translate(obs.x, obs.y);

        if (obs.type.startsWith('cactus')) {
          ctx.fillStyle = fgColor;
          if (obs.type === 'cactus-small-single') {
            // Main stem
            ctx.fillRect(6, 0, 6, 36);
            // Left arm
            ctx.fillRect(0, 10, 6, 4);
            ctx.fillRect(0, 6, 4, 8);
            // Right arm
            ctx.fillRect(12, 14, 6, 4);
            ctx.fillRect(14, 10, 4, 8);
          } else if (obs.type === 'cactus-small-double') {
            // First cactus
            ctx.fillRect(5, 0, 6, 36);
            ctx.fillRect(0, 10, 5, 4);
            ctx.fillRect(0, 6, 4, 8);
            ctx.fillRect(11, 14, 5, 4);
            // Second cactus
            ctx.fillRect(24, 4, 6, 32);
            ctx.fillRect(19, 14, 5, 4);
            ctx.fillRect(30, 12, 5, 4);
          } else if (obs.type === 'cactus-small-triple') {
            ctx.fillRect(5, 4, 5, 32);
            ctx.fillRect(0, 12, 5, 4);
            ctx.fillRect(20, 0, 6, 36);
            ctx.fillRect(15, 10, 5, 4);
            ctx.fillRect(26, 14, 5, 4);
            ctx.fillRect(38, 6, 5, 30);
            ctx.fillRect(43, 14, 5, 4);
          } else if (obs.type === 'cactus-large-single') {
            ctx.fillRect(10, 0, 8, 50);
            ctx.fillRect(2, 14, 8, 6);
            ctx.fillRect(2, 8, 6, 12);
            ctx.fillRect(18, 20, 8, 6);
            ctx.fillRect(20, 14, 6, 12);
          } else if (obs.type === 'cactus-tall-cluster') {
            // Triple tall cactus forest
            ctx.fillRect(8, 0, 8, 52);
            ctx.fillRect(1, 14, 7, 5);
            ctx.fillRect(1, 8, 5, 11);
            ctx.fillRect(16, 18, 7, 5);
            ctx.fillRect(28, 4, 8, 48);
            ctx.fillRect(22, 16, 6, 5);
            ctx.fillRect(36, 14, 6, 5);
            ctx.fillRect(48, 2, 8, 50);
            ctx.fillRect(42, 12, 6, 5);
            ctx.fillRect(56, 18, 6, 5);
          } else {
            // cactus-large-double
            ctx.fillRect(8, 0, 8, 50);
            ctx.fillRect(1, 14, 7, 5);
            ctx.fillRect(1, 8, 5, 11);
            ctx.fillRect(16, 18, 7, 5);
            ctx.fillRect(30, 6, 8, 44);
            ctx.fillRect(23, 18, 7, 5);
            ctx.fillRect(38, 16, 7, 5);
          }
        } else if (obs.type === 'tumbleweed') {
          // Rolling desert tumbleweed
          ctx.save();
          const spin = (obs.x * 0.12) % (Math.PI * 2);
          ctx.translate(13, 13);
          ctx.rotate(spin);
          ctx.strokeStyle = fgColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.stroke();
          // Interior branches
          ctx.beginPath();
          ctx.moveTo(-9, -4);
          ctx.lineTo(8, 6);
          ctx.moveTo(-5, 8);
          ctx.lineTo(6, -7);
          ctx.moveTo(-8, 5);
          ctx.lineTo(8, -4);
          ctx.stroke();
          ctx.restore();
        } else if (obs.type.startsWith('pterodactyl')) {
          // Flying Pterodactyl / Bird with animated flapping wings
          ctx.fillStyle = fgColor;
          const frame = obs.frame ?? 0;

          // Head & Beak
          ctx.fillRect(0, 12, 14, 6);
          ctx.fillRect(0, 15, 6, 3);
          // Eye
          ctx.fillStyle = isNight ? '#1e293b' : '#ffffff';
          ctx.fillRect(10, 13, 2, 2);
          ctx.fillStyle = fgColor;

          // Body
          ctx.fillRect(14, 10, 18, 8);
          // Tail
          ctx.fillRect(32, 13, 10, 3);

          // Wings (Frame 0 = wing up, Frame 1 = wing down)
          if (frame === 0) {
            // Wings pointed up
            ctx.fillRect(16, 0, 6, 10);
            ctx.fillRect(20, 2, 8, 8);
            ctx.fillRect(24, 6, 8, 4);
          } else {
            // Wings pointed down
            ctx.fillRect(16, 18, 6, 12);
            ctx.fillRect(20, 18, 8, 9);
            ctx.fillRect(24, 18, 8, 6);
          }

          // Visual telegraph cue for mid-altitude bird that REQUIRES ducking!
          if (obs.type === 'pterodactyl-mid' && obs.x > 80 && obs.x < 320) {
            ctx.save();
            ctx.fillStyle = '#f59e0b'; // Amber warning
            ctx.font = '900 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('▼ DUCK', 22, -6);
            ctx.restore();
          }
        }

        ctx.restore();
      }

      // Draw Runner (Selected Friend's Portrait)
      const runnerBox = getRunnerBoundingBox(
        RUNNER_CONFIG.x,
        GROUND_Y,
        sim.jumpY,
        sim.isDucking
      );

      ctx.save();
      const isDead = gameStatus === 'gameover';
      const runnerImg = isDead
        ? imgCrashRef.current
        : sim.isDucking
        ? imgDuckRef.current
        : imgRunRef.current;

      // Running bobbing offset
      let bobY = 0;
      if (sim.isGrounded && gameStatus === 'playing' && !sim.isDucking) {
        bobY = Math.sin(sim.runCycleTimer * 4) * 2;
      }

      const drawX = runnerBox.x;
      const drawY = runnerBox.y + bobY;
      const drawW = runnerBox.width;
      const drawH = runnerBox.height;

      // Draw friend's portrait image
      if (runnerImg && runnerImg.complete && runnerImg.naturalWidth > 0) {
        ctx.drawImage(runnerImg, drawX, drawY, drawW, drawH);
      } else {
        // High fidelity vector avatar rendering directly on canvas
        ctx.save();
        ctx.fillStyle = friend.accentColor;
        if (sim.isDucking) {
          // Ducking crouch body
          ctx.beginPath();
          ctx.roundRect(drawX, drawY + 6, drawW - 8, drawH - 6, 8);
          ctx.fill();
          // Head shifted forward
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(drawX + drawW - 14, drawY + 12, 11, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#111827';
          ctx.fillRect(drawX + drawW - 10, drawY + 10, 3, 2);
        } else {
          // Upright running torso
          ctx.beginPath();
          ctx.roundRect(drawX + 8, drawY + 20, drawW - 16, drawH - 24, 6);
          ctx.fill();
          // Head
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(drawX + drawW / 2, drawY + 14, 12, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#111827';
          if (isDead) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeText('X', drawX + 16, drawY + 16);
            ctx.strokeText('X', drawX + 26, drawY + 16);
          } else {
            ctx.fillRect(drawX + 18, drawY + 12, 3, 4);
            ctx.fillRect(drawX + 27, drawY + 12, 3, 4);
          }
        }
        ctx.restore();
      }

      // Draw athletic sneakers animation if running upright
      if (sim.isGrounded && gameStatus === 'playing' && !sim.isDucking) {
        const step = Math.sin(sim.runCycleTimer * 4);
        ctx.fillStyle = '#ef4444';
        if (step > 0) {
          ctx.fillRect(drawX + 10, GROUND_Y - 4, 10, 4);
        } else {
          ctx.fillRect(drawX + 26, GROUND_Y - 4, 10, 4);
        }
      }

      ctx.restore();

      // Draw Particles (Dust & Burst)
      for (const p of sim.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }

      // Draw Classic Chrome Dino Scoreboard
      // e.g. "HI 00482  00159"
      ctx.save();
      ctx.font = '700 18px "Courier New", Courier, monospace';
      ctx.textAlign = 'right';

      const padScore = (s: number) =>
        (Number.isFinite(s) ? Math.max(0, Math.floor(s)) : 0).toString().padStart(5, '0');
      const currentScoreStr = padScore(sim.score);
      const highScoreStr = padScore(Math.max(sim.score, highScore));

      // Milestone flash effect
      let showCurrentScore = true;
      if (sim.milestoneFlashTimer > 0) {
        const flashPhase = Math.floor(sim.milestoneFlashTimer * 8) % 2;
        showCurrentScore = flashPhase === 0;
      }

      // High Score label
      ctx.fillStyle = isNight ? '#94a3b8' : '#9ca3af';
      ctx.fillText(`HI ${highScoreStr}`, CANVAS_WIDTH - 120, 36);

      // Current Score
      if (showCurrentScore) {
        ctx.fillStyle = fgColor;
        const displayScore = sim.milestoneFlashTimer > 0 ? padScore(sim.milestoneScore) : currentScoreStr;
        ctx.fillText(displayScore, CANVAS_WIDTH - 24, 36);
      }

      ctx.restore();

      ctx.restore(); // Restore camera shake
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameStatus, friend, highScore, onScoreUpdate, onGameOver, isDuckingIntent]);

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md bg-slate-50 dark:bg-slate-900 select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        data-testid="dino-runner-canvas"
        className="w-full h-auto block cursor-pointer"
        onClick={() => {
          if (gameStatus === 'title' || gameStatus === 'gameover') {
            onRestart();
          } else if (gameStatus === 'playing') {
            // Tap/click canvas to jump
            keysRef.current.jumpJustPressed = true;
            simRef.current.jumpBufferTimer = 0.18;
          }
        }}
      />
    </div>
  );
};
