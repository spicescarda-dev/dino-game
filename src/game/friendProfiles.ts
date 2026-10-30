import { FriendProfile } from './types';

/**
 * Creates clean vector SVG avatars for default friend profiles.
 * Can be replaced by custom uploaded image URLs anytime.
 */
export function generateAvatarSvg(
  name: string,
  accentColor: string,
  hairColor: string,
  accessory: 'headband' | 'glasses' | 'headphones',
  state: 'run' | 'duck' | 'crash' = 'run'
): string {
  const isDuck = state === 'duck';
  const isCrash = state === 'crash';

  const w = isDuck ? 64 : 48;
  const h = isDuck ? 32 : 54;

  const eyes = isCrash
    ? `<path d="M14 18 L20 24 M20 18 L14 24 M28 18 L34 24 M34 18 L28 24" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>`
    : isDuck
    ? `<ellipse cx="28" cy="15" rx="3.5" ry="2" fill="#ffffff"/><ellipse cx="38" cy="15" rx="3.5" ry="2" fill="#ffffff"/>`
    : `<ellipse cx="18" cy="20" rx="3" ry="3.5" fill="#ffffff"/><ellipse cx="30" cy="20" rx="3" ry="3.5" fill="#ffffff"/><circle cx="19" cy="20" r="1.5" fill="#111827"/><circle cx="31" cy="20" r="1.5" fill="#111827"/>`;

  let accessorySvg = '';
  if (accessory === 'headband') {
    accessorySvg = isDuck
      ? `<rect x="18" y="7" width="28" height="5" rx="2" fill="${accentColor}"/><circle cx="32" cy="9.5" r="3" fill="#ffffff"/>`
      : `<rect x="10" y="11" width="28" height="5.5" rx="2" fill="${accentColor}"/><circle cx="24" cy="13.7" r="3" fill="#ffffff"/>`;
  } else if (accessory === 'glasses') {
    accessorySvg = isDuck
      ? `<rect x="23" y="11" width="10" height="7" rx="2" fill="#111827" stroke="${accentColor}" stroke-width="1.5"/><rect x="35" y="11" width="10" height="7" rx="2" fill="#111827" stroke="${accentColor}" stroke-width="1.5"/><line x1="33" y1="14" x2="35" y2="14" stroke="${accentColor}" stroke-width="2"/>`
      : `<rect x="13" y="16" width="10" height="8" rx="2" fill="#111827" stroke="${accentColor}" stroke-width="1.5"/><rect x="25" y="16" width="10" height="8" rx="2" fill="#111827" stroke="${accentColor}" stroke-width="1.5"/><line x1="23" y1="20" x2="25" y2="20" stroke="${accentColor}" stroke-width="2"/>`;
  } else if (accessory === 'headphones') {
    accessorySvg = isDuck
      ? `<rect x="14" y="9" width="4" height="12" rx="2" fill="${accentColor}"/><rect x="46" y="9" width="4" height="12" rx="2" fill="${accentColor}"/><path d="M16 11 Q32 2 46 11" fill="none" stroke="${accentColor}" stroke-width="2.5"/>`
      : `<rect x="6" y="15" width="4" height="14" rx="2" fill="${accentColor}"/><rect x="38" y="15" width="4" height="14" rx="2" fill="${accentColor}"/><path d="M8 17 Q24 6 40 17" fill="none" stroke="${accentColor}" stroke-width="3"/>`;
  }

  let bodySvg = '';
  if (isDuck) {
    // Streamlined ducking crouch
    bodySvg = `
      <g>
        <!-- Horizontal crouching body -->
        <rect x="6" y="10" width="48" height="18" rx="9" fill="${accentColor}" opacity="0.95"/>
        <!-- Face/Head shifted forward -->
        <circle cx="34" cy="15" r="13" fill="#fbcfe8"/>
        <!-- Hair -->
        <path d="M22 13 Q30 4 46 9 Q34 6 22 13 Z" fill="${hairColor}"/>
        ${eyes}
        ${accessorySvg}
        <!-- Crouching legs/runners -->
        <rect x="8" y="24" width="14" height="6" rx="3" fill="#1f2937"/>
        <rect x="26" y="24" width="16" height="6" rx="3" fill="#1f2937"/>
      </g>
    `;
  } else {
    // Upright running pose
    bodySvg = `
      <g>
        <!-- Athletic Torso -->
        <rect x="12" y="28" width="24" height="18" rx="6" fill="${accentColor}"/>
        <rect x="16" y="32" width="16" height="8" rx="3" fill="#ffffff" opacity="0.25"/>
        <!-- Head -->
        <circle cx="24" cy="20" r="14" fill="#fbcfe8"/>
        <!-- Hair -->
        <path d="M10 18 Q24 4 38 18 Q24 9 10 18 Z" fill="${hairColor}"/>
        ${eyes}
        ${accessorySvg}
        <!-- Running shorts/legs -->
        <rect x="15" y="44" width="8" height="8" rx="2" fill="#1f2937"/>
        <rect x="25" y="44" width="8" height="8" rx="2" fill="#1f2937"/>
        <!-- Sneakers -->
        <rect x="13" y="49" width="11" height="5" rx="2" fill="#ef4444"/>
        <rect x="24" y="49" width="11" height="5" rx="2" fill="#ef4444"/>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bodySvg}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * JavaScript configuration object mapping each friend's name to their respective
 * image URLs and sound paths as required by specification.
 */
export const DEFAULT_FRIEND_PROFILES: Record<string, FriendProfile> = {
  Alex: {
    id: 'alex',
    name: 'Alex',
    subtitle: 'The Retro Speedster',
    accentColor: '#10b981', // Emerald
    portraitUrl: generateAvatarSvg('Alex', '#10b981', '#1e293b', 'headband', 'run'),
    duckPortraitUrl: generateAvatarSvg('Alex', '#10b981', '#1e293b', 'headband', 'duck'),
    crashPortraitUrl: generateAvatarSvg('Alex', '#10b981', '#1e293b', 'headband', 'crash'),
    soundPaths: {
      jump: '/assets/sounds/alex/jump.mp3',
      duck: '/assets/sounds/alex/duck.mp3',
      gameover: '/assets/sounds/alex/gameover.mp3',
    },
    soundPreset: 'retro-arcade',
    stats: {
      gamesPlayed: 0,
      highScore: 0,
      totalDistance: 0,
    },
  },
  Jordan: {
    id: 'jordan',
    name: 'Jordan',
    subtitle: 'The High-Bounce Daredevil',
    accentColor: '#f59e0b', // Amber
    portraitUrl: generateAvatarSvg('Jordan', '#f59e0b', '#78350f', 'glasses', 'run'),
    duckPortraitUrl: generateAvatarSvg('Jordan', '#f59e0b', '#78350f', 'glasses', 'duck'),
    crashPortraitUrl: generateAvatarSvg('Jordan', '#f59e0b', '#78350f', 'glasses', 'crash'),
    soundPaths: {
      jump: '/assets/sounds/jordan/jump.mp3',
      duck: '/assets/sounds/jordan/duck.mp3',
      gameover: '/assets/sounds/jordan/gameover.mp3',
    },
    soundPreset: 'cartoon-boing',
    stats: {
      gamesPlayed: 0,
      highScore: 0,
      totalDistance: 0,
    },
  },
  Taylor: {
    id: 'taylor',
    name: 'Taylor',
    subtitle: 'The Synthwave Navigator',
    accentColor: '#8b5cf6', // Violet
    portraitUrl: generateAvatarSvg('Taylor', '#8b5cf6', '#4c1d95', 'headphones', 'run'),
    duckPortraitUrl: generateAvatarSvg('Taylor', '#8b5cf6', '#4c1d95', 'headphones', 'duck'),
    crashPortraitUrl: generateAvatarSvg('Taylor', '#8b5cf6', '#4c1d95', 'headphones', 'crash'),
    soundPaths: {
      jump: '/assets/sounds/taylor/jump.mp3',
      duck: '/assets/sounds/taylor/duck.mp3',
      gameover: '/assets/sounds/taylor/gameover.mp3',
    },
    soundPreset: 'synth-wave',
    stats: {
      gamesPlayed: 0,
      highScore: 0,
      totalDistance: 0,
    },
  },
};

const STORAGE_KEY_PROFILES = 'dino_runner_friend_profiles_v1';
const STORAGE_KEY_ACTIVE = 'dino_runner_active_friend_v1';
const STORAGE_KEY_HIGHSCORE = 'dino_runner_high_score_v1';

export function getStoredFriendProfiles(): Record<string, FriendProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_FRIEND_PROFILES, ...parsed };
    }
  } catch {
    // LocalStorage fallback
  }
  return DEFAULT_FRIEND_PROFILES;
}

export function saveFriendProfiles(profiles: Record<string, FriendProfile>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch {
    // Ignore storage quota errors
  }
}

export function getActiveFriendId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (id) return id;
  } catch {
    // Ignore
  }
  return 'Alex';
}

export function setActiveFriendId(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, name);
  } catch {
    // Ignore
  }
}

export function getOverallHighScore(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    if (val) return parseInt(val, 10) || 0;
  } catch {
    // Ignore
  }
  return 0;
}

export function saveOverallHighScore(score: number): void {
  try {
    const current = getOverallHighScore();
    if (score > current) {
      localStorage.setItem(STORAGE_KEY_HIGHSCORE, score.toString());
    }
  } catch {
    // Ignore
  }
}
