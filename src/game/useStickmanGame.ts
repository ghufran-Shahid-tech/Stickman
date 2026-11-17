import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_ASSETS, STORAGE_KEYS } from './assets';
import { GameAudioController } from './audio';
import {
  computeArenaLayout,
  createEnemyBrokenParts,
  drawAim,
  drawBedAndPlayer,
  drawBrokenParts,
  drawEnemy,
  drawFloatingScores,
  drawMuzzleFlashes,
  drawParticles,
  drawProjectiles,
  getEnemyWorldHitbox,
  type EnemyWorldHitbox,
} from './renderer';
import type {
  BrokenPart,
  Enemy,
  EnemySprite,
  FloatingScore,
  GameState,
  LoadedImages,
  MuzzleFlash,
  Particle,
  Point,
  Projectile,
} from './types';

function readStoredBest(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bestScore);
    return Number(raw || 0) || 0;
  } catch {
    return 0;
  }
}

function saveStoredBest(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.bestScore, String(value));
  } catch {
    // Ignore storage errors in private browsing
  }
}

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.muted) === '1';
  } catch {
    return false;
  }
}

function saveStoredMuted(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.muted, value ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

function stripOpaqueDarkBackground(img: HTMLImageElement): HTMLCanvasElement | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const maxDim = 360;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return null;

  offCtx.drawImage(img, 0, 0, w, h);
  const imageData = offCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const isOpaqueDark = (idx: number) =>
    data[idx + 3] > 235 && data[idx] < 24 && data[idx + 1] < 24 && data[idx + 2] < 24;

  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  if (!corners.every(isOpaqueDark)) {
    return null;
  }

  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const pushIfBg = (x: number, y: number) => {
    const pos = y * w + x;
    if (visited[pos]) return;
    const idx = pos * 4;
    if (data[idx] < 28 && data[idx + 1] < 28 && data[idx + 2] < 28) {
      visited[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x += 1) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (head < tail) {
    const pos = queue[head++];
    data[pos * 4 + 3] = 0;

    const x = pos % w;
    const y = (pos - x) / w;
    if (x > 0) pushIfBg(x - 1, y);
    if (x < w - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < h - 1) pushIfBg(x, y + 1);
  }

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const pos = y * w + x;
      if (visited[pos]) continue;
      if (!visited[pos - 1] && !visited[pos + 1] && !visited[pos - w] && !visited[pos + w]) {
        continue;
      }
      const idx = pos * 4;
      const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (lum < 48) {
        data[idx + 3] = Math.round((lum / 48) * data[idx + 3]);
      }
    }
  }

  offCtx.putImageData(imageData, 0, 0);
  return offscreen;
}

function eraseStaticForearm(
  offCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const sample = offCtx.getImageData(Math.round(w * 0.44), Math.round(h * 0.605), 1, 1).data;
  const sheetColor = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;

  offCtx.save();
  // Cover only the static forearm on the gray sheet, leaving elbow, torso, and middle stick intact
  offCtx.strokeStyle = sheetColor;
  offCtx.lineWidth = Math.max(4, w * 0.0125);
  offCtx.lineCap = 'round';
  offCtx.beginPath();
  offCtx.moveTo(w * 0.417, h * 0.590);
  offCtx.lineTo(w * 0.494, h * 0.541);
  offCtx.stroke();

  // Restore the short torso overlap near the hip/junction
  offCtx.strokeStyle = '#080808';
  offCtx.lineWidth = Math.max(3, w * 0.0085);
  offCtx.beginPath();
  offCtx.moveTo(w * 0.452, h * 0.529);
  offCtx.lineTo(w * 0.506, h * 0.559);
  offCtx.stroke();
  offCtx.restore();
}

function prepareBasePlayerCanvas(baseImg: HTMLImageElement): HTMLCanvasElement | null {
  if (!baseImg.complete || !baseImg.naturalWidth) return null;
  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return null;

  offCtx.drawImage(baseImg, 0, 0, w, h);
  eraseStaticForearm(offCtx, w, h);
  return offscreen;
}

function maskPlayerShotWithBase(
  shotImg: HTMLImageElement,
  baseImg: HTMLImageElement,
): HTMLCanvasElement | null {
  if (
    !shotImg.complete ||
    !shotImg.naturalWidth ||
    !baseImg.complete ||
    !baseImg.naturalWidth
  ) {
    return null;
  }
  const w = shotImg.naturalWidth;
  const h = shotImg.naturalHeight;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return null;

  offCtx.drawImage(shotImg, 0, 0, w, h);
  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(baseImg, 0, 0, w, h);
  offCtx.globalCompositeOperation = 'source-over';
  eraseStaticForearm(offCtx, w, h);
  return offscreen;
}

function clampPoint(x: number, y: number, width: number, height: number): Point {
  return {
    x: Math.max(8, Math.min(Math.max(8, width - 8), x)),
    y: Math.max(16, Math.min(Math.max(16, height - 16), y)),
  };
}

function pointToSegmentDistSq(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 1e-9) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy;
}

function segmentToSegmentDistSq(a: Point, b: Point, c: Point, d: Point): number {
  const rX = b.x - a.x;
  const rY = b.y - a.y;
  const sX = d.x - c.x;
  const sY = d.y - c.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) > 1e-9) {
    const qpx = c.x - a.x;
    const qpy = c.y - a.y;
    const t = (qpx * sY - qpy * sX) / denom;
    const u = (qpx * rY - qpy * rX) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return 0;
    }
  }
  return Math.min(
    pointToSegmentDistSq(a, c, d),
    pointToSegmentDistSq(b, c, d),
    pointToSegmentDistSq(c, a, b),
    pointToSegmentDistSq(d, a, b),
  );
}

function doesProjectileHitEnemy(
  prevX: number,
  prevY: number,
  currX: number,
  currY: number,
  shotRadius: number,
  hitbox: EnemyWorldHitbox,
): boolean {
  const p0: Point = { x: prevX, y: prevY };
  const p1: Point = { x: currX, y: currY };

  const headThresholdSq = (hitbox.headRadius + shotRadius) ** 2;
  if (pointToSegmentDistSq(hitbox.headCenter, p0, p1) <= headThresholdSq) {
    return true;
  }

  const limbThresholdSq = (hitbox.limbRadius + shotRadius) ** 2;
  for (const [segA, segB] of hitbox.segments) {
    if (segmentToSegmentDistSq(p0, p1, segA, segB) <= limbThresholdSq) {
      return true;
    }
  }

  return false;
}

export function useStickmanGame() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => readStoredBest());
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => readStoredMuted());

  const audioRef = useRef<GameAudioController | null>(null);
  if (!audioRef.current) {
    audioRef.current = new GameAudioController(readStoredMuted());
  }

  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    score: 0,
    best: readStoredBest(),
    paused: false,
    aiming: false,
    activePointerId: null as number | null,
    hasInteracted: false,
    audioUnlocked: false,
    reducedMotion: false,
    pointer: { x: 0, y: 0 },
    rawPointer: { x: 0, y: 0 },
    elapsed: 0,
    previousTime: 0,
    shotCooldown: 0,
    playerExpressionTimer: 0,
    nextEnemyTime: 0,
    enemySequence: 0,
    enemy: null as Enemy | null,
    brokenParts: [] as BrokenPart[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    floatingScores: [] as FloatingScore[],
    muzzleFlashes: [] as MuzzleFlash[],
  });

  const imagesRef = useRef<LoadedImages | null>(null);

  const togglePause = useCallback((explicitValue?: boolean) => {
    const s = stateRef.current;
    const nextPaused = typeof explicitValue === 'boolean' ? explicitValue : !s.paused;
    s.paused = nextPaused;
    s.aiming = false;
    s.activePointerId = null;
    setGameState(nextPaused ? 'PAUSED' : 'PLAYING');

    const audio = audioRef.current;
    if (!audio) return;
    if (nextPaused) {
      audio.pauseAll();
    } else if (s.enemy) {
      audio.playEnemy(s.enemy.index, false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      saveStoredMuted(next);
      audioRef.current?.setMuted(next);
      if (!next && !stateRef.current.paused && stateRef.current.enemy) {
        audioRef.current?.playEnemy(stateRef.current.enemy.index, false);
      }
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.enemy = null;
    s.brokenParts.length = 0;
    s.projectiles.length = 0;
    s.particles.length = 0;
    s.floatingScores.length = 0;
    s.muzzleFlashes.length = 0;
    s.enemySequence = 0;
    s.elapsed = 0;
    s.nextEnemyTime = 0;
    s.shotCooldown = 0;
    s.playerExpressionTimer = 0;
    s.aiming = false;
    s.activePointerId = null;
    s.pointer = clampPoint(s.width * 0.5, s.height * 0.35, s.width, s.height);
    s.rawPointer = { ...s.pointer };
    s.hasInteracted = false;

    audioRef.current?.stopAll();
    setScore(0);
    setHasInteracted(false);
    if (s.paused) {
      togglePause(false);
    }
  }, [togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!imagesRef.current) {
      const playerImg = loadImage(GAME_ASSETS.player);
      const playerShotImg = loadImage(GAME_ASSETS.playerShot);
      const enemies: EnemySprite[] = GAME_ASSETS.enemies.map(loadImage);

      const tryFinalizeBasePlayer = () => {
        const prepared = prepareBasePlayerCanvas(playerImg);
        if (prepared && imagesRef.current) {
          imagesRef.current.player = prepared;
        }
      };

      const tryFinalizePlayerShot = () => {
        const masked = maskPlayerShotWithBase(playerShotImg, playerImg);
        if (masked && imagesRef.current) {
          imagesRef.current.playerShot = masked;
        }
      };

      playerImg.addEventListener(
        'load',
        () => {
          tryFinalizeBasePlayer();
          tryFinalizePlayerShot();
        },
        { once: true },
      );
      playerShotImg.addEventListener('load', tryFinalizePlayerShot, { once: true });

      const processedEnemies: EnemySprite[] = enemies.map((entry, index) => {
        if (entry instanceof HTMLImageElement) {
          if (entry.complete && entry.naturalWidth > 0) {
            return stripOpaqueDarkBackground(entry) ?? entry;
          }
          entry.addEventListener(
            'load',
            () => {
              const cleaned = stripOpaqueDarkBackground(entry);
              if (cleaned && imagesRef.current) {
                imagesRef.current.enemies[index] = cleaned;
              }
            },
            { once: true },
          );
        }
        return entry;
      });

      imagesRef.current = {
        player: prepareBasePlayerCanvas(playerImg) ?? playerImg,
        playerShot: maskPlayerShotWithBase(playerShotImg, playerImg),
        enemies: processedEnemies,
      };
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    stateRef.current.reducedMotion = motionQuery.matches;
    const handleMotionChange = (event: MediaQueryListEvent) => {
      stateRef.current.reducedMotion = event.matches;
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const resize = () => {
      const rect = shell.getBoundingClientRect();
      const s = stateRef.current;
      s.width = Math.max(1, rect.width);
      s.height = Math.max(1, rect.height);
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(s.width * s.dpr);
      canvas.height = Math.round(s.height * s.dpr);
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      s.pointer = clampPoint(
        s.pointer.x || s.width * 0.5,
        s.pointer.y || s.height * 0.35,
        s.width,
        s.height,
      );
      s.rawPointer = { ...s.pointer };

      if (s.enemy) {
        const layout = computeArenaLayout(s.width, s.height);
        s.enemy.baseY = Math.max(layout.enemyMinY, Math.min(layout.enemyMaxY, s.enemy.baseY));
        s.enemy.y = Math.max(layout.enemyMinY - 28, Math.min(layout.enemyMaxY + 28, s.enemy.y));
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    window.visualViewport?.addEventListener('resize', resize, { passive: true });
    resize();

    const spawnEnemy = () => {
      const s = stateRef.current;
      if (s.width < 10 || s.height < 10) return;
      const layout = computeArenaLayout(s.width, s.height);
      const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const idx = s.enemySequence % GAME_ASSETS.enemies.length;
      const startY =
        layout.enemyMinY + Math.random() * (layout.enemyMaxY - layout.enemyMinY);

      s.enemy = {
        index: idx,
        direction,
        x: direction > 0 ? -layout.headSize * 1.5 : s.width + layout.headSize * 1.5,
        y: startY,
        baseY: startY,
        vy: 0,
        speed: Math.max(95, Math.min(s.width * 0.25, 195)),
        phase: Math.random() * Math.PI * 2,
        angle: -0.06,
        headAngle: 0,
        headOffsetY: 0,
        headVelY: 0,
        hit: false,
        age: 0,
      };
      s.enemySequence += 1;
      audioRef.current?.stopAllEnemies(true);
      audioRef.current?.playEnemy(idx, true);
    };

    const addImpactBurst = (x: number, y: number) => {
      const s = stateRef.current;
      const count = s.reducedMotion ? 8 : 22;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = s.reducedMotion ? 40 + Math.random() * 70 : 95 + Math.random() * 230;
        const color =
          i % 3 === 0 ? '#ff1e3c' : i % 3 === 1 ? '#ff6b81' : '#111111';
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (s.reducedMotion ? 20 : 55),
          life: 0.45 + Math.random() * 0.35,
          size: 2.5 + Math.random() * 3.5,
          rotation: Math.random() * Math.PI,
          color,
        });
      }
      s.floatingScores.push({
        x,
        y: y - 14,
        vy: s.reducedMotion ? -20 : -55,
        life: 0.7,
        maxLife: 0.7,
      });
    };

    const defeatEnemy = (
      hitX?: number,
      hitY?: number,
      shotVx = 0,
      shotVy = 0,
    ) => {
      const s = stateRef.current;
      if (!s.enemy || s.enemy.hit) return;
      const hitEnemy = s.enemy;
      hitEnemy.hit = true;
      const x = hitX ?? hitEnemy.x;
      const y = hitY ?? hitEnemy.y;

      const layout = computeArenaLayout(s.width, s.height);
      const parts = createEnemyBrokenParts(
        hitEnemy,
        layout,
        s.elapsed,
        s.reducedMotion,
        x,
        y,
        shotVx,
        shotVy,
      );
      s.brokenParts.push(...parts);

      s.enemy = null;

      audioRef.current?.stopAllEnemies(true);
      audioRef.current?.playHit();

      s.score += 1;
      setScore(s.score);
      if (s.score > s.best) {
        s.best = s.score;
        setBest(s.best);
        saveStoredBest(s.best);
      }

      addImpactBurst(x, y);
      s.nextEnemyTime = s.elapsed + 0.85;
    };

    const fireProjectile = () => {
      const s = stateRef.current;
      if (s.shotCooldown > 0) return;

      const layout = computeArenaLayout(s.width, s.height);
      const dx = s.pointer.x - layout.muzzleX;
      const dy = s.pointer.y - layout.muzzleY;
      const length = Math.hypot(dx, dy);
      const ux = length >= 6 ? dx / length : 0;
      const uy = length >= 6 ? dy / length : -1;
      const speed = Math.max(920, Math.min(s.width * 2.0, 1480));

      s.projectiles.push({
        x: layout.muzzleX,
        y: layout.muzzleY,
        vx: ux * speed,
        vy: uy * speed,
        life: 2.0,
        radius: Math.max(4, Math.min(6.5, s.width * 0.011)),
      });

      if (!s.reducedMotion) {
        const angle = Math.atan2(uy, ux);
        s.muzzleFlashes.push({
          x: layout.muzzleX,
          y: layout.muzzleY,
          angle,
          life: 0.14,
          maxLife: 0.14,
        });

        for (let i = 0; i < 6; i += 1) {
          const spread = (Math.random() - 0.5) * 0.8;
          const sparkAngle = angle + spread;
          const sparkSpeed = 160 + Math.random() * 220;
          s.particles.push({
            x: layout.muzzleX + ux * 4,
            y: layout.muzzleY + uy * 4,
            vx: Math.cos(sparkAngle) * sparkSpeed,
            vy: Math.sin(sparkAngle) * sparkSpeed,
            life: 0.14 + Math.random() * 0.1,
            size: 2 + Math.random() * 1.4,
            rotation: sparkAngle,
            color: i % 2 === 0 ? '#ff1e3c' : '#ff6b81',
          });
        }
      }

      s.shotCooldown = 0.17;
      s.playerExpressionTimer = 0.55;
      audioRef.current?.playFire();
    };

    const getPointerPosition = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return clampPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        stateRef.current.width,
        stateRef.current.height,
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = stateRef.current;
      if (s.paused || event.button === 2) return;
      if (s.aiming && s.activePointerId !== null && s.activePointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();

      if (!s.hasInteracted) {
        s.hasInteracted = true;
        setHasInteracted(true);
      }
      if (!s.audioUnlocked) {
        s.audioUnlocked = true;
        if (s.enemy) {
          audioRef.current?.playEnemy(s.enemy.index, false);
        }
      }

      s.aiming = true;
      s.activePointerId = event.pointerId;
      const pos = getPointerPosition(event);
      s.rawPointer = pos;
      s.pointer = { ...pos };
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture errors
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const s = stateRef.current;
      if (!s.aiming || s.paused) return;
      if (s.activePointerId !== null && event.pointerId !== s.activePointerId) return;
      event.preventDefault();
      const pos = getPointerPosition(event);
      s.rawPointer = pos;
      if (s.reducedMotion) {
        s.pointer = { ...pos };
      }
    };

    const releaseCapture = (pointerId: number) => {
      try {
        if (canvas.hasPointerCapture(pointerId)) {
          canvas.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore pointer capture errors
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const s = stateRef.current;
      if (!s.aiming || s.paused) return;
      if (s.activePointerId !== null && event.pointerId !== s.activePointerId) return;
      event.preventDefault();
      const pos = getPointerPosition(event);
      const liftDelta = Math.hypot(pos.x - s.rawPointer.x, pos.y - s.rawPointer.y);
      const target = liftDelta > 14 ? pos : s.rawPointer;
      s.rawPointer = target;
      if (s.reducedMotion) {
        s.pointer = { ...target };
      } else {
        s.pointer.x += (target.x - s.pointer.x) * 0.75;
        s.pointer.y += (target.y - s.pointer.y) * 0.75;
      }
      s.aiming = false;
      s.activePointerId = null;
      releaseCapture(event.pointerId);
      fireProjectile();
    };

    const onPointerCancel = (event: PointerEvent) => {
      const s = stateRef.current;
      if (s.activePointerId !== null && event.pointerId !== s.activePointerId) return;
      s.aiming = false;
      s.activePointerId = null;
      releaseCapture(event.pointerId);
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('contextmenu', onContextMenu);

    const onVisibilityChange = () => {
      if (document.hidden && !stateRef.current.paused) {
        togglePause(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === 'p' || key === ' ' || key === 'escape') {
        event.preventDefault();
        togglePause();
      } else if (key === 'r') {
        event.preventDefault();
        resetGame();
      } else if (key === 'm') {
        event.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const update = (dt: number) => {
      const s = stateRef.current;
      if (s.paused || s.width < 10 || s.height < 10) return;

      s.elapsed += dt;
      s.shotCooldown = Math.max(0, s.shotCooldown - dt);
      s.playerExpressionTimer = Math.max(0, s.playerExpressionTimer - dt);

      if (s.aiming && !s.reducedMotion) {
        const smooth = 1 - Math.exp(-34 * dt);
        s.pointer.x += (s.rawPointer.x - s.pointer.x) * smooth;
        s.pointer.y += (s.rawPointer.y - s.pointer.y) * smooth;
      }

      if (!s.enemy && s.elapsed >= s.nextEnemyTime) {
        spawnEnemy();
      }

      const arenaLayout = computeArenaLayout(s.width, s.height);

      if (s.enemy) {
        s.enemy.age += dt;
        s.enemy.x += s.enemy.direction * s.enemy.speed * dt;
        if (!s.reducedMotion) {
          // Smooth Superman swoop flight + vertical spring-damper physics
          const targetY =
            s.enemy.baseY + Math.sin(s.elapsed * 2.5 + s.enemy.phase) * 26;
          const ay = (targetY - s.enemy.y) * 16 - s.enemy.vy * 4.8;
          s.enemy.vy += ay * dt;
          s.enemy.y += s.enemy.vy * dt;

          // Aerodynamic banking pitch matching climb/dive
          const targetAngle =
            -0.06 +
            Math.max(
              -0.24,
              Math.min(0.24, (s.enemy.vy / Math.max(80, s.enemy.speed)) * 0.48),
            );
          s.enemy.angle += (targetAngle - s.enemy.angle) * (1 - Math.exp(-10 * dt));

          // Secondary spring physics for head inertia and pitch lag
          const headSpringAccel =
            -95 * s.enemy.headOffsetY - 12 * s.enemy.headVelY - ay * 0.032;
          s.enemy.headVelY += headSpringAccel * dt;
          s.enemy.headOffsetY = Math.max(
            -10,
            Math.min(10, s.enemy.headOffsetY + s.enemy.headVelY * dt),
          );
          const targetHeadAngle =
            -s.enemy.angle * 0.45 +
            Math.max(-0.22, Math.min(0.22, -s.enemy.vy * 0.0009));
          s.enemy.headAngle +=
            (targetHeadAngle - s.enemy.headAngle) * (1 - Math.exp(-12 * dt));
        }
        if (
          (s.enemy.direction > 0 && s.enemy.x > s.width + arenaLayout.headSize * 1.8) ||
          (s.enemy.direction < 0 && s.enemy.x < -arenaLayout.headSize * 1.8)
        ) {
          s.enemy = null;
          audioRef.current?.stopAllEnemies(true);
          s.nextEnemyTime = s.elapsed + 0.55;
        }
      }

      const enemyHitbox =
        s.enemy && !s.enemy.hit
          ? getEnemyWorldHitbox(s.enemy, arenaLayout, s.elapsed, s.reducedMotion)
          : null;

      for (let i = s.projectiles.length - 1; i >= 0; i -= 1) {
        const shot = s.projectiles[i];
        const prevX = shot.x;
        const prevY = shot.y;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.life -= dt;

        if (
          s.enemy &&
          !s.enemy.hit &&
          enemyHitbox &&
          doesProjectileHitEnemy(prevX, prevY, shot.x, shot.y, shot.radius, enemyHitbox)
        ) {
          defeatEnemy(shot.x, shot.y, shot.vx, shot.vy);
          s.projectiles.splice(i, 1);
          continue;
        }

        if (
          shot.life <= 0 ||
          shot.x < -40 ||
          shot.x > s.width + 40 ||
          shot.y < -40 ||
          shot.y > s.height + 40
        ) {
          s.projectiles.splice(i, 1);
        }
      }

      const debrisGravity = s.reducedMotion ? 520 : 1150;
      const floorY = Math.min(
        s.height - 16,
        arenaLayout.bedY + arenaLayout.bedHeight * 0.34,
      );
      for (let i = s.brokenParts.length - 1; i >= 0; i -= 1) {
        const part = s.brokenParts[i];
        part.vx *= Math.exp(-0.85 * dt);
        part.vy += debrisGravity * dt;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.angle += part.omega * dt;

        const partRadius =
          part.kind === 'head'
            ? (part.headSize ?? 70) * 0.34 * part.scale
            : part.kind === 'cape'
              ? 14 * part.scale
              : Math.abs(Math.sin(part.angle)) * (part.length ?? 20) * 0.45 +
                Math.max(3, (part.thickness ?? 5) * 0.65);
        if (part.y + partRadius > floorY) {
          part.y = floorY - partRadius;
          if (Math.abs(part.vy) > 45 && part.bounces < 3) {
            part.vy = -Math.abs(part.vy) * (part.kind === 'head' ? 0.46 : 0.34);
            part.vx *= 0.72;
            part.omega *= 0.6;
            part.bounces += 1;
          } else {
            part.vy = 0;
            part.vx *= Math.exp(-6 * dt);
            part.omega *= Math.exp(-7 * dt);
          }
        }

        part.life -= dt;
        if (part.life <= 0) {
          s.brokenParts.splice(i, 1);
        }
      }

      for (let i = s.particles.length - 1; i >= 0; i -= 1) {
        const part = s.particles[i];
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.vy += 280 * dt;
        part.rotation += 4 * dt;
        part.life -= dt;
        if (part.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      for (let i = s.floatingScores.length - 1; i >= 0; i -= 1) {
        const pop = s.floatingScores[i];
        pop.y += pop.vy * dt;
        pop.life -= dt;
        if (pop.life <= 0) {
          s.floatingScores.splice(i, 1);
        }
      }

      for (let i = s.muzzleFlashes.length - 1; i >= 0; i -= 1) {
        const flash = s.muzzleFlashes[i];
        flash.life -= dt;
        if (flash.life <= 0) {
          s.muzzleFlashes.splice(i, 1);
        }
      }
    };

    const render = () => {
      const s = stateRef.current;
      const images = imagesRef.current;
      if (!images) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.width, s.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s.width, s.height);

      const layout = computeArenaLayout(s.width, s.height);
      drawEnemy(ctx, s.enemy, images, layout, s.elapsed, s.reducedMotion);
      drawBedAndPlayer(
        ctx,
        images,
        layout,
        s.playerExpressionTimer > 0,
        s.elapsed,
        s.reducedMotion,
      );
      drawBrokenParts(ctx, s.brokenParts, images);
      drawMuzzleFlashes(ctx, s.muzzleFlashes);
      drawAim(ctx, s.aiming, s.pointer, layout);
      drawProjectiles(ctx, s.projectiles);
      drawParticles(ctx, s.particles);
      drawFloatingScores(ctx, s.floatingScores);
    };

    let rafId = 0;
    const frame = (timestamp: number) => {
      const s = stateRef.current;
      if (!s.previousTime) {
        s.previousTime = timestamp;
      }
      const dt = Math.min((timestamp - s.previousTime) / 1000, 0.035);
      s.previousTime = timestamp;
      update(dt);
      render();
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', handleMotionChange);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
      audioRef.current?.stopAll();
    };
  }, [resetGame, toggleMute, togglePause]);

  return {
    shellRef,
    canvasRef,
    score,
    best,
    gameState,
    hasInteracted,
    muted,
    togglePause,
    toggleMute,
    resetGame,
  };
}
