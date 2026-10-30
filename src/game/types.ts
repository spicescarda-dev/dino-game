/**
 * Core types for Dino Runner with Friend Profiles
 */

export interface SoundSlot {
  name: string;
  url?: string;
  buffer?: AudioBuffer;
  synthesizerPreset?: 'retro-arcade' | 'cartoon-boing' | 'synth-wave' | 'vocal-punch' | '8bit-hero';
  customFileName?: string;
}

export interface FriendProfile {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  portraitUrl: string; // Image URL, data URL, or SVG
  duckPortraitUrl?: string;
  crashPortraitUrl?: string;
  soundPaths: {
    jump: string;
    duck: string;
    gameover: string;
  };
  soundPreset: 'retro-arcade' | 'cartoon-boing' | 'synth-wave' | '8bit-hero';
  customSounds?: {
    jump?: { fileName: string; dataUrl: string };
    duck?: { fileName: string; dataUrl: string };
    gameover?: { fileName: string; dataUrl: string };
  };
  stats?: {
    gamesPlayed: number;
    highScore: number;
    totalDistance: number;
  };
}

export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ObstacleType =
  | 'cactus-small-single'
  | 'cactus-small-double'
  | 'cactus-small-triple'
  | 'cactus-large-single'
  | 'cactus-large-double'
  | 'pterodactyl-high'
  | 'pterodactyl-mid'
  | 'pterodactyl-low'
  | 'tumbleweed'
  | 'cactus-tall-cluster';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  frame?: number;
  frameTimer?: number;
}

export interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}
