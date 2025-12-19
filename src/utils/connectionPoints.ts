import { STUD_SPACING, type BrickType } from '../types/brick';
import { calculateStudPositions } from './studPositions';

export type ConnectionPlane = 'bottom' | 'top';

export type ConnectionPoint = {
  plane: ConnectionPlane;
  local: [number, number]; // local XZ offset from brick center (rotation 0)
};

const bottomPointsCache = new Map<string, [number, number][]>();
const topPointsCache = new Map<string, [number, number][]>();
const cycleCache = new Map<string, ConnectionPoint[]>();

const getBottomConnectionPointsUncached = (brickType: BrickType): [number, number][] => {
  const positions: [number, number][] = [];
  const studsX = brickType.studsX;
  const studsZ = brickType.studsZ;
  const depth = studsZ * STUD_SPACING;

  const isSlope = brickType.variant === 'slope';
  const isCornerSlope = brickType.variant === 'corner-slope';
  const isInverted = brickType.isInverted ?? false;

  if (isCornerSlope && isInverted) {
    const startX = -(studsX - 1) / 2 * STUD_SPACING;
    const startZ = -(studsZ - 1) / 2 * STUD_SPACING;
    positions.push([startX, startZ]);
    return positions;
  }

  if (isSlope && isInverted) {
    const startX = -(studsX - 1) / 2 * STUD_SPACING;
    const z = -depth / 2 + STUD_SPACING / 2;
    for (let x = 0; x < studsX; x++) {
      positions.push([startX + x * STUD_SPACING, z]);
    }
    return positions;
  }

  // Default: full footprint can connect from below (bricks/plates/tiles/regular slopes/corner slopes)
  const startX = -(studsX - 1) / 2 * STUD_SPACING;
  const startZ = -(studsZ - 1) / 2 * STUD_SPACING;

  for (let x = 0; x < studsX; x++) {
    for (let z = 0; z < studsZ; z++) {
      positions.push([startX + x * STUD_SPACING, startZ + z * STUD_SPACING]);
    }
  }

  return positions;
};

export const getBottomConnectionPoints = (brickType: BrickType): [number, number][] => {
  const key = brickType.id;
  const cached = bottomPointsCache.get(key);
  if (cached) return cached;
  const created = getBottomConnectionPointsUncached(brickType);
  bottomPointsCache.set(key, created);
  return created;
};

export const getTopStudPoints = (brickType: BrickType): [number, number][] => {
  const key = brickType.id;
  const cached = topPointsCache.get(key);
  if (cached) return cached;

  const depth = brickType.studsZ * STUD_SPACING;
  const created = calculateStudPositions(
    brickType.studsX,
    brickType.studsZ,
    depth,
    brickType.variant,
    brickType.isInverted ?? false
  );
  topPointsCache.set(key, created);
  return created;
};

export const getConnectionPointCycle = (brickType: BrickType): ConnectionPoint[] => {
  const key = brickType.id;
  const cached = cycleCache.get(key);
  if (cached) return cached;

  const bottom = getBottomConnectionPoints(brickType).map((local) => ({ plane: 'bottom' as const, local }));
  const top = getTopStudPoints(brickType).map((local) => ({ plane: 'top' as const, local }));
  const created = [...bottom, ...top];

  cycleCache.set(key, created);
  return created;
};

export const getSelectedConnectionPoint = (
  brickType: BrickType,
  connectionPointIndex: number
): ConnectionPoint | null => {
  const cycle = getConnectionPointCycle(brickType);
  if (cycle.length === 0) return null;
  const idx = ((connectionPointIndex % cycle.length) + cycle.length) % cycle.length;
  return cycle[idx] ?? null;
};

export const findNearestLocalPoint = (
  localX: number,
  localZ: number,
  points: readonly [number, number][]
): [number, number] | null => {
  if (points.length === 0) return null;

  let best = points[0];
  let bestDistSq = Infinity;

  for (const p of points) {
    const dx = localX - p[0];
    const dz = localZ - p[1];
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = p;
    }
  }

  return best;
};

