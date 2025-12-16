// Stud-based dimensions
export const STUD_SPACING = 1; // Distance between stud centers
export const STUD_RADIUS = 0.3;
export const STUD_HEIGHT = 0.2;
export const BRICK_HEIGHT = 1.2;
export const PLATE_HEIGHT = 0.4; // 1/3 of brick height
export const TILE_HEIGHT = 0.4; // Same as plate but no studs

export type BrickVariant = 'brick' | 'plate' | 'tile';

export interface BrickType {
  id: string;
  name: string;
  studsX: number;
  studsZ: number;
  variant: BrickVariant;
  color: string;
}

export interface PlacedBrick {
  id: string;
  typeId: string;
  position: [number, number, number];
  color: string;
  rotation: number;
}

// Available brick types
export const BRICK_TYPES: BrickType[] = [
  // Bricks
  { id: '1x1-brick', name: '1×1 Brick', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935' },
  { id: '2x2-brick', name: '2×2 Brick', studsX: 2, studsZ: 2, variant: 'brick', color: '#1e88e5' },
  { id: '2x4-brick', name: '2×4 Brick', studsX: 2, studsZ: 4, variant: 'brick', color: '#43a047' },
  // Plates
  { id: '1x1-plate', name: '1×1 Plate', studsX: 1, studsZ: 1, variant: 'plate', color: '#fdd835' },
  { id: '2x2-plate', name: '2×2 Plate', studsX: 2, studsZ: 2, variant: 'plate', color: '#fb8c00' },
  { id: '2x4-plate', name: '2×4 Plate', studsX: 2, studsZ: 4, variant: 'plate', color: '#8e24aa' },
  // Tiles (no studs, smooth top)
  { id: '1x1-tile', name: '1×1 Tile', studsX: 1, studsZ: 1, variant: 'tile', color: '#26a69a' },
  { id: '2x2-tile', name: '2×2 Tile', studsX: 2, studsZ: 2, variant: 'tile', color: '#ec407a' },
  { id: '2x4-tile', name: '2×4 Tile', studsX: 2, studsZ: 4, variant: 'tile', color: '#5c6bc0' },
];

export const getBrickType = (id: string): BrickType | undefined => {
  return BRICK_TYPES.find(b => b.id === id);
};

export const getBrickHeight = (variant: BrickVariant): number => {
  switch (variant) {
    case 'brick': return BRICK_HEIGHT;
    case 'plate': return PLATE_HEIGHT;
    case 'tile': return TILE_HEIGHT;
  }
};

export const hasStuds = (variant: BrickVariant): boolean => {
  return variant !== 'tile';
};
