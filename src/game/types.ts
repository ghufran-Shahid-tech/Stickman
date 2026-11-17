export type GameState = 'PLAYING' | 'PAUSED';

export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  spawnId: number;
  index: number;
  direction: 1 | -1;
  x: number;
  y: number;
  baseY: number;
  vy: number;
  speed: number;
  phase: number;
  angle: number;
  headAngle: number;
  headOffsetY: number;
  headVelY: number;
  hit: boolean;
  age: number;
}

export type BrokenPartKind = 'head' | 'limb' | 'cape';

export interface BrokenPart {
  kind: BrokenPartKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  life: number;
  maxLife: number;
  scale: number;
  direction: 1 | -1;
  // For 'limb': local segment length centered at (0, 0) + thickness + optional joint dot end
  length?: number;
  thickness?: number;
  dotSide?: -1 | 0 | 1;
  // For 'head': enemy sprite index & head size
  enemyIndex?: number;
  headSize?: number;
  bounces: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  targetEnemySpawnId: number | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  rotation: number;
  color?: string;
}

export interface FloatingScore {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface MuzzleFlash {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
}

export interface ArenaLayout {
  bedY: number;
  bedX: number;
  bedTop: number;
  bedWidth: number;
  bedHeight: number;
  playerX: number;
  playerY: number;
  muzzleX: number;
  muzzleY: number;
  enemyMinY: number;
  enemyMaxY: number;
  headSize: number;
  bodyScale: number;
}

export type EnemySprite = HTMLImageElement | HTMLCanvasElement;

export interface LoadedImages {
  player: EnemySprite;
  playerShot: HTMLCanvasElement | null;
  enemies: EnemySprite[];
}
