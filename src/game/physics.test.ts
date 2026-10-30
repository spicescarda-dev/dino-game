import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRunnerBoundingBox,
  checkCollision,
  calculateSpeed,
  getObstacleDimensions,
  shouldSpawnObstacle,
  pickNextObstacleType,
  RUNNER_CONFIG,
  GROUND_Y,
} from './physics';

test('getRunnerBoundingBox shrinks height significantly when ducking', () => {
  const upright = getRunnerBoundingBox(70, GROUND_Y, 0, false);
  const ducking = getRunnerBoundingBox(70, GROUND_Y, 0, true);

  assert.equal(upright.height, RUNNER_CONFIG.uprightHeight);
  assert.equal(ducking.height, RUNNER_CONFIG.duckHeight);
  assert.ok(ducking.height < upright.height, 'Ducking height must be lower than upright');
  assert.equal(ducking.y, GROUND_Y - RUNNER_CONFIG.duckHeight);
  // Ducking character is lower to the ground
  assert.ok(ducking.y > upright.y, 'Top edge of ducking box must be closer to ground');
});

test('ducking avoids mid-altitude pterodactyl that upright would hit', () => {
  const midPteroDims = getObstacleDimensions('pterodactyl-mid', GROUND_Y);
  const midPteroBox = {
    x: 80, // directly overlapping runner x
    y: midPteroDims.y,
    width: midPteroDims.width,
    height: midPteroDims.height,
  };

  const uprightRunner = getRunnerBoundingBox(70, GROUND_Y, 0, false);
  const duckingRunner = getRunnerBoundingBox(70, GROUND_Y, 0, true);

  // Upright should collide with mid-altitude bird
  const uprightCollision = checkCollision(uprightRunner, midPteroBox);
  // Ducking should safely slip under the mid-altitude bird
  const duckingCollision = checkCollision(duckingRunner, midPteroBox);

  assert.equal(uprightCollision, true, 'Upright runner must collide with mid-altitude bird');
  assert.equal(duckingCollision, false, 'Ducking runner must clear mid-altitude bird without collision');
});

test('checkCollision detects direct overlap with cactus', () => {
  const cactusDims = getObstacleDimensions('cactus-small-single', GROUND_Y);
  const cactusBox = {
    x: 75,
    y: cactusDims.y,
    width: cactusDims.width,
    height: cactusDims.height,
  };

  const runnerOnGround = getRunnerBoundingBox(70, GROUND_Y, 0, false);
  const runnerHighInAir = getRunnerBoundingBox(70, GROUND_Y, 70, false);

  assert.equal(checkCollision(runnerOnGround, cactusBox), true);
  assert.equal(checkCollision(runnerHighInAir, cactusBox), false);
});

test('calculateSpeed increases with score and clamps at maxSpeed', () => {
  const startSpeed = calculateSpeed(0);
  const midSpeed = calculateSpeed(250);
  const highSpeed = calculateSpeed(1000);
  const ultraSpeed = calculateSpeed(50000);

  assert.equal(startSpeed, RUNNER_CONFIG.initialSpeed);
  assert.ok(midSpeed > startSpeed, 'Speed should increase with distance');
  assert.ok(highSpeed > midSpeed, 'High score speed should exceed mid score speed');
  assert.equal(ultraSpeed, RUNNER_CONFIG.maxSpeed, 'Speed should clamp at maxSpeed');
});

test('shouldSpawnObstacle checks minimum spacing', () => {
  const notReady = shouldSpawnObstacle(100, 270, 0.5);
  const ready = shouldSpawnObstacle(750, 270, 0.5);

  assert.equal(notReady, false);
  assert.equal(ready, true);
});

test('pickNextObstacleType spawns only single cacti before score 40, and unlocks birds at 40', () => {
  for (let i = 0; i < 20; i++) {
    const earlyObs = pickNextObstacleType(20, i / 20);
    assert.equal(earlyObs, 'cactus-small-single', 'Early game should only spawn single small cactus');
  }

  let birdSpawned = false;
  for (let i = 0; i < 40; i++) {
    const obs = pickNextObstacleType(50, (i * 0.02) % 0.3);
    if (obs.startsWith('pterodactyl')) {
      birdSpawned = true;
      break;
    }
  }
  assert.equal(birdSpawned, true, 'Birds should spawn when score >= 40');
});

test('tumbleweed and tall cactus cluster have valid dimensions', () => {
  const tumble = getObstacleDimensions('tumbleweed', GROUND_Y);
  assert.equal(tumble.width, 26);
  assert.equal(tumble.height, 26);
  assert.equal(tumble.y, GROUND_Y - 26);

  const cluster = getObstacleDimensions('cactus-tall-cluster', GROUND_Y);
  assert.equal(cluster.width, 68);
  assert.equal(cluster.height, 52);
  assert.equal(cluster.y, GROUND_Y - 52);
});
