import { STUD_SPACING, type BrickVariant } from '../types/brick';

/**
 * Calculate stud positions for any brick type (local XZ offsets from the brick center).
 */
export const calculateStudPositions = (
  studsX: number,
  studsZ: number,
  depth: number,
  variant: BrickVariant,
  isInverted: boolean = false
): [number, number][] => {
  const positions: [number, number][] = [];

  if (variant === 'tile') {
    // Tiles have no studs
    return positions;
  }

  if (variant === 'corner-slope') {
    if (isInverted) {
      // Inverted corner slopes have studs across the entire top surface
      const startX = -(studsX - 1) / 2 * STUD_SPACING;
      const startZ = -(studsZ - 1) / 2 * STUD_SPACING;

      for (let x = 0; x < studsX; x++) {
        for (let z = 0; z < studsZ; z++) {
          positions.push([startX + x * STUD_SPACING, startZ + z * STUD_SPACING]);
        }
      }
    } else {
      // Regular corner slopes have a single stud at the corner (back-left, which is -X, -Z)
      const studX = -(studsX - 1) / 2 * STUD_SPACING;
      const studZ = -(studsZ - 1) / 2 * STUD_SPACING;
      positions.push([studX, studZ]);
    }
    return positions;
  }

  if (variant === 'slope') {
    if (isInverted) {
      // Inverted slopes have studs across the entire top surface
      const startX = -(studsX - 1) / 2 * STUD_SPACING;
      const startZ = -(studsZ - 1) / 2 * STUD_SPACING;

      for (let x = 0; x < studsX; x++) {
        for (let z = 0; z < studsZ; z++) {
          positions.push([startX + x * STUD_SPACING, startZ + z * STUD_SPACING]);
        }
      }
    } else {
      // Regular slopes only have studs on the back row
      const startX = -(studsX - 1) / 2 * STUD_SPACING;
      const studZ = -depth / 2 + STUD_SPACING / 2;

      for (let x = 0; x < studsX; x++) {
        positions.push([startX + x * STUD_SPACING, studZ]);
      }
    }
  } else {
    // Regular bricks and plates have studs across the entire top
    const startX = -(studsX - 1) / 2 * STUD_SPACING;
    const startZ = -(studsZ - 1) / 2 * STUD_SPACING;

    for (let x = 0; x < studsX; x++) {
      for (let z = 0; z < studsZ; z++) {
        positions.push([startX + x * STUD_SPACING, startZ + z * STUD_SPACING]);
      }
    }
  }

  return positions;
};
