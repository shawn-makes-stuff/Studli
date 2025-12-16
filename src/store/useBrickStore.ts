import { create } from 'zustand';
import { PlacedBrick, BrickType, BRICK_TYPES, getBrickType, getBrickHeight } from '../types/brick';
import { snapToGrid, getBrickFootprint } from '../utils/snapToGrid';

interface HistoryState {
  placedBricks: PlacedBrick[];
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

type InteractionMode = 'build' | 'select' | 'move' | 'paste';

interface BrickStore {
  placedBricks: PlacedBrick[];
  selectedBrickType: BrickType | null;
  selectedColor: string;
  cursorPosition: [number, number] | null;
  rotation: number;
  groupRotation: number;
  layerOffset: number;
  mode: InteractionMode;
  ghostValid: boolean;
  selectedBrickIds: Set<string>;
  clipboard: PlacedBrick[];
  past: HistoryState[];
  future: HistoryState[];
  contextMenu: ContextMenuState;

  setSelectedBrickType: (type: BrickType | null) => void;
  setSelectedColor: (color: string) => void;
  setCursorPosition: (position: [number, number] | null) => void;
  setRotation: (rotation: number) => void;
  rotatePreview: () => void;
  rotateGroup: () => void;
  rotateSelectedBricks: () => void;
  setLayerOffset: (offset: number) => void;
  adjustLayer: (delta: number) => void;
  resetLayerOffset: () => void;
  setMode: (mode: InteractionMode) => void;
  setGhostValid: (valid: boolean) => void;

  addBrick: (brick: PlacedBrick) => void;
  removeBrick: (id: string) => void;
  removeBricks: (ids: string[]) => void;
  updateBrickColor: (ids: string[], color: string) => void;
  clearAllBricks: () => void;

  selectBrick: (id: string, addToSelection?: boolean) => void;
  deselectBrick: (id: string) => void;
  selectAllBricks: () => void;
  clearSelection: () => void;
  toggleBrickSelection: (id: string) => void;

  copySelection: () => void;
  confirmMoveOrPaste: () => void;
  cancelMoveOrPaste: () => void;

  undo: () => void;
  redo: () => void;

  openContextMenu: (x: number, y: number) => void;
  closeContextMenu: () => void;
}

const saveToHistory = (state: BrickStore): HistoryState => ({
  placedBricks: [...state.placedBricks]
});

const rotatePoint = (x: number, z: number, rotation: number): [number, number] => {
  const r = rotation % 4;
  switch (r) {
    case 0: return [x, z];
    case 1: return [-z, x];
    case 2: return [-x, -z];
    case 3: return [z, -x];
    default: return [x, z];
  }
};

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

    const overlapX = brickFootprint.minX < existingFootprint.maxX - epsilon &&
                     brickFootprint.maxX > existingFootprint.minX + epsilon;
    const overlapZ = brickFootprint.minZ < existingFootprint.maxZ - epsilon &&
                     brickFootprint.maxZ > existingFootprint.minZ + epsilon;

    if (overlapX && overlapZ) {
      const overlapY = brickBottomY < existingTopY - epsilon &&
                       brickTopY > existingBottomY + epsilon;
      if (overlapY) return true;
    }
  }

  if (brickBottomY < -0.01) return true;
  return false;
};

const findCandidateYPositions = (
  sourceBricks: PlacedBrick[],
  deltaX: number, deltaZ: number,
  existingBricks: PlacedBrick[]
): number[] => {
  const candidates = new Set<number>();
  candidates.add(0);

  for (const brick of sourceBricks) {
    const brickType = getBrickType(brick.typeId);
    if (!brickType) continue;

    const newX = brick.position[0] + deltaX;
    const newZ = brick.position[2] + deltaZ;
    const brickFootprint = getBrickFootprint(newX, newZ, brickType.studsX, brickType.studsZ, brick.rotation);

    for (const existing of existingBricks) {
      const existingType = getBrickType(existing.typeId);
      if (!existingType) continue;

      const existingFootprint = getBrickFootprint(
        existing.position[0], existing.position[2],
        existingType.studsX, existingType.studsZ, existing.rotation
      );

      const epsilon = 0.01;
      const overlapX = brickFootprint.minX < existingFootprint.maxX - epsilon &&
                       brickFootprint.maxX > existingFootprint.minX + epsilon;
      const overlapZ = brickFootprint.minZ < existingFootprint.maxZ - epsilon &&
                       brickFootprint.maxZ > existingFootprint.minZ + epsilon;

      if (overlapX && overlapZ) {
        const existingHeight = getBrickHeight(existingType.variant);
        candidates.add(existing.position[1] + existingHeight / 2);
        candidates.add(existing.position[1] - existingHeight / 2 - getBrickHeight(brickType.variant));
      }
    }
  }

  return Array.from(candidates).filter(y => y >= 0).sort((a, b) => a - b);
};

const checkGroupPlacement = (
  sourceBricks: PlacedBrick[],
  deltaX: number, deltaZ: number, baseY: number, minOriginalY: number,
  existingBricks: PlacedBrick[]
): boolean => {
  const deltaY = baseY - minOriginalY;

  for (const brick of sourceBricks) {
    const newX = brick.position[0] + deltaX;
    const newY = brick.position[1] + deltaY;
    const newZ = brick.position[2] + deltaZ;

    if (checkBrickCollision(newX, newY, newZ, brick.typeId, brick.rotation, existingBricks)) {
      return false;
    }
  }
  return true;
};

const applyGroupRotation = (
  sourceBricks: PlacedBrick[],
  groupRotation: number
): PlacedBrick[] => {
  if (groupRotation === 0) return sourceBricks;

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

const calculateFinalPositions = (
  sourceBricks: PlacedBrick[],
  cursorPosition: [number, number],
  existingBricks: PlacedBrick[],
  excludeIds: Set<string>,
  groupRotation: number
): PlacedBrick[] => {
  if (sourceBricks.length === 0) return [];

  const rotatedBricks = applyGroupRotation(sourceBricks, groupRotation);

  const anchorBrick = rotatedBricks[0];
  const anchorType = getBrickType(anchorBrick.typeId);
  if (!anchorType) return [];

  const [snappedX, snappedZ] = snapToGrid(
    cursorPosition[0], cursorPosition[1],
    anchorType.studsX, anchorType.studsZ,
    anchorBrick.rotation
  );

  const deltaX = snappedX - anchorBrick.position[0];
  const deltaZ = snappedZ - anchorBrick.position[2];

  const relevantBricks = existingBricks.filter(b => !excludeIds.has(b.id));

  let minOriginalY = Infinity;
  for (const brick of rotatedBricks) {
    const bt = getBrickType(brick.typeId);
    if (bt) {
      minOriginalY = Math.min(minOriginalY, brick.position[1] - getBrickHeight(bt.variant) / 2);
    }
  }

  const offsetBricks = rotatedBricks.map(brick => ({
    ...brick,
    position: [
      brick.position[0] + deltaX,
      brick.position[1],
      brick.position[2] + deltaZ
    ] as [number, number, number]
  }));

  const candidateYs = findCandidateYPositions(offsetBricks, 0, 0, relevantBricks);

  let validBaseY: number | null = null;
  for (const baseY of candidateYs) {
    if (checkGroupPlacement(offsetBricks, 0, 0, baseY, minOriginalY, relevantBricks)) {
      validBaseY = baseY;
      break;
    }
  }

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

        const epsilon = 0.01;
        const overlapX = brickFootprint.minX < existingFootprint.maxX - epsilon &&
                         brickFootprint.maxX > existingFootprint.minX + epsilon;
        const overlapZ = brickFootprint.minZ < existingFootprint.maxZ - epsilon &&
                         brickFootprint.maxZ > existingFootprint.minZ + epsilon;

        if (overlapX && overlapZ) {
          const existingHeight = getBrickHeight(existingType.variant);
          maxStackHeight = Math.max(maxStackHeight, existing.position[1] + existingHeight / 2);
        }
      }
    }
    validBaseY = maxStackHeight;
  }

  const deltaY = validBaseY - minOriginalY;

  return offsetBricks.map(brick => ({
    ...brick,
    id: crypto.randomUUID(),
    position: [
      brick.position[0],
      brick.position[1] + deltaY,
      brick.position[2]
    ] as [number, number, number]
  }));
};

export const useBrickStore = create<BrickStore>((set, get) => ({
  placedBricks: [],
  selectedBrickType: BRICK_TYPES[0],
  selectedColor: BRICK_TYPES[0].color,
  cursorPosition: null,
  rotation: 0,
  groupRotation: 0,
  layerOffset: 0,
  mode: 'build',
  ghostValid: false,
  selectedBrickIds: new Set(),
  clipboard: [],
  past: [],
  future: [],
  contextMenu: { isOpen: false, x: 0, y: 0 },

  setSelectedBrickType: (type) => set({
    selectedBrickType: type,
    selectedColor: type?.color ?? get().selectedColor,
    layerOffset: 0,
    mode: type ? 'build' : 'select',
    selectedBrickIds: type ? new Set() : get().selectedBrickIds
  }),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setCursorPosition: (position) => set({ cursorPosition: position }),
  setRotation: (rotation) => set({ rotation: rotation % 4 }),
  rotatePreview: () => set((state) => ({ rotation: (state.rotation + 1) % 4 })),
  rotateGroup: () => set((state) => ({ groupRotation: (state.groupRotation + 1) % 4 })),

  // Rotate selected bricks in place (for edit mode)
  rotateSelectedBricks: () => set((state) => {
    if (state.selectedBrickIds.size === 0) return state;

    const selectedBricks = state.placedBricks.filter(b => state.selectedBrickIds.has(b.id));
    if (selectedBricks.length === 0) return state;

    // Find center of selected bricks
    let sumX = 0, sumZ = 0;
    for (const brick of selectedBricks) {
      sumX += brick.position[0];
      sumZ += brick.position[2];
    }
    const centerX = sumX / selectedBricks.length;
    const centerZ = sumZ / selectedBricks.length;

    // Rotate each selected brick around the center
    const updatedBricks = state.placedBricks.map(brick => {
      if (!state.selectedBrickIds.has(brick.id)) return brick;

      const relX = brick.position[0] - centerX;
      const relZ = brick.position[2] - centerZ;
      const [newRelX, newRelZ] = rotatePoint(relX, relZ, 1); // Rotate 90 degrees

      return {
        ...brick,
        position: [
          centerX + newRelX,
          brick.position[1],
          centerZ + newRelZ
        ] as [number, number, number],
        rotation: (brick.rotation + 1) % 4
      };
    });

    return {
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: updatedBricks
    };
  }),

  setLayerOffset: (offset) => set({ layerOffset: offset }),
  adjustLayer: (delta) => set((state) => ({
    layerOffset: Math.max(state.layerOffset + delta, -100)
  })),
  resetLayerOffset: () => set({ layerOffset: 0 }),
  setMode: (mode) => set({ mode, groupRotation: 0 }),
  setGhostValid: (valid) => set({ ghostValid: valid }),

  addBrick: (brick) => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: [...state.placedBricks, brick],
    layerOffset: 0
  })),

  removeBrick: (id) => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: state.placedBricks.filter(b => b.id !== id),
    selectedBrickIds: new Set([...state.selectedBrickIds].filter(bid => bid !== id))
  })),

  removeBricks: (ids) => set((state) => {
    const idSet = new Set(ids);
    return {
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: state.placedBricks.filter(b => !idSet.has(b.id)),
      selectedBrickIds: new Set([...state.selectedBrickIds].filter(bid => !idSet.has(bid)))
    };
  }),

  updateBrickColor: (ids, color) => set((state) => {
    const idSet = new Set(ids);
    return {
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: state.placedBricks.map(b => idSet.has(b.id) ? { ...b, color } : b)
    };
  }),

  clearAllBricks: () => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: [],
    selectedBrickIds: new Set(),
    layerOffset: 0
  })),

  selectBrick: (id, addToSelection = false) => set((state) => {
    if (addToSelection) {
      const newSet = new Set(state.selectedBrickIds);
      newSet.add(id);
      return { selectedBrickIds: newSet };
    }
    return { selectedBrickIds: new Set([id]) };
  }),

  deselectBrick: (id) => set((state) => {
    const newSet = new Set(state.selectedBrickIds);
    newSet.delete(id);
    return { selectedBrickIds: newSet };
  }),

  selectAllBricks: () => set((state) => ({
    selectedBrickIds: new Set(state.placedBricks.map(b => b.id)),
    mode: 'select',
    selectedBrickType: null
  })),

  clearSelection: () => set({ selectedBrickIds: new Set() }),

  toggleBrickSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedBrickIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return { selectedBrickIds: newSet };
  }),

  copySelection: () => set((state) => {
    const selectedBricks = state.placedBricks.filter(b => state.selectedBrickIds.has(b.id));
    if (selectedBricks.length === 0) return state;
    return { clipboard: selectedBricks };
  }),

  confirmMoveOrPaste: () => {
    const state = get();
    if (!state.cursorPosition || !state.ghostValid) return;

    const sourceBricks = state.mode === 'move'
      ? state.placedBricks.filter(b => state.selectedBrickIds.has(b.id))
      : state.clipboard;

    if (sourceBricks.length === 0) return;

    const excludeIds = state.mode === 'move' ? state.selectedBrickIds : new Set<string>();
    const newBricks = calculateFinalPositions(
      sourceBricks, state.cursorPosition, state.placedBricks, excludeIds, state.groupRotation
    );

    if (newBricks.length === 0) return;

    if (state.mode === 'move') {
      const remainingBricks = state.placedBricks.filter(b => !state.selectedBrickIds.has(b.id));
      set({
        past: [...state.past, saveToHistory(state)],
        future: [],
        placedBricks: [...remainingBricks, ...newBricks],
        selectedBrickIds: new Set(newBricks.map(b => b.id)),
        mode: 'select',
        groupRotation: 0
      });
    } else if (state.mode === 'paste') {
      set({
        past: [...state.past, saveToHistory(state)],
        future: [],
        placedBricks: [...state.placedBricks, ...newBricks],
        selectedBrickIds: new Set(newBricks.map(b => b.id)),
        mode: 'select',
        groupRotation: 0
      });
    }
  },

  cancelMoveOrPaste: () => set({
    mode: 'select',
    groupRotation: 0
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      future: [saveToHistory(state), ...state.future],
      placedBricks: previous.placedBricks,
      selectedBrickIds: new Set()
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, saveToHistory(state)],
      future: state.future.slice(1),
      placedBricks: next.placedBricks,
      selectedBrickIds: new Set()
    };
  }),

  openContextMenu: (x, y) => set({ contextMenu: { isOpen: true, x, y } }),
  closeContextMenu: () => set({ contextMenu: { isOpen: false, x: 0, y: 0 } }),
}));
