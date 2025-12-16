/**
 * Collision detection utilities
 * Centralizes all brick collision and overlap logic
 */

import { PlacedBrick, getBrickType, getBrickHeight } from '../types/brick';
import { getBrickFootprint } from './snapToGrid';
import { boxesOverlap, rangesOverlap } from './math';

export interface BrickBounds {
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  bottomY: number;
  topY: number;
  brick: PlacedBrick;
}

/**
 * Get bounds for a brick (footprint + Y range)
 */
export const getBrickBounds = (brick: PlacedBrick): BrickBounds | null => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return null;

  const height = getBrickHeight(brickType.variant);
  const footprint = getBrickFootprint(
    brick.position[0],
    brick.position[2],
    brickType.studsX,
    brickType.studsZ,
    brick.rotation
  );

  return {
    footprint,
    bottomY: brick.position[1] - height / 2,
    topY: brick.position[1] + height / 2,
    brick
  };
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
