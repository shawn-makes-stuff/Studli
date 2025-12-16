import { STUD_SPACING, getBrickType, getBrickHeight, PlacedBrick, hasStuds } from '../types/brick';

/**
 * Gets the effective dimensions considering rotation (for collision/snapping)
 */
export const getRotatedDimensions = (studsX: number, studsZ: number, rotation: number): [number, number] => {
  if (rotation % 2 === 0) {
    return [studsX, studsZ];
  }
  return [studsZ, studsX];
};

/**
 * Snaps world position to grid, accounting for brick size.
 */
export const snapToGrid = (
  worldX: number,
  worldZ: number,
  studsX: number,
  studsZ: number,
  rotation: number
): [number, number] => {
  const [effectiveX, effectiveZ] = getRotatedDimensions(studsX, studsZ, rotation);

  const offsetX = (effectiveX % 2 === 1) ? 0.5 : 0;
  const offsetZ = (effectiveZ % 2 === 1) ? 0.5 : 0;

  const snappedX = Math.round(worldX / STUD_SPACING - offsetX) + offsetX;
  const snappedZ = Math.round(worldZ / STUD_SPACING - offsetZ) + offsetZ;

  return [snappedX * STUD_SPACING, snappedZ * STUD_SPACING];
};

/**
 * Gets the footprint (grid cells) occupied by a brick in world coordinates
 */
export const getBrickFootprint = (
  centerX: number,
  centerZ: number,
  studsX: number,
  studsZ: number,
  rotation: number
): { minX: number; maxX: number; minZ: number; maxZ: number } => {
  const [effectiveX, effectiveZ] = getRotatedDimensions(studsX, studsZ, rotation);
  const halfX = (effectiveX * STUD_SPACING) / 2;
  const halfZ = (effectiveZ * STUD_SPACING) / 2;

  return {
    minX: centerX - halfX,
    maxX: centerX + halfX,
    minZ: centerZ - halfZ,
    maxZ: centerZ + halfZ
  };
};

/**
 * Checks if two footprints overlap (share any interior space)
 */
const footprintsOverlap = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean => {
  const epsilon = 0.001;
  const overlapX = a.minX < b.maxX - epsilon && a.maxX > b.minX + epsilon;
  const overlapZ = a.minZ < b.maxZ - epsilon && a.maxZ > b.minZ + epsilon;
  return overlapX && overlapZ;
};

interface BrickBounds {
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  bottomY: number;
  topY: number;
  hasStuds: boolean;
}

/**
 * Gets all bricks that overlap with the given footprint
 */
const getOverlappingBricks = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  placedBricks: PlacedBrick[]
): BrickBounds[] => {
  const newBrickFootprint = getBrickFootprint(gridX, gridZ, studsX, studsZ, rotation);
  const result: BrickBounds[] = [];

  for (const brick of placedBricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const brickFootprint = getBrickFootprint(
      brick.position[0],
      brick.position[2],
      brickType.studsX,
      brickType.studsZ,
      brick.rotation
    );

    if (footprintsOverlap(newBrickFootprint, brickFootprint)) {
      const brickHeight = getBrickHeight(brickType.variant);
      result.push({
        footprint: brickFootprint,
        bottomY: brick.position[1] - brickHeight / 2,
        topY: brick.position[1] + brickHeight / 2,
        hasStuds: hasStuds(brickType.variant)
      });
    }
  }

  return result.sort((a, b) => a.bottomY - b.bottomY);
};

/**
 * Checks if a brick at given position would collide with existing bricks
 */
const wouldCollide = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  bottomY: number,
  topY: number,
  placedBricks: PlacedBrick[]
): boolean => {
  const newBrickFootprint = getBrickFootprint(gridX, gridZ, studsX, studsZ, rotation);
  const epsilon = 0.001;

  for (const brick of placedBricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const brickFootprint = getBrickFootprint(
      brick.position[0],
      brick.position[2],
      brickType.studsX,
      brickType.studsZ,
      brick.rotation
    );

    if (!footprintsOverlap(newBrickFootprint, brickFootprint)) continue;

    const brickHeight = getBrickHeight(brickType.variant);
    const brickBottomY = brick.position[1] - brickHeight / 2;
    const brickTopY = brick.position[1] + brickHeight / 2;

    // Check Y overlap - this applies to ALL bricks including tiles
    const overlapY = bottomY < brickTopY - epsilon && topY > brickBottomY + epsilon;
    if (overlapY) return true;
  }

  return false;
};

/**
 * Checks if a brick at given position would be connected.
 * Connection requires touching ground OR a brick with studs from below OR any brick from above.
 * Tiles don't provide connection from below (no studs), but you can connect if
 * another studded brick at the same level is also being touched.
 */
const isConnected = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  bottomY: number,
  topY: number,
  placedBricks: PlacedBrick[]
): boolean => {
  const epsilon = 0.01;

  // Ground connection
  if (bottomY < epsilon) return true;

  const newBrickFootprint = getBrickFootprint(gridX, gridZ, studsX, studsZ, rotation);

  for (const brick of placedBricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const brickFootprint = getBrickFootprint(
      brick.position[0],
      brick.position[2],
      brickType.studsX,
      brickType.studsZ,
      brick.rotation
    );

    if (!footprintsOverlap(newBrickFootprint, brickFootprint)) continue;

    const brickHeight = getBrickHeight(brickType.variant);
    const brickBottomY = brick.position[1] - brickHeight / 2;
    const brickTopY = brick.position[1] + brickHeight / 2;

    // Connected from below - only valid if the brick has studs
    if (Math.abs(bottomY - brickTopY) < epsilon && hasStuds(brickType.variant)) {
      return true;
    }

    // Connected from above (our top touches their bottom)
    if (Math.abs(topY - brickBottomY) < epsilon) {
      return true;
    }
  }

  return false;
};

/**
 * Finds all valid Y positions where a brick can be placed.
 * Returns empty array if no valid positions exist.
 */
export const findValidLayers = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  newBrickHeight: number,
  placedBricks: PlacedBrick[]
): number[] => {
  const overlappingBricks = getOverlappingBricks(gridX, gridZ, studsX, studsZ, rotation, placedBricks);

  const candidates = new Set<number>();

  // Ground level
  candidates.add(0);

  // On top of each brick - include ALL bricks (even tiles) as position candidates
  // The connection check will filter out positions that only touch tiles
  for (const brick of overlappingBricks) {
    candidates.add(brick.topY);
  }

  // Hanging below each brick
  for (const brick of overlappingBricks) {
    const hangingY = brick.bottomY - newBrickHeight;
    if (hangingY >= 0) {
      candidates.add(hangingY);
    }
  }

  // Filter to valid positions
  const validPositions: number[] = [];

  for (const bottomY of candidates) {
    const topY = bottomY + newBrickHeight;

    // Must not collide with any brick (including tiles)
    if (wouldCollide(gridX, gridZ, studsX, studsZ, rotation, bottomY, topY, placedBricks)) {
      continue;
    }

    // Must be connected to ground or a studded brick
    if (!isConnected(gridX, gridZ, studsX, studsZ, rotation, bottomY, topY, placedBricks)) {
      continue;
    }

    validPositions.push(bottomY);
  }

  validPositions.sort((a, b) => a - b);

  return validPositions;
};

/**
 * Calculates the default (topmost) stack height for collision avoidance.
 * Includes ALL bricks including tiles.
 */
export const calculateStackHeight = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  placedBricks: PlacedBrick[]
): number => {
  const newBrickFootprint = getBrickFootprint(gridX, gridZ, studsX, studsZ, rotation);

  let maxHeight = 0;

  for (const brick of placedBricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const brickFootprint = getBrickFootprint(
      brick.position[0],
      brick.position[2],
      brickType.studsX,
      brickType.studsZ,
      brick.rotation
    );

    if (footprintsOverlap(newBrickFootprint, brickFootprint)) {
      const brickHeight = getBrickHeight(brickType.variant);
      const topOfBrick = brick.position[1] + brickHeight / 2;
      maxHeight = Math.max(maxHeight, topOfBrick);
    }
  }

  return maxHeight;
};

/**
 * Result of layer position calculation
 */
export interface LayerPositionResult {
  bottomY: number;
  isValid: boolean;
}

/**
 * Gets the valid Y position for a brick with layer offset.
 * Returns both the position and whether it's a valid placement.
 */
export const getLayerPosition = (
  gridX: number,
  gridZ: number,
  studsX: number,
  studsZ: number,
  rotation: number,
  newBrickHeight: number,
  placedBricks: PlacedBrick[],
  layerOffset: number
): LayerPositionResult => {
  const validLayers = findValidLayers(
    gridX, gridZ, studsX, studsZ, rotation, newBrickHeight, placedBricks
  );

  if (validLayers.length === 0) {
    // No valid position - return a visual position above everything but mark as invalid
    const stackHeight = calculateStackHeight(gridX, gridZ, studsX, studsZ, rotation, placedBricks);
    return { bottomY: stackHeight, isValid: false };
  }

  const index = Math.max(0, Math.min(validLayers.length - 1, validLayers.length - 1 + layerOffset));
  return { bottomY: validLayers[index], isValid: true };
};
