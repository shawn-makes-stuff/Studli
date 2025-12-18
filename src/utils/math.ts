/**
 * Shared math utilities
 */

/**
 * Rotate a point around origin by 90 degree increments
 */
export const rotatePoint = (x: number, z: number, rotation: number): [number, number] => {
  const r = ((rotation % 4) + 4) % 4; // Normalize to 0-3
  switch (r) {
    case 0: return [x, z];
    // Matches Three.js positive Y rotation (90° steps): (x, z) -> (z, -x)
    case 1: return [z, -x];
    case 2: return [-x, -z];
    case 3: return [-z, x];
    default: return [x, z];
  }
};

/**
 * Clamp a number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Check if two axis-aligned bounding boxes overlap (with epsilon tolerance)
 */
export const boxesOverlap = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
  epsilon = 0.001
): boolean => {
  const overlapX = a.minX < b.maxX - epsilon && a.maxX > b.minX + epsilon;
  const overlapZ = a.minZ < b.maxZ - epsilon && a.maxZ > b.minZ + epsilon;
  return overlapX && overlapZ;
};

/**
 * Check if two Y ranges overlap (with epsilon tolerance)
 */
export const rangesOverlap = (
  aMin: number, aMax: number,
  bMin: number, bMax: number,
  epsilon = 0.001
): boolean => {
  return aMin < bMax - epsilon && aMax > bMin + epsilon;
};
