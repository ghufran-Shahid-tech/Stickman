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
  color = '#111111',
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCloudShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fill: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(-26, 4, 16, 0, Math.PI * 2);
  ctx.arc(-6, -6, 22, 0, Math.PI * 2);
  ctx.arc(18, -2, 18, 0, Math.PI * 2);
  ctx.arc(34, 6, 13, 0, Math.PI * 2);
  ctx.roundRect(-36, 4, 78, 16, 8);
  ctx.fill();
  ctx.restore();
}

export function drawSkyAndCelestial(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ArenaLayout,
  elapsed: number,
  reducedMotion: boolean,
): void {
  const animTime = reducedMotion ? 0 : elapsed;
  const shortSide = Math.min(width, height);
  const celestialX = width * 0.78;
  const celestialY = Math.max(78, Math.min(height * 0.22, layout.enemyMinY + 8));

  // Deep night sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#060a14');
  skyGrad.addColorStop(0.55, '#0d172c');
  skyGrad.addColorStop(1, '#16233f');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle twinkling stars in upper sky
  ctx.save();
  for (let i = 0; i < 30; i += 1) {
    const seedX = Math.sin(i * 127.1 + 31.7) * 43758.5453;
    const seedY = Math.sin(i * 269.5 + 183.3) * 43758.5453;
    const fracX = seedX - Math.floor(seedX);
    const fracY = seedY - Math.floor(seedY);
    const sx = fracX * width;
    const sy = 18 + fracY * (height * 0.52);
    const twinkle = reducedMotion
      ? 0.65
      : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(animTime * (1.8 + (i % 5) * 0.45) + i * 2.1));
    const r = i % 6 === 0 ? 2.1 : 1.3;

    ctx.globalAlpha = twinkle * 0.85;
    ctx.fillStyle = i % 4 === 0 ? '#bae6fd' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    if (i % 9 === 0) {
      ctx.globalAlpha = twinkle * 0.55;
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy);
      ctx.lineTo(sx + 5, sy);
      ctx.moveTo(sx, sy - 5);
      ctx.lineTo(sx, sy + 5);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Animated professional Moon behind enemies
  const moonR = Math.max(25, Math.min(shortSide * 0.082, 46));
  const moonPulse = 1 + Math.sin(animTime * 1.15) * 0.055;

  ctx.save();
  ctx.translate(celestialX, celestialY);

  // Outer lunar aura
  const haloGrad = ctx.createRadialGradient(0, 0, moonR * 0.5, 0, 0, moonR * 3.1 * moonPulse);
  haloGrad.addColorStop(0, 'rgba(186, 230, 253, 0.34)');
  haloGrad.addColorStop(0.42, 'rgba(96, 165, 250, 0.14)');
  haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, moonR * 3.1 * moonPulse, 0, Math.PI * 2);
  ctx.fill();

  // Slowly rotating orbital shimmer arcs around the moon
  ctx.save();
  ctx.rotate(animTime * 0.14);
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, moonR * 1.38, -0.4, 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, moonR * 1.38, Math.PI - 0.3, Math.PI + 1.25);
  ctx.stroke();
  ctx.restore();

  // Luminous moon disc
  const moonGrad = ctx.createRadialGradient(-moonR * 0.28, -moonR * 0.28, moonR * 0.12, 0, 0, moonR);
  moonGrad.addColorStop(0, '#ffffff');
  moonGrad.addColorStop(0.6, '#e2e8f0');
  moonGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(0, 0, moonR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle moon craters
  ctx.fillStyle = 'rgba(100, 116, 139, 0.24)';
  ctx.beginPath();
  ctx.arc(-moonR * 0.28, -moonR * 0.12, moonR * 0.16, 0, Math.PI * 2);
  ctx.arc(moonR * 0.24, moonR * 0.22, moonR * 0.2, 0, Math.PI * 2);
  ctx.arc(moonR * 0.15, -moonR * 0.32, moonR * 0.1, 0, Math.PI * 2);
  ctx.arc(-moonR * 0.1, moonR * 0.34, moonR * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // Soft silver rim highlight
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, moonR - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // Drifting translucent night clouds
  const cloudConfigs = [
    { speed: 12, offset: 0.18, y: celestialY + 34, scale: 0.92 },
    { speed: 8, offset: 0.62, y: Math.max(58, celestialY - 22), scale: 0.72 },
    { speed: 15, offset: 0.88, y: celestialY + 58, scale: 0.78 },
  ];
  for (const c of cloudConfigs) {
    const span = width + 220;
    const cx = ((c.offset * span + animTime * c.speed) % span) - 110;
    drawCloudShape(ctx, cx, c.y, c.scale * Math.max(0.75, layout.bodyScale), 'rgba(148, 163, 184, 0.10)');
  }

  // Stadium grass surface land beneath the bed (floodlit night pitch)
  drawStadiumGrassLand(ctx, width, height, layout, animTime, reducedMotion);

  // Subtle moonlight sheen behind bed silhouette for crisp contrast
  const bedGlow = ctx.createRadialGradient(
    layout.bedX + layout.bedWidth * 0.5,
    layout.bedY + layout.bedHeight * 0.12,
    layout.bedWidth * 0.1,
    layout.bedX + layout.bedWidth * 0.5,
    layout.bedY + layout.bedHeight * 0.12,
    layout.bedWidth * 0.65,
  );
  bedGlow.addColorStop(0, 'rgba(148, 163, 184, 0.22)');
  bedGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = bedGlow;
  ctx.fillRect(0, layout.bedTop - 30, width, height - layout.bedTop + 30);
}

function drawStadiumGrassLand(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ArenaLayout,
  animTime: number,
  reducedMotion: boolean,
): void {
  const horizonY = Math.min(height - 36, layout.bedTop + layout.bedHeight * 0.68);
  const turfH = Math.max(1, height - horizonY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, width, turfH);
  ctx.clip();

  // Base floodlit stadium turf gradient
  const turfGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  turfGrad.addColorStop(0, '#14532d');
  turfGrad.addColorStop(0.45, '#0f4424');
  turfGrad.addColorStop(1, '#082c17');
  ctx.fillStyle = turfGrad;
  ctx.fillRect(0, horizonY, width, turfH);

  // Perspective mowed stadium grass stripes
  const stripeCount = 14;
  const topWidth = width * 1.1;
  const bottomWidth = width * 1.95;
  const topStartX = (width - topWidth) / 2;
  const bottomStartX = (width - bottomWidth) / 2;
  const topStep = topWidth / stripeCount;
  const bottomStep = bottomWidth / stripeCount;

  for (let i = 0; i < stripeCount; i += 2) {
    const tx0 = topStartX + i * topStep;
    const tx1 = tx0 + topStep;
    const bx0 = bottomStartX + i * bottomStep;
    const bx1 = bx0 + bottomStep;

    ctx.fillStyle = 'rgba(34, 197, 94, 0.11)';
    ctx.beginPath();
    ctx.moveTo(tx0, horizonY);
    ctx.lineTo(tx1, horizonY);
    ctx.lineTo(bx1, height);
    ctx.lineTo(bx0, height);
    ctx.closePath();
    ctx.fill();
  }

  // Stadium pitch white chalk touchlines in perspective
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
  ctx.lineWidth = Math.max(1.8, layout.bedWidth * 0.004);

  const backLineY = horizonY + turfH * 0.07;
  ctx.beginPath();
  ctx.moveTo(0, backLineY);
  ctx.lineTo(width, backLineY);
  ctx.stroke();

  const centerTopX = width * 0.5;
  const leftLaneTopX = width * 0.22;
  const rightLaneTopX = width * 0.78;
  ctx.lineWidth = Math.max(1.5, layout.bedWidth * 0.0032);
  ctx.beginPath();
  ctx.moveTo(centerTopX, backLineY);
  ctx.lineTo(centerTopX, height);
  ctx.moveTo(leftLaneTopX, backLineY);
  ctx.lineTo(width * 0.06, height);
  ctx.moveTo(rightLaneTopX, backLineY);
  ctx.lineTo(width * 0.94, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    width * 0.5,
    horizonY + turfH * 0.46,
    Math.min(width * 0.28, 220),
    Math.max(18, turfH * 0.26),
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Horizon grass border rim
  ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
  ctx.fillRect(0, horizonY, width, 2.5);

  // Swaying grass blade tufts across the stadium turf
  const tuftCount = Math.max(28, Math.round(width / 26));
  ctx.lineCap = 'round';
  for (let i = 0; i < tuftCount; i += 1) {
    const seedA = Math.sin(i * 91.7 + 14.3) * 43758.5453;
    const seedB = Math.sin(i * 213.1 + 77.9) * 43758.5453;
    const fracX = seedA - Math.floor(seedA);
    const fracY = seedB - Math.floor(seedB);

    const gx = fracX * width;
    const depth = i % 3 === 0 ? 0.02 + fracY * 0.12 : 0.14 + fracY * 0.8;
    const gy = horizonY + turfH * depth;
    const bladeScale = 0.65 + depth * 0.65;
    const bladeH = (5.5 + (i % 3) * 2.2) * bladeScale;
    const sway = reducedMotion ? 0 : Math.sin(animTime * 2.4 + i * 0.85) * 2.2 * bladeScale;

    ctx.strokeStyle =
      i % 2 === 0 ? 'rgba(34, 197, 94, 0.38)' : 'rgba(21, 128, 61, 0.52)';
    ctx.lineWidth = Math.max(1.2, 1.5 * bladeScale);

    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 2.5 * bladeScale + sway, gy - bladeH * 0.85);
    ctx.moveTo(gx + 1.5, gy);
    ctx.lineTo(gx + 0.8 + sway * 1.15, gy - bladeH);
    ctx.moveTo(gx + 3, gy);
    ctx.lineTo(gx + 4 * bladeScale + sway * 0.9, gy - bladeH * 0.78);
    ctx.stroke();
  }

  // Ground contact shadow beneath the bed legs on the stadium turf
  const shadowGrad = ctx.createRadialGradient(
    layout.bedX + layout.bedWidth * 0.51,
    layout.bedTop + layout.bedHeight * 0.86,
    layout.bedWidth * 0.08,
    layout.bedX + layout.bedWidth * 0.51,
    layout.bedTop + layout.bedHeight * 0.86,
    layout.bedWidth * 0.52,
  );
  shadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0.62)');
  shadowGrad.addColorStop(0.7, 'rgba(2, 6, 23, 0.25)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(
    layout.bedX + layout.bedWidth * 0.51,
    layout.bedTop + layout.bedHeight * 0.86,
    layout.bedWidth * 0.52,
    layout.bedHeight * 0.18,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();
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
  const outlineColor = '#ffffff';
  const bodyFillColor = '#737373';

  for (const part of parts) {
    const fade = Math.max(0, Math.min(1, part.life / 0.45));
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(part.x, part.y);

    if (part.kind === 'limb') {
      ctx.rotate(part.angle);
      const halfLen = (part.length ?? 20) * 0.5;
      const thick = part.thickness ?? 5;
      const dotR = Math.max(2.6, thick * 0.72);

      // Outer white outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = thick + 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-halfLen, 0);
      ctx.lineTo(halfLen, 0);
      ctx.stroke();

      if (part.dotSide) {
        drawDot(ctx, part.dotSide * halfLen, 0, dotR + 1.7, outlineColor);
      }

      // Inner grey body fill
      ctx.strokeStyle = bodyFillColor;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(-halfLen, 0);
      ctx.lineTo(halfLen, 0);
      ctx.stroke();

      if (part.dotSide) {
        drawDot(ctx, part.dotSide * halfLen, 0, dotR, bodyFillColor);
      }
    } else if (part.kind === 'cape') {
      ctx.rotate(part.angle);
      if (part.direction < 0) {
        ctx.scale(-1, 1);
      }
      ctx.scale(part.scale, part.scale);
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = outlineColor;
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
  const outlineColor = '#ffffff';
  const bodyFillColor = '#737373';
  const streakColor = 'rgba(226, 232, 240, 0.24)';

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
    ctx.strokeStyle = streakColor;
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

  // Flowing crimson Superman cape behind the body with crisp white outline
  ctx.save();
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = outlineColor;
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

  // Pass 1: Continuous white outer outline for the entire enemy body & joints
  const outlinePad = 3.6;
  drawLine(ctx, pose.armTrail, outlineColor, 4.8 + outlinePad);
  drawLine(ctx, pose.legTop, outlineColor, 5 + outlinePad);
  drawLine(ctx, pose.legBottom, outlineColor, 5 + outlinePad);
  drawLine(ctx, pose.torso, outlineColor, 5.5 + outlinePad);
  drawLine(ctx, pose.neck, outlineColor, 4.8 + outlinePad);
  drawLine(ctx, pose.armLead, outlineColor, 5 + outlinePad);
  for (const [jx, jy] of pose.jointEndpoints) {
    drawDot(ctx, jx, jy, 3.6 + outlinePad * 0.5, outlineColor);
  }

  // Pass 2: Seamless grey inner body color on top of white outline
  drawLine(ctx, pose.armTrail, bodyFillColor, 4.8);
  drawLine(ctx, pose.legTop, bodyFillColor, 5);
  drawLine(ctx, pose.legBottom, bodyFillColor, 5);
  drawLine(ctx, pose.torso, bodyFillColor, 5.5);
  drawLine(ctx, pose.neck, bodyFillColor, 4.8);
  drawLine(ctx, pose.armLead, bodyFillColor, 5);
  for (const [jx, jy] of pose.jointEndpoints) {
    drawDot(ctx, jx, jy, 3.6, bodyFillColor);
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
  const aimColor = '#f8fafc';
  const dragMarkerColor = 'rgba(248, 250, 252, 0.5)';

  ctx.save();

  // Origin dot at the aiming hand
  ctx.beginPath();
  ctx.arc(layout.muzzleX, layout.muzzleY, 4, 0, Math.PI * 2);
  ctx.fillStyle = aimColor;
  ctx.fill();

  // Extended dashed aim stick
  ctx.strokeStyle = aimColor;
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
    ctx.fillStyle = dragMarkerColor;
    ctx.fill();
  }

  // Aim sight ring at the end of the extended stick
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
  ctx.lineWidth = 2.25;
  ctx.strokeStyle = aimColor;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = aimColor;
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
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('+1', pop.x, pop.y);
    ctx.restore();
  }
}
