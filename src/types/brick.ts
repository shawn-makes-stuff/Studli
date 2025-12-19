// Stud-based dimensions
export const STUD_SPACING = 1; // Distance between stud centers
export const STUD_RADIUS = 0.3;
export const STUD_HEIGHT = 0.2;
export const BRICK_HEIGHT = 1.2;
export const PLATE_HEIGHT = 0.4; // 1/3 of brick height
export const TILE_HEIGHT = 0.4; // Same as plate but no studs

export type BrickOrientation = 'up' | 'down' | 'posX' | 'negX' | 'posZ' | 'negZ';
export const DEFAULT_BRICK_ORIENTATION: BrickOrientation = 'up';

export const SIDE_STUD_POS_X = 1 << 0;
export const SIDE_STUD_POS_Z = 1 << 1;
export const SIDE_STUD_NEG_X = 1 << 2;
export const SIDE_STUD_NEG_Z = 1 << 3;

export type BrickVariant = 'brick' | 'plate' | 'tile' | 'slope' | 'corner-slope';

export interface BrickType {
  id: string;
  name: string;
  studsX: number;
  studsZ: number;
  variant: BrickVariant;
  color: string;
  isRound?: boolean;
  isInverted?: boolean;
  sideStudMask?: number; // bitmask of SIDE_STUD_* (local +X/+Z/-X/-Z), used by SNOT bricks
}

export interface PlacedBrick {
  id: string;
  typeId: string;
  position: [number, number, number];
  color: string;
  rotation: number;
  orientation?: BrickOrientation; // default: 'up'
}

// Available brick types
const BRICKS: BrickType[] = [
  { id: '1x1-brick', name: '1x1 Brick', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935' },
  { id: '1x1-snot-1', name: '1x1 SNOT Brick (1 side)', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935', sideStudMask: SIDE_STUD_POS_X },
  { id: '1x1-snot-2', name: '1x1 SNOT Brick (2 sides)', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935', sideStudMask: SIDE_STUD_POS_X | SIDE_STUD_POS_Z },
  { id: '1x1-snot-3', name: '1x1 SNOT Brick (3 sides)', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935', sideStudMask: SIDE_STUD_POS_X | SIDE_STUD_POS_Z | SIDE_STUD_NEG_X },
  { id: '1x1-snot-4', name: '1x1 SNOT Brick (4 sides)', studsX: 1, studsZ: 1, variant: 'brick', color: '#e53935', sideStudMask: SIDE_STUD_POS_X | SIDE_STUD_POS_Z | SIDE_STUD_NEG_X | SIDE_STUD_NEG_Z },
  { id: '1x2-brick', name: '1x2 Brick', studsX: 1, studsZ: 2, variant: 'brick', color: '#d32f2f' },
  { id: '1x3-brick', name: '1x3 Brick', studsX: 1, studsZ: 3, variant: 'brick', color: '#c62828' },
  { id: '1x4-brick', name: '1x4 Brick', studsX: 1, studsZ: 4, variant: 'brick', color: '#b71c1c' },
  { id: '1x6-brick', name: '1x6 Brick', studsX: 1, studsZ: 6, variant: 'brick', color: '#e57373' },
  { id: '1x8-brick', name: '1x8 Brick', studsX: 1, studsZ: 8, variant: 'brick', color: '#ef5350' },
  { id: '2x2-brick', name: '2x2 Brick', studsX: 2, studsZ: 2, variant: 'brick', color: '#1e88e5' },
  { id: '2x3-brick', name: '2x3 Brick', studsX: 2, studsZ: 3, variant: 'brick', color: '#1976d2' },
  { id: '2x4-brick', name: '2x4 Brick', studsX: 2, studsZ: 4, variant: 'brick', color: '#43a047' },
  { id: '2x6-brick', name: '2x6 Brick', studsX: 2, studsZ: 6, variant: 'brick', color: '#388e3c' },
  { id: '2x8-brick', name: '2x8 Brick', studsX: 2, studsZ: 8, variant: 'brick', color: '#2e7d32' },
  { id: '4x4-brick', name: '4x4 Brick', studsX: 4, studsZ: 4, variant: 'brick', color: '#1565c0' },
  { id: '4x6-brick', name: '4x6 Brick', studsX: 4, studsZ: 6, variant: 'brick', color: '#0d47a1' },
];

const PLATES: BrickType[] = [
  { id: '1x1-plate', name: '1x1 Plate', studsX: 1, studsZ: 1, variant: 'plate', color: '#fdd835' },
  { id: '1x2-plate', name: '1x2 Plate', studsX: 1, studsZ: 2, variant: 'plate', color: '#fbc02d' },
  { id: '1x3-plate', name: '1x3 Plate', studsX: 1, studsZ: 3, variant: 'plate', color: '#f9a825' },
  { id: '1x4-plate', name: '1x4 Plate', studsX: 1, studsZ: 4, variant: 'plate', color: '#f57f17' },
  { id: '1x6-plate', name: '1x6 Plate', studsX: 1, studsZ: 6, variant: 'plate', color: '#fff176' },
  { id: '1x8-plate', name: '1x8 Plate', studsX: 1, studsZ: 8, variant: 'plate', color: '#ffee58' },
  { id: '2x2-plate', name: '2x2 Plate', studsX: 2, studsZ: 2, variant: 'plate', color: '#fb8c00' },
  { id: '2x3-plate', name: '2x3 Plate', studsX: 2, studsZ: 3, variant: 'plate', color: '#f57c00' },
  { id: '2x4-plate', name: '2x4 Plate', studsX: 2, studsZ: 4, variant: 'plate', color: '#8e24aa' },
  { id: '2x6-plate', name: '2x6 Plate', studsX: 2, studsZ: 6, variant: 'plate', color: '#7b1fa2' },
  { id: '2x8-plate', name: '2x8 Plate', studsX: 2, studsZ: 8, variant: 'plate', color: '#6a1b9a' },
  { id: '4x4-plate', name: '4x4 Plate', studsX: 4, studsZ: 4, variant: 'plate', color: '#ef6c00' },
  { id: '4x6-plate', name: '4x6 Plate', studsX: 4, studsZ: 6, variant: 'plate', color: '#e65100' },
  { id: '4x8-plate', name: '4x8 Plate', studsX: 4, studsZ: 8, variant: 'plate', color: '#ff6f00' },
  { id: '6x6-plate', name: '6x6 Plate', studsX: 6, studsZ: 6, variant: 'plate', color: '#f4511e' },
  { id: '6x8-plate', name: '6x8 Plate', studsX: 6, studsZ: 8, variant: 'plate', color: '#e64a19' },
];

const TILES: BrickType[] = [
  { id: '1x1-tile', name: '1x1 Tile', studsX: 1, studsZ: 1, variant: 'tile', color: '#26a69a' },
  { id: '1x2-tile', name: '1x2 Tile', studsX: 1, studsZ: 2, variant: 'tile', color: '#00897b' },
  { id: '1x3-tile', name: '1x3 Tile', studsX: 1, studsZ: 3, variant: 'tile', color: '#00796b' },
  { id: '1x4-tile', name: '1x4 Tile', studsX: 1, studsZ: 4, variant: 'tile', color: '#00695c' },
  { id: '1x6-tile', name: '1x6 Tile', studsX: 1, studsZ: 6, variant: 'tile', color: '#4db6ac' },
  { id: '1x8-tile', name: '1x8 Tile', studsX: 1, studsZ: 8, variant: 'tile', color: '#80cbc4' },
  { id: '2x2-tile', name: '2x2 Tile', studsX: 2, studsZ: 2, variant: 'tile', color: '#ec407a' },
  { id: '2x3-tile', name: '2x3 Tile', studsX: 2, studsZ: 3, variant: 'tile', color: '#e91e63' },
  { id: '2x4-tile', name: '2x4 Tile', studsX: 2, studsZ: 4, variant: 'tile', color: '#5c6bc0' },
  { id: '2x6-tile', name: '2x6 Tile', studsX: 2, studsZ: 6, variant: 'tile', color: '#3f51b5' },
  { id: '2x8-tile', name: '2x8 Tile', studsX: 2, studsZ: 8, variant: 'tile', color: '#303f9f' },
  { id: '4x4-tile', name: '4x4 Tile', studsX: 4, studsZ: 4, variant: 'tile', color: '#d81b60' },
  { id: '4x6-tile', name: '4x6 Tile', studsX: 4, studsZ: 6, variant: 'tile', color: '#c2185b' },
];

const SLOPES: BrickType[] = [
  { id: '1x2-slope-33', name: '1x2 Slope', studsX: 1, studsZ: 2, variant: 'slope', color: '#9c27b0' },
  { id: '1x3-slope-33', name: '1x3 Slope', studsX: 1, studsZ: 3, variant: 'slope', color: '#8e24aa' },
  { id: '1x4-slope-33', name: '1x4 Slope', studsX: 1, studsZ: 4, variant: 'slope', color: '#7b1fa2' },
  { id: '2x2-slope-45', name: '2x2 Slope', studsX: 2, studsZ: 2, variant: 'slope', color: '#673ab7' },
  { id: '2x3-slope-33', name: '2x3 Slope', studsX: 2, studsZ: 3, variant: 'slope', color: '#5e35b1' },
  { id: '2x4-slope-33', name: '2x4 Slope', studsX: 2, studsZ: 4, variant: 'slope', color: '#512da8' },
  { id: '1x2-slope-inv', name: '1x2 Inverted Slope', studsX: 1, studsZ: 2, variant: 'slope', color: '#ce93d8', isInverted: true },
  { id: '1x3-slope-inv', name: '1x3 Inverted Slope', studsX: 1, studsZ: 3, variant: 'slope', color: '#f48fb1', isInverted: true },
  { id: '1x4-slope-inv', name: '1x4 Inverted Slope', studsX: 1, studsZ: 4, variant: 'slope', color: '#ea80fc', isInverted: true },
  { id: '2x2-slope-inv', name: '2x2 Inverted Slope', studsX: 2, studsZ: 2, variant: 'slope', color: '#4527a0', isInverted: true },
  { id: '2x3-slope-inv', name: '2x3 Inverted Slope', studsX: 2, studsZ: 3, variant: 'slope', color: '#ba68c8', isInverted: true },
  { id: '2x4-slope-inv', name: '2x4 Inverted Slope', studsX: 2, studsZ: 4, variant: 'slope', color: '#ab47bc', isInverted: true },
  { id: '2x2-slope-corner', name: '2x2 Corner Slope', studsX: 2, studsZ: 2, variant: 'corner-slope', color: '#7b1fa2' },
  { id: '3x3-slope-corner', name: '3x3 Corner Slope', studsX: 3, studsZ: 3, variant: 'corner-slope', color: '#9c27b0' },
  { id: '4x4-slope-corner', name: '4x4 Corner Slope', studsX: 4, studsZ: 4, variant: 'corner-slope', color: '#8e24aa' },
  { id: '2x2-slope-corner-inv', name: '2x2 Inverted Corner Slope', studsX: 2, studsZ: 2, variant: 'corner-slope', color: '#ce93d8', isInverted: true },
  { id: '3x3-slope-corner-inv', name: '3x3 Inverted Corner Slope', studsX: 3, studsZ: 3, variant: 'corner-slope', color: '#f48fb1', isInverted: true },
  { id: '4x4-slope-corner-inv', name: '4x4 Inverted Corner Slope', studsX: 4, studsZ: 4, variant: 'corner-slope', color: '#ea80fc', isInverted: true },
];

const makeRoundVariants = (types: BrickType[]): BrickType[] => {
  return types.map((type) => ({
    ...type,
    id: `${type.id}-round`,
    name: type.name.replace(/ (Brick|Plate|Tile)$/, ' Round $1'),
    isRound: true,
  }));
};

export const BRICK_TYPES: BrickType[] = [
  ...BRICKS,
  ...makeRoundVariants(BRICKS),
  ...PLATES,
  ...makeRoundVariants(PLATES),
  ...TILES,
  ...makeRoundVariants(TILES),
  ...SLOPES,
];

export const getBrickType = (id: string): BrickType | undefined => {
  return BRICK_TYPES.find(b => b.id === id);
};

export const getBrickHeight = (variant: BrickVariant): number => {
  switch (variant) {
    case 'brick': return BRICK_HEIGHT;
    case 'plate': return PLATE_HEIGHT;
    case 'tile': return TILE_HEIGHT;
    case 'slope': return BRICK_HEIGHT; // Slopes are brick height
    case 'corner-slope': return BRICK_HEIGHT; // Corner slopes are brick height at peak
    default: return BRICK_HEIGHT;
  }
};

export const hasStuds = (variant: BrickVariant): boolean => {
  return variant !== 'tile'; // Tiles have no studs; slopes have studs on connection edge
};
