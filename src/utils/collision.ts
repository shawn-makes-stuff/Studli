/**
 * Collision detection utilities
 * Centralizes all brick collision and overlap logic
 */

import * as THREE from 'three';
import { PlacedBrick, getBrickType, getBrickHeight, STUD_SPACING } from '../types/brick';
import { getBrickFootprint } from './snapToGrid';
import { boxesOverlap, rangesOverlap } from './math';
import { getBrickQuaternion } from './brickTransform';

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
