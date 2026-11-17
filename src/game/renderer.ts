import type {
  ArenaLayout,
  BrokenPart,
  Enemy,
  FloatingScore,
  LoadedImages,
  MuzzleFlash,
  Particle,
  Point,
  Projectile,
} from './types';

export function computeArenaLayout(width: number, height: number): ArenaLayout {
  const shortSide = Math.min(width, height);
  const bedWidth = Math.min(width * 0.92, 850, height * 0.82 * 2);
  const bedHeight = bedWidth / 2;
  const bedY = Math.min(height * 0.785, height - bedHeight * 0.45 - 12);
  const bedX = (width - bedWidth) / 2;
  const bedTop = bedY - bedHeight * 0.55;

  return {
    bedY,
    bedX,
    bedTop,
    bedWidth,
    bedHeight,
    playerX: bedX + bedWidth * 0.27,
    playerY: bedTop + bedHeight * 0.35,
    muzzleX: bedX + bedWidth * 0.518,
    muzzleY: bedTop + bedHeight * 0.484,
    enemyMinY: height * 0.205,
    enemyMaxY: height * 0.345,
    headSize: Math.max(46, Math.min(shortSide * 0.17, 108)),
    bodyScale: Math.max(0.72, Math.min(shortSide / 420, 1.35)),
  };
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  color = '#111111',
  thickness = 5,
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 4,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement | undefined,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
): boolean {
  if (!img) return false;
  const sourceW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const sourceH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  if (img instanceof HTMLImageElement && !img.complete) {
    return false;
  }
  if (!sourceW || !sourceH) {
    return false;
  }
  const ratio = sourceW / sourceH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  return true;
}

export interface EnemyWorldHitbox {
  segments: ReadonlyArray<readonly [Point, Point]>;
  limbRadius: number;
  headCenter: Point;
  headRadius: number;
}

interface EnemyLocalPose {
  s: number;
  bodyAngle: number;
  headAngle: number;
  flutter: number;
  capeLift: number;
  torso: readonly [readonly [number, number], readonly [number, number]];
  neck: readonly [readonly [number, number], readonly [number, number]];
  armLead: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  armTrail: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  legTop: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  legBottom: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  jointEndpoints: ReadonlyArray<readonly [number, number]>;
  headX: number;
  headY: number;
  capePoints: ReadonlyArray<readonly [number, number]>;
}

function getEnemyLocalPose(
  enemy: Enemy,
  layout: ArenaLayout,
  elapsed: number,
  reducedMotion: boolean,
): EnemyLocalPose {
  const s = layout.bodyScale;
  const flutter = reducedMotion ? 0 : Math.sin(elapsed * 9.5 + enemy.phase) * 2.1;
  const fistBob = reducedMotion ? 0 : Math.sin(elapsed * 5.2 + enemy.phase) * 1.4;
  const capeLift = reducedMotion ? 0 : Math.max(-12, Math.min(12, -enemy.vy * 0.05));
  const capeWave = reducedMotion ? 0 : Math.sin(elapsed * 13 + enemy.phase) * 5.5;
  const headLocalY = -10 + (reducedMotion ? 0 : enemy.headOffsetY / Math.max(0.4, s));

  return {
    s,
    bodyAngle: reducedMotion ? -0.05 : enemy.angle,
    headAngle: reducedMotion ? 0 : enemy.headAngle,
    flutter,
    capeLift,
    torso: [
      [-4, -2],
      [-40, 5],
    ],
    neck: [
      [-2, -2],
      [11, headLocalY + 4],
    ],
    // Classic Superman straight outstretched lead arm + clenched fist
    armLead: [
      [-2, 0],
      [32, fistBob * 0.4],
      [66, -4 + fistBob],
    ],
    // Trailing back arm swept alongside torso
    armTrail: [
      [-5, 0],
      [-24, 12 - fistBob * 0.3],
      [-42, 14 - fistBob * 0.5],
    ],
    // Streamlined flying legs trailing behind
    legTop: [
      [-40, 5],
      [-66, 3 - flutter * 0.5],
      [-93, 1 - flutter],
    ],
    legBottom: [
      [-40, 6],
      [-64, 12 + flutter * 0.5],
      [-90, 16 + flutter],
    ],
    jointEndpoints: [
      [66, -4 + fistBob],
      [-42, 14 - fistBob * 0.5],
      [-93, 1 - flutter],
      [-90, 16 + flutter],
    ],
    headX: 15,
    headY: headLocalY,
    capePoints: [
      [-5, -4],
      [-26, -15 + capeLift * 0.45 + capeWave * 0.35],
      [-58, -17 + capeLift * 0.85 - capeWave * 0.65],
      [-80, -8 + capeLift + capeWave],
      [-64, 4 + capeLift * 0.65 - capeWave * 0.45],
      [-32, 3 + capeLift * 0.3],
      [-10, 1],
    ],
  };
}

function localToWorld(
  enemy: Enemy,
  pose: EnemyLocalPose,
  lx: number,
  ly: number,
): Point {
  const cos = Math.cos(pose.bodyAngle);
  const sin = Math.sin(pose.bodyAngle);
  const rx = lx * cos - ly * sin;
  const ry = lx * sin + ly * cos;
  return {
    x: enemy.x + enemy.direction * rx * pose.s,
    y: enemy.y + ry * pose.s,
  };
}

export function getEnemyWorldHitbox(
  enemy: Enemy,
  layout: ArenaLayout,
  elapsed: number,
  reducedMotion: boolean,
): EnemyWorldHitbox {
  const pose = getEnemyLocalPose(enemy, layout, elapsed, reducedMotion);
  const toWorld = (lx: number, ly: number): Point =>
    localToWorld(enemy, pose, lx, ly);

  const segments: Array<readonly [Point, Point]> = [];
  const addPolyline = (pts: ReadonlyArray<readonly [number, number]>) => {
    for (let i = 0; i < pts.length - 1; i += 1) {
      segments.push([
        toWorld(pts[i][0], pts[i][1]),
        toWorld(pts[i + 1][0], pts[i + 1][1]),
      ]);
    }
  };

  addPolyline(pose.torso);
  addPolyline(pose.neck);
  addPolyline(pose.armLead);
  addPolyline(pose.armTrail);
  addPolyline(pose.legTop);
  addPolyline(pose.legBottom);

  return {
    segments,
    limbRadius: Math.max(8, 9 * pose.s),
    headCenter: toWorld(pose.headX, pose.headY),
    headRadius: layout.headSize * 0.46 * pose.s,
  };
}

export function createEnemyBrokenParts(
  enemy: Enemy,
  layout: ArenaLayout,
  elapsed: number,
  reducedMotion: boolean,
  hitX: number,
  hitY: number,
  shotVx: number,
  shotVy: number,
): BrokenPart[] {
  const pose = getEnemyLocalPose(enemy, layout, elapsed, reducedMotion);
  const parts: BrokenPart[] = [];
  const baseVx = enemy.direction * enemy.speed * 0.42 + shotVx * 0.14;
  const baseVy = enemy.vy * 0.45 + shotVy * 0.12 - (reducedMotion ? 80 : 185);
  const worldBodyAngle = enemy.direction * pose.bodyAngle;

  const pushImpulse = (
    worldX: number,
    worldY: number,
    radialBoost: number,
    upBoost: number,
  ) => {
    const dx = worldX - hitX;
    const dy = worldY - hitY;
    const dist = Math.max(12, Math.hypot(dx, dy));
    const proximity = Math.max(0.4, 1.4 - dist / 140);
    const rx = (dx / dist) * radialBoost * proximity;
    const ry = (dy / dist) * radialBoost * proximity;
    const jitterX = (Math.random() - 0.5) * (reducedMotion ? 50 : 165);
    const jitterY = (Math.random() - 0.5) * (reducedMotion ? 40 : 130);
    return {
      vx: baseVx + rx + jitterX,
      vy: baseVy + ry - upBoost + jitterY,
    };
  };

  const addLimbSegment = (
    a: readonly [number, number],
    b: readonly [number, number],
    thickness: number,
    dotSide: -1 | 0 | 1,
    maxLife = 2.0,
  ) => {
    const wa = localToWorld(enemy, pose, a[0], a[1]);
    const wb = localToWorld(enemy, pose, b[0], b[1]);
    const mx = (wa.x + wb.x) * 0.5;
    const my = (wa.y + wb.y) * 0.5;
    const segLen = Math.max(8, Math.hypot(wb.x - wa.x, wb.y - wa.y));
    const segAngle = Math.atan2(wb.y - wa.y, wb.x - wa.x);
    const imp = pushImpulse(mx, my, reducedMotion ? 70 : 210, reducedMotion ? 40 : 120);

    parts.push({
      kind: 'limb',
      x: mx,
      y: my,
      vx: imp.vx,
      vy: imp.vy,
      angle: segAngle,
      omega: (Math.random() - 0.5) * (reducedMotion ? 3 : 13),
      life: maxLife + Math.random() * 0.35,
      maxLife: maxLife + 0.35,
      scale: pose.s,
      direction: enemy.direction,
      length: segLen,
      thickness: thickness * pose.s,
      dotSide,
      bounces: 0,
    });
  };

  // Detached torso & neck
  addLimbSegment(pose.torso[0], pose.torso[1], 5.5, 0, 2.1);
  addLimbSegment(pose.neck[0], pose.neck[1], 4.8, 0, 1.9);

  // Detached Superman arms (upper + forearm/fist)
  addLimbSegment(pose.armLead[0], pose.armLead[1], 5, 0, 2.0);
  addLimbSegment(pose.armLead[1], pose.armLead[2], 5, 1, 2.1);
  addLimbSegment(pose.armTrail[0], pose.armTrail[1], 4.8, 0, 2.0);
  addLimbSegment(pose.armTrail[1], pose.armTrail[2], 4.8, 1, 2.1);

  // Detached legs (thigh + shin/foot)
  addLimbSegment(pose.legTop[0], pose.legTop[1], 5, 0, 2.05);
  addLimbSegment(pose.legTop[1], pose.legTop[2], 5, 1, 2.15);
  addLimbSegment(pose.legBottom[0], pose.legBottom[1], 5, 0, 2.05);
  addLimbSegment(pose.legBottom[1], pose.legBottom[2], 5, 1, 2.15);

  // Detached flying cape
  const capeWorld = localToWorld(enemy, pose, -38, -6);
  const capeImp = pushImpulse(capeWorld.x, capeWorld.y, reducedMotion ? 55 : 165, 95);
  parts.push({
    kind: 'cape',
    x: capeWorld.x,
    y: capeWorld.y,
    vx: capeImp.vx * 0.85,
    vy: capeImp.vy - 40,
    angle: worldBodyAngle,
    omega: (Math.random() - 0.5) * (reducedMotion ? 2 : 7.5),
    life: 2.1,
    maxLife: 2.1,
    scale: pose.s,
    direction: enemy.direction,
    bounces: 0,
  });

  // Detached head
  const headWorld = localToWorld(enemy, pose, pose.headX, pose.headY);
  const headImp = pushImpulse(headWorld.x, headWorld.y, reducedMotion ? 60 : 185, 115);
  parts.push({
    kind: 'head',
    x: headWorld.x,
    y: headWorld.y,
    vx: headImp.vx,
    vy: headImp.vy,
    angle: enemy.direction * (pose.bodyAngle + pose.headAngle),
    omega: enemy.direction * (2.8 + Math.random() * 4.5) * (reducedMotion ? 0.35 : 1),
    life: 2.35,
    maxLife: 2.35,
    scale: pose.s,
    direction: enemy.direction,
    enemyIndex: enemy.index,
    headSize: layout.headSize,
    bounces: 0,
  });

  return parts;
}

export function drawBrokenParts(
  ctx: CanvasRenderingContext2D,
  parts: ReadonlyArray<BrokenPart>,
  images: LoadedImages,
): void {
  for (const part of parts) {
    const fade = Math.max(0, Math.min(1, part.life / 0.45));
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(part.x, part.y);

    if (part.kind === 'limb') {
      ctx.rotate(part.angle);
      const halfLen = (part.length ?? 20) * 0.5;
      const thick = part.thickness ?? 5;
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-halfLen, 0);
      ctx.lineTo(halfLen, 0);
      ctx.stroke();

      if (part.dotSide) {
        drawDot(ctx, part.dotSide * halfLen, 0, Math.max(2.6, thick * 0.72));
      }
    } else if (part.kind === 'cape') {
      ctx.rotate(part.angle);
      if (part.direction < 0) {
        ctx.scale(-1, 1);
      }
      ctx.scale(part.scale, part.scale);
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(22, -4);
      ctx.quadraticCurveTo(0, -14, -28, -9);
      ctx.quadraticCurveTo(-18, 2, -24, 12);
      ctx.quadraticCurveTo(2, 10, 20, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (part.kind === 'head' && part.enemyIndex !== undefined) {
      ctx.rotate(part.angle);
      if (part.direction < 0) {
        ctx.scale(-1, 1);
      }
      ctx.scale(part.scale, part.scale);
      const hSize = part.headSize ?? 72;
      drawImageContain(ctx, images.enemies[part.enemyIndex], 0, 0, hSize * 0.92, hSize);
    }

    ctx.restore();
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy | null,
  images: LoadedImages,
  layout: ArenaLayout,
  elapsed: number,
  reducedMotion: boolean,
): void {
  if (!enemy) return;
  const pose = getEnemyLocalPose(enemy, layout, elapsed, reducedMotion);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.direction < 0) {
    ctx.scale(-1, 1);
  }
  ctx.scale(pose.s, pose.s);
  ctx.rotate(pose.bodyAngle);

  // Subtle aerodynamic slipstream speed lines behind Superman
  if (!reducedMotion) {
    ctx.save();
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.14)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    const streakShift = ((elapsed * 90 + enemy.phase * 15) % 18) - 9;
    ctx.beginPath();
    ctx.moveTo(-88 - streakShift, -14);
    ctx.lineTo(-118 - streakShift, -14);
    ctx.moveTo(-98 + streakShift * 0.6, 10);
    ctx.lineTo(-126 + streakShift * 0.6, 10);
    ctx.stroke();
    ctx.restore();
  }

  // Flowing crimson Superman cape behind the body
  ctx.save();
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const [c0, ...cRest] = pose.capePoints;
  ctx.moveTo(c0[0], c0[1]);
  for (const [cx, cy] of cRest) {
    ctx.lineTo(cx, cy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle cape crease highlight
  ctx.strokeStyle = 'rgba(127, 29, 29, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-56, -8 + pose.capeLift * 0.6);
  ctx.stroke();
  ctx.restore();

  // Trailing back arm
  drawLine(ctx, pose.armTrail, '#111111', 4.8);

  // Streamlined trailing legs
  drawLine(ctx, pose.legTop, '#111111', 5);
  drawLine(ctx, pose.legBottom, '#111111', 5);

  // Torso & neck
  drawLine(ctx, pose.torso, '#111111', 5.5);
  drawLine(ctx, pose.neck, '#111111', 4.8);

  // Straight Superman reaching arm behind the head + clenched fist
  drawLine(ctx, pose.armLead, '#111111', 5);

  for (const [jx, jy] of pose.jointEndpoints) {
    drawDot(ctx, jx, jy, 3.6);
  }

  // Head drawn in front of the outstretched arm with secondary spring pitch/bob physics
  ctx.save();
  ctx.translate(pose.headX, pose.headY);
  ctx.rotate(pose.headAngle);
  drawImageContain(
    ctx,
    images.enemies[enemy.index],
    0,
    0,
    layout.headSize * 0.92,
    layout.headSize,
  );
  ctx.restore();

  ctx.restore();
}

export function drawBedAndPlayer(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  layout: ArenaLayout,
  showShotExpression = false,
  elapsed = 0,
  reducedMotion = false,
): void {
  const sprite =
    showShotExpression && images.playerShot ? images.playerShot : images.player;
  const isReady =
    sprite instanceof HTMLCanvasElement
      ? sprite.width > 0
      : sprite.complete && sprite.naturalWidth > 0;
  if (!isReady) return;

  ctx.drawImage(
    sprite,
    layout.bedX,
    layout.bedTop,
    layout.bedWidth,
    layout.bedHeight,
  );

  // Animate forearm + gripping hand sliding up and down along the middle stick
  const elbowX = layout.bedX + layout.bedWidth * 0.4115;
  const elbowY = layout.bedTop + layout.bedHeight * 0.5935;
  const stickBaseX = layout.bedX + layout.bedWidth * 0.504;
  const stickBaseY = layout.bedTop + layout.bedHeight * 0.538;
  const stickTopX = layout.bedX + layout.bedWidth * 0.517;
  const stickTopY = layout.bedTop + layout.bedHeight * 0.488;

  const t = reducedMotion ? 0.45 : 0.5 - 0.5 * Math.cos(elapsed * 6.5);
  const handX = stickBaseX + (stickTopX - stickBaseX) * t;
  const handY = stickBaseY + (stickTopY - stickBaseY) * t;

  ctx.save();
  ctx.strokeStyle = '#080808';
  ctx.lineWidth = Math.max(3, layout.bedWidth * 0.0085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  const stickAngle = Math.atan2(stickTopY - stickBaseY, stickTopX - stickBaseX);
  ctx.fillStyle = '#080808';
  ctx.beginPath();
  ctx.ellipse(
    handX,
    handY,
    Math.max(3, layout.bedWidth * 0.0075),
    Math.max(2.2, layout.bedWidth * 0.0052),
    stickAngle,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

export function drawAim(
  ctx: CanvasRenderingContext2D,
  aiming: boolean,
  pointer: Point,
  layout: ArenaLayout,
): void {
  if (!aiming) return;

  const dx = pointer.x - layout.muzzleX;
  const dy = pointer.y - layout.muzzleY;
  const rawDist = Math.hypot(dx, dy);
  const ux = rawDist >= 6 ? dx / rawDist : 0;
  const uy = rawDist >= 6 ? dy / rawDist : -1;

  const minStickLength = Math.max(250, layout.bedWidth * 0.65);
  const stickLength = Math.max(rawDist + 100, minStickLength);
  const tipX = layout.muzzleX + ux * stickLength;
  const tipY = layout.muzzleY + uy * stickLength;

  ctx.save();

  // Origin dot at the aiming hand
  ctx.beginPath();
  ctx.arc(layout.muzzleX, layout.muzzleY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();

  // Extended dashed aim stick
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.setLineDash([11, 9]);
  ctx.beginPath();
  ctx.moveTo(layout.muzzleX, layout.muzzleY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Subtle drag point marker
  if (rawDist >= 10) {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17, 17, 17, 0.45)';
    ctx.fill();
  }

  // Aim sight ring at the end of the extended stick
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
  ctx.lineWidth = 2.25;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();

  ctx.restore();
}

export function drawMuzzleFlashes(
  ctx: CanvasRenderingContext2D,
  flashes: ReadonlyArray<MuzzleFlash>,
): void {
  for (const flash of flashes) {
    const ratio = Math.max(0, flash.life / flash.maxLife);
    const progress = 1 - ratio;

    ctx.save();
    ctx.translate(flash.x, flash.y);
    ctx.rotate(flash.angle);

    // Expanding laser shockwave ring
    ctx.globalAlpha = ratio * 0.65;
    ctx.strokeStyle = '#ff2a4b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + progress * 24, 0, Math.PI * 2);
    ctx.stroke();

    // Forward directional laser emitter spike + cross lens flare
    ctx.globalAlpha = Math.min(1, ratio * 1.2);
    const beamSpikeLen = (34 + progress * 18) * (0.65 + ratio * 0.35);
    const flareGrad = ctx.createLinearGradient(-6, 0, beamSpikeLen, 0);
    flareGrad.addColorStop(0, 'rgba(255, 30, 60, 0)');
    flareGrad.addColorStop(0.25, '#ff1e3c');
    flareGrad.addColorStop(0.65, '#ff6b81');
    flareGrad.addColorStop(1, 'rgba(255, 30, 60, 0)');

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -2.5 * ratio);
    ctx.lineTo(beamSpikeLen * 0.28, -9 * ratio - 1.5);
    ctx.lineTo(beamSpikeLen * 0.25, -2.5 * ratio);
    ctx.lineTo(beamSpikeLen, 0);
    ctx.lineTo(beamSpikeLen * 0.25, 2.5 * ratio);
    ctx.lineTo(beamSpikeLen * 0.28, 9 * ratio + 1.5);
    ctx.lineTo(-4, 2.5 * ratio);
    ctx.closePath();
    ctx.fill();

    // Crosshair laser lens glint
    const glintSpread = (14 + progress * 8) * ratio;
    ctx.strokeStyle = 'rgba(255, 70, 95, 0.85)';
    ctx.lineWidth = 2 * ratio + 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -glintSpread);
    ctx.lineTo(0, glintSpread);
    ctx.stroke();

    // Bright laser muzzle core
    ctx.beginPath();
    ctx.arc(2, 0, 6.2 * ratio + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1e3c';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(2, 0, 3.4 * ratio + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: ReadonlyArray<Projectile>,
): void {
  for (const shot of projectiles) {
    const r = Math.max(4, shot.radius);
    const beamLen = Math.max(44, r * 9.5);
    const beamHalfW = r * 0.72;

    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.vy, shot.vx));

    // Outer laser glow halo
    const outerGrad = ctx.createLinearGradient(-beamLen * 1.15, 0, r * 1.4, 0);
    outerGrad.addColorStop(0, 'rgba(255, 24, 56, 0)');
    outerGrad.addColorStop(0.35, 'rgba(255, 24, 56, 0.22)');
    outerGrad.addColorStop(0.85, 'rgba(255, 36, 72, 0.42)');
    outerGrad.addColorStop(1, 'rgba(255, 36, 72, 0)');

    ctx.strokeStyle = outerGrad;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 3.1;
    ctx.beginPath();
    ctx.moveTo(-beamLen, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Main saturated crimson laser beam body
    const bodyGrad = ctx.createLinearGradient(-beamLen, 0, r * 0.8, 0);
    bodyGrad.addColorStop(0, 'rgba(255, 20, 56, 0)');
    bodyGrad.addColorStop(0.25, 'rgba(255, 30, 60, 0.88)');
    bodyGrad.addColorStop(0.85, '#ff1744');
    bodyGrad.addColorStop(1, '#ff526f');

    ctx.strokeStyle = bodyGrad;
    ctx.lineWidth = beamHalfW * 2;
    ctx.beginPath();
    ctx.moveTo(-beamLen, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Razor-sharp white-hot inner laser core
    const coreGrad = ctx.createLinearGradient(-beamLen * 0.82, 0, r * 0.5, 0);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coreGrad.addColorStop(0.35, 'rgba(255, 235, 240, 0.85)');
    coreGrad.addColorStop(1, '#ffffff');

    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = Math.max(2, beamHalfW * 0.82);
    ctx.beginPath();
    ctx.moveTo(-beamLen * 0.82, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Glowing laser tip head
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1744';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: ReadonlyArray<Particle>,
): void {
  for (const part of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, part.life / 1.3);
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation);
    ctx.fillStyle = part.color ?? '#111111';
    ctx.fillRect(-part.size / 2, -part.size / 2, part.size, part.size * 1.8);
    ctx.restore();
  }
}

export function drawFloatingScores(
  ctx: CanvasRenderingContext2D,
  pops: ReadonlyArray<FloatingScore>,
): void {
  for (const pop of pops) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pop.life / pop.maxLife);
    ctx.font = '800 22px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111111';
    ctx.fillText('+1', pop.x, pop.y);
    ctx.restore();
  }
}
