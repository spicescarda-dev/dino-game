import { BoundingBox, Obstacle, ObstacleType } from './types';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 320;
export const GROUND_Y = 250;

export const RUNNER_CONFIG = {
  x: 70,
  uprightWidth: 46,
  uprightHeight: 52,
  duckWidth: 62,
  duckHeight: 26,
  jumpVelocity: -13.8, // Floaty, generous jump that easily clears obstacles
  minJumpApex: 85,    // Guaranteed minimum jump height on quick tap
  gravity: 0.54,
  fastDropFactor: 2.0,
  jumpCutMultiplier: 0.72, // Gentle cut only, never kills jump mid-air
  initialSpeed: 270,   // Gentle, approachable starting speed (was 380)
  maxSpeed: 750,
  speedRampRate: 0.28, // Smooth gradual ramp
};

/**
 * Calculates current bounding box for the runner.
 * When ducking, height shrinks by ~50%, lowering the top edge.
 */
export function getRunnerBoundingBox(
  x: number,
  groundY: number,
  jumpY: number, // positive value when in air
  isDucking: boolean
): BoundingBox {
  if (isDucking && jumpY <= 0) {
    // Ducking on ground
    return {
      x,
      y: groundY - RUNNER_CONFIG.duckHeight,
      width: RUNNER_CONFIG.duckWidth,
      height: RUNNER_CONFIG.duckHeight,
    };
  }

  // Upright or mid-air (mid-air ducking still shrinks collision box!)
  const width = isDucking ? RUNNER_CONFIG.duckWidth : RUNNER_CONFIG.uprightWidth;
  const height = isDucking ? RUNNER_CONFIG.duckHeight : RUNNER_CONFIG.uprightHeight;
  const y = groundY - height - jumpY;

  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Checks Axis-Aligned Bounding Box (AABB) intersection with generous, fair padding
 * so players never crash on invisible edges or decorative cactus needles.
 */
export function checkCollision(
  runnerBox: BoundingBox,
  obstacleBox: BoundingBox,
  paddingX = 12,
  paddingY = 8
): boolean {
  // Tight fair hitbox inside the visual sprite
  const rLeft = runnerBox.x + paddingX;
  const rRight = runnerBox.x + runnerBox.width - paddingX;
  const rTop = runnerBox.y + paddingY;
  const rBottom = runnerBox.y + runnerBox.height - 4; // Generous foot clearance

  const oLeft = obstacleBox.x + 6;
  const oRight = obstacleBox.x + obstacleBox.width - 6;
  const oTop = obstacleBox.y + 6;
  const oBottom = obstacleBox.y + obstacleBox.height - 2;

  return (
    rLeft < oRight &&
    rRight > oLeft &&
    rTop < oBottom &&
    rBottom > oTop
  );
}

/**
 * Calculates game speed in pixels per second based on current score.
 */
export function calculateSpeed(
  score: number,
  baseSpeed = RUNNER_CONFIG.initialSpeed,
  maxSpeed = RUNNER_CONFIG.maxSpeed,
  rampRate = RUNNER_CONFIG.speedRampRate
): number {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const ramp = Math.sqrt(safeScore) * rampRate * 12;
  return Math.min(maxSpeed, Math.round(baseSpeed + ramp));
}

/**
 * Determines obstacle dimensions and spawn Y coordinates.
 */
export function getObstacleDimensions(type: ObstacleType, groundY: number): {
  width: number;
  height: number;
  y: number;
} {
  switch (type) {
    case 'cactus-small-single':
      return { width: 18, height: 36, y: groundY - 36 };
    case 'cactus-small-double':
      return { width: 36, height: 36, y: groundY - 36 };
    case 'cactus-small-triple':
      return { width: 54, height: 36, y: groundY - 36 };
    case 'cactus-large-single':
      return { width: 26, height: 50, y: groundY - 50 };
    case 'cactus-large-double':
      return { width: 50, height: 50, y: groundY - 50 };
    case 'pterodactyl-low':
      // Flying low: must jump over!
      return { width: 46, height: 34, y: groundY - 38 };
    case 'pterodactyl-mid':
      // Flying at head level: MUST duck to pass under safely! (Upright runner is 52px, ducking is 28px)
      return { width: 46, height: 34, y: groundY - 56 };
    case 'pterodactyl-high':
      // Flying high: can pass under without ducking, but ducking also clears easily
      return { width: 46, height: 34, y: groundY - 95 };
    case 'tumbleweed':
      // Low rolling tumbleweed
      return { width: 26, height: 26, y: groundY - 26 };
    case 'cactus-tall-cluster':
      // Extra wide tall cactus forest
      return { width: 68, height: 52, y: groundY - 52 };
  }
}

/**
 * Checks whether an obstacle should spawn based on distance traveled and min gap.
 * Ensures ample reaction runway (at least 450px) between obstacles.
 */
export function shouldSpawnObstacle(
  distanceSinceLastSpawn: number,
  speed: number,
  randomFactor = 1.0
): boolean {
  // Generous spacing giving player plenty of reaction time
  const baseGap = 450;
  const speedGapBonus = (speed / 270) * 90;
  const threshold = (baseGap + speedGapBonus) * (0.9 + randomFactor * 0.4);
  return distanceSinceLastSpawn >= threshold;
}

/**
 * Chooses next obstacle type depending on score.
 * Gentle difficulty ramp:
 * - Score < 40: Only single small cacti (easy introductory jumps)
 * - Score 40 - 90: Small doubles and flying birds (ducking introduced)
 * - Score 90+: Large cacti, tumbleweeds, and diverse hazards
 */
export function pickNextObstacleType(score: number, randomValue: number): ObstacleType {
  // Gentle early game runway: first 40 points are single small cacti
  if (score < 40) {
    return 'cactus-small-single';
  }

  // Bird spawning unlocks at score 40
  const allowFlying = score >= 40;
  const birdChance = score >= 120 ? 0.38 : 0.28;

  if (allowFlying && randomValue < birdChance) {
    const birdSubChoice = (randomValue * 100) % 1;
    if (birdSubChoice < 0.5) {
      return 'pterodactyl-mid'; // Ducking required!
    } else if (birdSubChoice < 0.8) {
      return 'pterodactyl-low'; // Must jump over
    } else {
      return 'pterodactyl-high'; // High sky glider
    }
  }

  // Ground obstacles ramped by score
  if (score < 90) {
    // Intermediate: single or double small cactus
    return randomValue < 0.6 ? 'cactus-small-single' : 'cactus-small-double';
  }

  const groundVariants: ObstacleType[] = [
    'cactus-small-single',
    'cactus-small-double',
    'cactus-small-triple',
    'cactus-large-single',
    'tumbleweed',
    score >= 160 ? 'cactus-large-double' : 'cactus-small-double',
    score >= 220 ? 'cactus-tall-cluster' : 'cactus-large-single',
  ];

  const index = Math.floor(randomValue * groundVariants.length) % groundVariants.length;
  return groundVariants[index];
}

/**
 * Moves obstacles left and purges offscreen obstacles.
 */
export function updateObstacles(
  obstacles: Obstacle[],
  dt: number,
  speed: number
): { obstacles: Obstacle[]; removedCount: number } {
  const movement = speed * dt;
  const active: Obstacle[] = [];
  let removedCount = 0;

  for (const obs of obstacles) {
    const nextX = obs.x - movement;
    if (nextX + obs.width > -20) {
      active.push({
        ...obs,
        x: nextX,
        frameTimer: (obs.frameTimer ?? 0) + dt,
        frame: (obs.frameTimer ?? 0) > 0.15 ? ((obs.frame ?? 0) + 1) % 2 : (obs.frame ?? 0),
      });
    } else {
      removedCount++;
    }
  }

  return { obstacles: active, removedCount };
}
