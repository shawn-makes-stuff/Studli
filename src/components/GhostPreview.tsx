import { useMemo, useEffect } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { Brick } from './Brick';
import { PlacedBrick, getBrickType, getBrickHeight } from '../types/brick';
import { snapToGrid, getBrickFootprint } from '../utils/snapToGrid';
import { rotatePoint, boxesOverlap } from '../utils/math';

/**
 * Apply group rotation to source bricks around their center
 */
const applyGroupRotation = (
  sourceBricks: PlacedBrick[],
  groupRotation: number
): PlacedBrick[] => {
  if (groupRotation === 0 || sourceBricks.length === 0) return sourceBricks;

  // Calculate center
  let sumX = 0, sumZ = 0;
  for (const brick of sourceBricks) {
    sumX += brick.position[0];
    sumZ += brick.position[2];
  }
  const centerX = sumX / sourceBricks.length;
  const centerZ = sumZ / sourceBricks.length;

  return sourceBricks.map(brick => {
    const relX = brick.position[0] - centerX;
    const relZ = brick.position[2] - centerZ;
    const [newRelX, newRelZ] = rotatePoint(relX, relZ, groupRotation);

    return {
      ...brick,
      position: [
        centerX + newRelX,
        brick.position[1],
        centerZ + newRelZ
      ] as [number, number, number],
      rotation: (brick.rotation + groupRotation) % 4
    };
  });
};

/**
 * Check if a single brick collides with existing bricks
 */
const checkBrickCollision = (
  brickX: number, brickY: number, brickZ: number,
  brickTypeId: string, brickRotation: number,
  existingBricks: PlacedBrick[]
): boolean => {
  const brickType = getBrickType(brickTypeId);
  if (!brickType) return true;

  const brickHeight = getBrickHeight(brickType.variant);
  const brickFootprint = getBrickFootprint(brickX, brickZ, brickType.studsX, brickType.studsZ, brickRotation);
  const brickBottomY = brickY - brickHeight / 2;
  const brickTopY = brickY + brickHeight / 2;

  const epsilon = 0.001;

  for (const existing of existingBricks) {
    const existingType = getBrickType(existing.typeId);
    if (!existingType) continue;

    const existingHeight = getBrickHeight(existingType.variant);
    const existingFootprint = getBrickFootprint(
      existing.position[0], existing.position[2],
      existingType.studsX, existingType.studsZ, existing.rotation
    );
    const existingBottomY = existing.position[1] - existingHeight / 2;
    const existingTopY = existing.position[1] + existingHeight / 2;

    if (boxesOverlap(brickFootprint, existingFootprint, epsilon)) {
      const overlapY = brickBottomY < existingTopY - epsilon &&
                       brickTopY > existingBottomY + epsilon;
      if (overlapY) return true;
    }
  }

  return brickBottomY < -0.01;
};

/**
 * Find candidate Y positions for group placement
 */
const findCandidateYPositions = (
  bricks: PlacedBrick[],
  existingBricks: PlacedBrick[]
): number[] => {
  const candidates = new Set<number>([0]);

  for (const brick of bricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const brickFootprint = getBrickFootprint(
      brick.position[0], brick.position[2],
      brickType.studsX, brickType.studsZ, brick.rotation
    );

    for (const existing of existingBricks) {
      const existingType = getBrickType(existing.typeId);
      if (!existingType) continue;

      const existingFootprint = getBrickFootprint(
        existing.position[0], existing.position[2],
        existingType.studsX, existingType.studsZ, existing.rotation
      );

      if (boxesOverlap(brickFootprint, existingFootprint, 0.01)) {
        const existingHeight = getBrickHeight(existingType.variant);
        candidates.add(existing.position[1] + existingHeight / 2);
        candidates.add(existing.position[1] - existingHeight / 2 - getBrickHeight(brickType.variant));
      }
    }
  }

  return Array.from(candidates).filter(y => y >= 0).sort((a, b) => a - b);
};

/**
 * Check if group placement at baseY is valid
 */
const checkGroupPlacement = (
  bricks: PlacedBrick[],
  baseY: number,
  minOriginalY: number,
  existingBricks: PlacedBrick[]
): boolean => {
  const deltaY = baseY - minOriginalY;

  for (const brick of bricks) {
    const newY = brick.position[1] + deltaY;
    if (checkBrickCollision(brick.position[0], newY, brick.position[2], brick.typeId, brick.rotation, existingBricks)) {
      return false;
    }
  }
  return true;
};

/**
 * Calculate ghost positions for a group of bricks
 */
const calculateGhostPositions = (
  sourceBricks: PlacedBrick[],
  cursorPosition: [number, number],
  existingBricks: PlacedBrick[],
  excludeIds: Set<string>,
  groupRotation: number
): { ghosts: PlacedBrick[]; isValid: boolean } => {
  if (sourceBricks.length === 0) return { ghosts: [], isValid: false };

  const rotatedBricks = applyGroupRotation(sourceBricks, groupRotation);

  const anchorBrick = rotatedBricks[0];
  const anchorType = getBrickType(anchorBrick.typeId);
  if (!anchorType) return { ghosts: [], isValid: false };

  const [snappedX, snappedZ] = snapToGrid(
    cursorPosition[0], cursorPosition[1],
    anchorType.studsX, anchorType.studsZ,
    anchorBrick.rotation
  );

  const deltaX = snappedX - anchorBrick.position[0];
  const deltaZ = snappedZ - anchorBrick.position[2];

  const relevantBricks = existingBricks.filter(b => !excludeIds.has(b.id));

  // Apply XZ offset
  const offsetBricks = rotatedBricks.map(brick => ({
    ...brick,
    position: [
      brick.position[0] + deltaX,
      brick.position[1],
      brick.position[2] + deltaZ
    ] as [number, number, number]
  }));

  // Find min Y
  let minOriginalY = Infinity;
  for (const brick of offsetBricks) {
    const bt = getBrickType(brick.typeId);
    if (bt) {
      minOriginalY = Math.min(minOriginalY, brick.position[1] - getBrickHeight(bt.variant) / 2);
    }
  }

  // Find valid Y
  const candidateYs = findCandidateYPositions(offsetBricks, relevantBricks);

  let validBaseY: number | null = null;
  for (const baseY of candidateYs) {
    if (checkGroupPlacement(offsetBricks, baseY, minOriginalY, relevantBricks)) {
      validBaseY = baseY;
      break;
    }
  }

  // Fallback: stack on top
  if (validBaseY === null) {
    let maxStackHeight = 0;
    for (const brick of offsetBricks) {
      const brickType = getBrickType(brick.typeId);
      if (!brickType) continue;

      const brickFootprint = getBrickFootprint(
        brick.position[0], brick.position[2],
        brickType.studsX, brickType.studsZ, brick.rotation
      );

      for (const existing of relevantBricks) {
        const existingType = getBrickType(existing.typeId);
        if (!existingType) continue;

        const existingFootprint = getBrickFootprint(
          existing.position[0], existing.position[2],
          existingType.studsX, existingType.studsZ, existing.rotation
        );

        if (boxesOverlap(brickFootprint, existingFootprint, 0.01)) {
          const existingHeight = getBrickHeight(existingType.variant);
          maxStackHeight = Math.max(maxStackHeight, existing.position[1] + existingHeight / 2);
        }
      }
    }
    validBaseY = maxStackHeight;
  }

  const deltaY = validBaseY - minOriginalY;

  const ghosts: PlacedBrick[] = offsetBricks.map(brick => ({
    ...brick,
    id: `ghost-${brick.id}`,
    position: [
      brick.position[0],
      brick.position[1] + deltaY,
      brick.position[2]
    ] as [number, number, number]
  }));

  const isValid = checkGroupPlacement(offsetBricks, validBaseY, minOriginalY, relevantBricks);

  return { ghosts, isValid };
};

export const GhostPreview = () => {
  const mode = useBrickStore((state) => state.mode);
  const cursorPosition = useBrickStore((state) => state.cursorPosition);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const clipboard = useBrickStore((state) => state.clipboard);
  const groupRotation = useBrickStore((state) => state.groupRotation);
  const setGhostValid = useBrickStore((state) => state.setGhostValid);
  const setPendingGhostBricks = useBrickStore((state) => state.setPendingGhostBricks);

  const sourceBricks = useMemo(() => {
    if (mode === 'move') {
      return placedBricks.filter(b => selectedBrickIds.has(b.id));
    } else if (mode === 'paste') {
      return clipboard;
    }
    return [];
  }, [mode, placedBricks, selectedBrickIds, clipboard]);

  const ghostData = useMemo(() => {
    if (!cursorPosition || sourceBricks.length === 0) {
      return { ghosts: [] as PlacedBrick[], isValid: false };
    }

    const excludeIds = mode === 'move' ? selectedBrickIds : new Set<string>();
    return calculateGhostPositions(sourceBricks, cursorPosition, placedBricks, excludeIds, groupRotation);
  }, [cursorPosition, sourceBricks, placedBricks, selectedBrickIds, mode, groupRotation]);

  useEffect(() => {
    setGhostValid(ghostData.isValid);
    setPendingGhostBricks(ghostData.ghosts);
  }, [ghostData.isValid, ghostData.ghosts, setGhostValid, setPendingGhostBricks]);

  if (mode !== 'move' && mode !== 'paste') return null;
  if (!cursorPosition || ghostData.ghosts.length === 0) return null;

  return (
    <>
      {ghostData.ghosts.map(ghost => (
        <Brick
          key={ghost.id}
          brick={ghost}
          isGhost={true}
          ghostValid={ghostData.isValid}
        />
      ))}
    </>
  );
};
