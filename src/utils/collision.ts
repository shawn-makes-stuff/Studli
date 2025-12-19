/**
 * Collision detection utilities
 * Centralizes all brick collision and overlap logic
 */

import * as THREE from 'three';
import { BrickOrientation, PlacedBrick, getBrickType, getBrickHeight, hasStuds, STUD_HEIGHT, STUD_RADIUS, STUD_SPACING, SIDE_STUD_NEG_X, SIDE_STUD_NEG_Z, SIDE_STUD_POS_X, SIDE_STUD_POS_Z } from '../types/brick';
import { getBrickFootprint } from './snapToGrid';
import { boxesOverlap, rangesOverlap } from './math';
import { getBrickQuaternion, getUpVector } from './brickTransform';
import { calculateStudPositions } from './studPositions';

export interface BrickBounds {
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  bottomY: number;
  topY: number;
  brick: PlacedBrick;
}

export type BrickAabb = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export const getBrickAabb = (brick: PlacedBrick): BrickAabb | null => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return null;

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;

  const halfLocalX = width / 2;
  const halfLocalY = height / 2;
  const halfLocalZ = depth / 2;

  const q = getBrickQuaternion(brick.orientation, brick.rotation);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const e = m.elements;

  const r11 = Math.abs(e[0]);
  const r12 = Math.abs(e[4]);
  const r13 = Math.abs(e[8]);
  const r21 = Math.abs(e[1]);
  const r22 = Math.abs(e[5]);
  const r23 = Math.abs(e[9]);
  const r31 = Math.abs(e[2]);
  const r32 = Math.abs(e[6]);
  const r33 = Math.abs(e[10]);

  const halfWorldX = r11 * halfLocalX + r12 * halfLocalY + r13 * halfLocalZ;
  const halfWorldY = r21 * halfLocalX + r22 * halfLocalY + r23 * halfLocalZ;
  const halfWorldZ = r31 * halfLocalX + r32 * halfLocalY + r33 * halfLocalZ;

  const [x, y, z] = brick.position;

  return {
    minX: x - halfWorldX,
    maxX: x + halfWorldX,
    minY: y - halfWorldY,
    maxY: y + halfWorldY,
    minZ: z - halfWorldZ,
    maxZ: z + halfWorldZ,
  };
};

/**
 * Get bounds for a brick (footprint + Y range)
 */
export const getBrickBounds = (brick: PlacedBrick): BrickBounds | null => {
  const aabb = getBrickAabb(brick);
  if (!aabb) return null;

  const footprint = {
    minX: aabb.minX,
    maxX: aabb.maxX,
    minZ: aabb.minZ,
    maxZ: aabb.maxZ,
  };

  return {
    footprint,
    bottomY: aabb.minY,
    topY: aabb.maxY,
    brick
  };
};

export const aabbsOverlap = (a: BrickAabb, b: BrickAabb) => {
  const epsilon = 0.001;
  const overlapX = a.minX < b.maxX - epsilon && a.maxX > b.minX + epsilon;
  const overlapY = a.minY < b.maxY - epsilon && a.maxY > b.minY + epsilon;
  const overlapZ = a.minZ < b.maxZ - epsilon && a.maxZ > b.minZ + epsilon;
  return overlapX && overlapY && overlapZ;
};

export const checkAabbCollision = (candidate: BrickAabb, existingBricks: PlacedBrick[], excludeIds: Set<string> = new Set()) => {
  for (const b of existingBricks) {
    if (excludeIds.has(b.id)) continue;
    const aabb = getBrickAabb(b);
    if (!aabb) continue;
    if (aabbsOverlap(candidate, aabb)) return true;
  }
  return false;
};

const getAbsRotation = (q: THREE.Quaternion) => {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const e = m.elements;
  return {
    r11: Math.abs(e[0]), r12: Math.abs(e[4]), r13: Math.abs(e[8]),
    r21: Math.abs(e[1]), r22: Math.abs(e[5]), r23: Math.abs(e[9]),
    r31: Math.abs(e[2]), r32: Math.abs(e[6]), r33: Math.abs(e[10]),
  };
};

const getOrientedBoxAabb = (brick: PlacedBrick, localCenter: THREE.Vector3, halfLocal: THREE.Vector3): BrickAabb | null => {
  const q = getBrickQuaternion(brick.orientation, brick.rotation);
  const absR = getAbsRotation(q);

  const worldCenter = localCenter.clone().applyQuaternion(q).add(new THREE.Vector3(brick.position[0], brick.position[1], brick.position[2]));

  const halfWorldX = absR.r11 * halfLocal.x + absR.r12 * halfLocal.y + absR.r13 * halfLocal.z;
  const halfWorldY = absR.r21 * halfLocal.x + absR.r22 * halfLocal.y + absR.r23 * halfLocal.z;
  const halfWorldZ = absR.r31 * halfLocal.x + absR.r32 * halfLocal.y + absR.r33 * halfLocal.z;

  return {
    minX: worldCenter.x - halfWorldX,
    maxX: worldCenter.x + halfWorldX,
    minY: worldCenter.y - halfWorldY,
    maxY: worldCenter.y + halfWorldY,
    minZ: worldCenter.z - halfWorldZ,
    maxZ: worldCenter.z + halfWorldZ,
  };
};

export const getSideStudAabbs = (brick: PlacedBrick): BrickAabb[] => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return [];

  const mask = brickType.sideStudMask ?? 0;
  if (mask === 0) return [];

  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;

  const halfAlong = STUD_HEIGHT / 2;
  const halfRad = STUD_RADIUS;

  const studs: Array<{ center: THREE.Vector3; half: THREE.Vector3 }> = [];

  if (mask & SIDE_STUD_POS_X) studs.push({ center: new THREE.Vector3(width / 2 + halfAlong, 0, 0), half: new THREE.Vector3(halfAlong, halfRad, halfRad) });
  if (mask & SIDE_STUD_NEG_X) studs.push({ center: new THREE.Vector3(-width / 2 - halfAlong, 0, 0), half: new THREE.Vector3(halfAlong, halfRad, halfRad) });
  if (mask & SIDE_STUD_POS_Z) studs.push({ center: new THREE.Vector3(0, 0, depth / 2 + halfAlong), half: new THREE.Vector3(halfRad, halfRad, halfAlong) });
  if (mask & SIDE_STUD_NEG_Z) studs.push({ center: new THREE.Vector3(0, 0, -depth / 2 - halfAlong), half: new THREE.Vector3(halfRad, halfRad, halfAlong) });

  const aabbs: BrickAabb[] = [];
  for (const s of studs) {
    const aabb = getOrientedBoxAabb(brick, s.center, s.half);
    if (aabb) aabbs.push(aabb);
  }
  return aabbs;
};

export const checkSideStudCollision = (brick: PlacedBrick, existingBricks: PlacedBrick[], excludeIds: Set<string> = new Set()) => {
  const studAabbs = getSideStudAabbs(brick);
  if (studAabbs.length === 0) return false;

  for (const b of existingBricks) {
    if (excludeIds.has(b.id)) continue;
    const aabb = getBrickAabb(b);
    if (!aabb) continue;
    for (const s of studAabbs) {
      if (aabbsOverlap(s, aabb)) return true;
    }
  }

  return false;
};

type StudAabb = BrickAabb & { direction: THREE.Vector3 };

const getTopStudAabbsWithDirection = (brick: PlacedBrick): StudAabb[] => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return [];
  if (!hasStuds(brickType.variant)) return [];

  const height = getBrickHeight(brickType.variant);
  const depth = brickType.studsZ * STUD_SPACING;

  const localStuds = calculateStudPositions(
    brickType.studsX,
    brickType.studsZ,
    depth,
    brickType.variant,
    brickType.isInverted ?? false,
  );
  if (localStuds.length === 0) return [];

  const q = getBrickQuaternion(brick.orientation, brick.rotation);
  const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
  const half = new THREE.Vector3(STUD_RADIUS, STUD_HEIGHT / 2, STUD_RADIUS);

  const studs: StudAabb[] = [];
  for (const [x, z] of localStuds) {
    const center = new THREE.Vector3(x, height / 2 + STUD_HEIGHT / 2, z);
    const aabb = getOrientedBoxAabb(brick, center, half);
    if (aabb) studs.push({ ...aabb, direction: dir });
  }
  return studs;
};

const getSideStudAabbsWithDirection = (brick: PlacedBrick): StudAabb[] => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return [];

  const mask = brickType.sideStudMask ?? 0;
  if (mask === 0) return [];

  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;

  const q = getBrickQuaternion(brick.orientation, brick.rotation);
  const halfAlong = STUD_HEIGHT / 2;
  const halfRad = STUD_RADIUS;

  const studs: Array<{ center: THREE.Vector3; half: THREE.Vector3; dir: THREE.Vector3 }> = [];

  if (mask & SIDE_STUD_POS_X) studs.push({ center: new THREE.Vector3(width / 2 + halfAlong, 0, 0), half: new THREE.Vector3(halfAlong, halfRad, halfRad), dir: new THREE.Vector3(1, 0, 0) });
  if (mask & SIDE_STUD_NEG_X) studs.push({ center: new THREE.Vector3(-width / 2 - halfAlong, 0, 0), half: new THREE.Vector3(halfAlong, halfRad, halfRad), dir: new THREE.Vector3(-1, 0, 0) });
  if (mask & SIDE_STUD_POS_Z) studs.push({ center: new THREE.Vector3(0, 0, depth / 2 + halfAlong), half: new THREE.Vector3(halfRad, halfRad, halfAlong), dir: new THREE.Vector3(0, 0, 1) });
  if (mask & SIDE_STUD_NEG_Z) studs.push({ center: new THREE.Vector3(0, 0, -depth / 2 - halfAlong), half: new THREE.Vector3(halfRad, halfRad, halfAlong), dir: new THREE.Vector3(0, 0, -1) });

  const aabbs: StudAabb[] = [];
  for (const s of studs) {
    const aabb = getOrientedBoxAabb(brick, s.center, s.half);
    if (!aabb) continue;
    const worldDir = s.dir.clone().applyQuaternion(q).normalize();
    aabbs.push({ ...aabb, direction: worldDir });
  }
  return aabbs;
};

export const checkCollisionWithStuds = (
  candidate: BrickAabb,
  candidateOrientation: BrickOrientation | undefined,
  existingBricks: PlacedBrick[],
  excludeIds: Set<string> = new Set()
) => {
  const up = getUpVector(candidateOrientation).normalize();
  const ignoreDotThreshold = 0.85;

  for (const b of existingBricks) {
    if (excludeIds.has(b.id)) continue;

    // Only consider studs that could physically intersect the candidate's body.
    // Studs aligned with the candidate's up vector are treated as "connectable" and ignored
    // (we don't model underside cavities, so a true collision check would block normal stacking/SNOT connections).
    const studs: StudAabb[] = [
      ...getTopStudAabbsWithDirection(b),
      ...getSideStudAabbsWithDirection(b),
    ];

    for (const s of studs) {
      if (s.direction.dot(up) >= ignoreDotThreshold) continue;
      if (aabbsOverlap(candidate, s)) return true;
    }
  }

  return false;
};

export const checkCollisionWithSideStuds = (candidate: BrickAabb, existingBricks: PlacedBrick[], excludeIds: Set<string> = new Set()) => {
  for (const b of existingBricks) {
    if (excludeIds.has(b.id)) continue;
    const studs = getSideStudAabbs(b);
    if (studs.length === 0) continue;

    for (const s of studs) {
      if (aabbsOverlap(candidate, s)) return true;
    }
  }
  return false;
};

/**
 * Check if a brick at given position collides with existing bricks
 */
export const checkBrickCollision = (
  brickX: number,
  brickY: number,
  brickZ: number,
  brickTypeId: string,
  brickRotation: number,
  existingBricks: PlacedBrick[],
  excludeIds: Set<string> = new Set()
): boolean => {
  const brickType = getBrickType(brickTypeId);
  if (!brickType) return true;

  const brickHeight = getBrickHeight(brickType.variant);
  const brickFootprint = getBrickFootprint(brickX, brickZ, brickType.studsX, brickType.studsZ, brickRotation);
  const brickBottomY = brickY - brickHeight / 2;
  const brickTopY = brickY + brickHeight / 2;

  // Check ground collision
  if (brickBottomY < -0.01) return true;

  for (const existing of existingBricks) {
    if (excludeIds.has(existing.id)) continue;

    const bounds = getBrickBounds(existing);
    if (!bounds) continue;

    // Check XZ overlap
    if (!boxesOverlap(brickFootprint, bounds.footprint)) continue;

    // Check Y overlap
    if (rangesOverlap(brickBottomY, brickTopY, bounds.bottomY, bounds.topY)) {
      return true;
    }
  }

  return false;
};

/**
 * Find all bricks that overlap with a given footprint in XZ
 */
export const findOverlappingBricks = (
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number },
  existingBricks: PlacedBrick[],
  excludeIds: Set<string> = new Set()
): BrickBounds[] => {
  const result: BrickBounds[] = [];

  for (const brick of existingBricks) {
    if (excludeIds.has(brick.id)) continue;

    const bounds = getBrickBounds(brick);
    if (!bounds) continue;

    if (boxesOverlap(footprint, bounds.footprint)) {
      result.push(bounds);
    }
  }

  return result.sort((a, b) => a.bottomY - b.bottomY);
};

/**
 * Get the maximum stack height at a given footprint
 */
export const getMaxStackHeight = (
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number },
  existingBricks: PlacedBrick[],
  excludeIds: Set<string> = new Set()
): number => {
  const overlapping = findOverlappingBricks(footprint, existingBricks, excludeIds);
  return overlapping.reduce((max, b) => Math.max(max, b.topY), 0);
};
