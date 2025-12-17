import { create } from 'zustand';
import { PlacedBrick, BrickType, BRICK_TYPES } from '../types/brick';
import { rotatePoint } from '../utils/math';
import { checkBrickCollision } from '../utils/collision';

interface HistoryState {
  placedBricks: PlacedBrick[];
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export type InteractionMode = 'build' | 'select' | 'move' | 'paste';

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
  pendingGhostBricks: PlacedBrick[];
  selectedBrickIds: Set<string>;
  clipboard: PlacedBrick[];
  past: HistoryState[];
  future: HistoryState[];
  contextMenu: ContextMenuState;
  rightClickStart: { x: number; y: number } | null;
  recentBricks: BrickType[];
  lastPlacedBrickId: string | null;

  setSelectedBrickType: (type: BrickType | null) => void;
  addToRecentBricks: (type: BrickType) => void;
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
  setPendingGhostBricks: (bricks: PlacedBrick[]) => void;

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
  setRightClickStart: (pos: { x: number; y: number } | null) => void;

  nudgeLastPlaced: (dx: number, dy: number, dz: number) => void;
  clearLastPlaced: () => void;
}

const saveToHistory = (state: BrickStore): HistoryState => ({
  placedBricks: [...state.placedBricks]
});

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
  pendingGhostBricks: [],
  selectedBrickIds: new Set(),
  clipboard: [],
  past: [],
  future: [],
  contextMenu: { isOpen: false, x: 0, y: 0 },
  rightClickStart: null,
  recentBricks: [],
  lastPlacedBrickId: null,

  setSelectedBrickType: (type) => set({
    selectedBrickType: type,
    layerOffset: 0,
    mode: type ? 'build' : 'select',
    selectedBrickIds: type ? new Set() : get().selectedBrickIds
  }),

  addToRecentBricks: (type) => set((state) => {
    // Remove if already exists, then add to front
    const filtered = state.recentBricks.filter(b => b.id !== type.id);
    return { recentBricks: [type, ...filtered].slice(0, 5) };
  }),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setCursorPosition: (position) => set({ cursorPosition: position }),
  setRotation: (rotation) => set({ rotation: rotation % 4 }),
  rotatePreview: () => set((state) => ({ rotation: (state.rotation + 1) % 4 })),
  rotateGroup: () => set((state) => ({ groupRotation: (state.groupRotation + 1) % 4 })),

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
      const [newRelX, newRelZ] = rotatePoint(relX, relZ, 1);

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
  setPendingGhostBricks: (bricks) => set({ pendingGhostBricks: bricks }),

  addBrick: (brick) => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: [...state.placedBricks, brick],
    layerOffset: 0,
    selectedBrickIds: new Set([brick.id]),
    lastPlacedBrickId: brick.id
  })),

  removeBrick: (id) => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: state.placedBricks.filter(b => b.id !== id),
    selectedBrickIds: new Set([...state.selectedBrickIds].filter(bid => bid !== id)),
    lastPlacedBrickId: state.lastPlacedBrickId === id ? null : state.lastPlacedBrickId
  })),

  removeBricks: (ids) => set((state) => {
    const idSet = new Set(ids);
    return {
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: state.placedBricks.filter(b => !idSet.has(b.id)),
      selectedBrickIds: new Set([...state.selectedBrickIds].filter(bid => !idSet.has(bid))),
      lastPlacedBrickId: idSet.has(state.lastPlacedBrickId ?? '') ? null : state.lastPlacedBrickId
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
    layerOffset: 0,
    lastPlacedBrickId: null
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

    if (!state.ghostValid || state.pendingGhostBricks.length === 0) return;

    const newBricks = state.pendingGhostBricks.map(brick => ({
      ...brick,
      id: crypto.randomUUID()
    }));

    if (state.mode === 'move') {
      const remainingBricks = state.placedBricks.filter(b => !state.selectedBrickIds.has(b.id));
      set({
        past: [...state.past, saveToHistory(state)],
        future: [],
        placedBricks: [...remainingBricks, ...newBricks],
        selectedBrickIds: new Set(newBricks.map(b => b.id)),
        lastPlacedBrickId: newBricks[0]?.id ?? null,
        mode: 'select',
        groupRotation: 0,
        pendingGhostBricks: []
      });
    } else if (state.mode === 'paste') {
      set({
        past: [...state.past, saveToHistory(state)],
        future: [],
        placedBricks: [...state.placedBricks, ...newBricks],
        selectedBrickIds: new Set(newBricks.map(b => b.id)),
        lastPlacedBrickId: newBricks[0]?.id ?? null,
        mode: 'select',
        groupRotation: 0,
        pendingGhostBricks: []
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
      selectedBrickIds: new Set(),
      lastPlacedBrickId: null
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, saveToHistory(state)],
      future: state.future.slice(1),
      placedBricks: next.placedBricks,
      selectedBrickIds: new Set(),
      lastPlacedBrickId: null
    };
  }),

  openContextMenu: (x, y) => set({ contextMenu: { isOpen: true, x, y } }),
  closeContextMenu: () => set({ contextMenu: { isOpen: false, x: 0, y: 0 } }),
  setRightClickStart: (pos) => set({ rightClickStart: pos }),

  nudgeLastPlaced: (dx, dy, dz) => set((state) => {
    if (!state.lastPlacedBrickId) return state;
    const target = state.placedBricks.find(b => b.id === state.lastPlacedBrickId);
    if (!target) return { ...state, lastPlacedBrickId: null };

    const newX = target.position[0] + dx;
    const newY = target.position[1] + dy;
    const newZ = target.position[2] + dz;
    const collides = checkBrickCollision(
      newX,
      newY,
      newZ,
      target.typeId,
      target.rotation,
      state.placedBricks,
      new Set([target.id])
    );
    if (collides) return state;

    const updatedBricks = state.placedBricks.map(b =>
      b.id === target.id ? { ...b, position: [newX, newY, newZ] as [number, number, number] } : b
    );

    return {
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: updatedBricks,
      selectedBrickIds: new Set([target.id]),
      lastPlacedBrickId: target.id
    };
  }),

  clearLastPlaced: () => set({ lastPlacedBrickId: null })
}));

// Selector helpers for common combinations
export const useSelectionState = () => useBrickStore((state) => ({
  selectedBrickIds: state.selectedBrickIds,
  hasSelection: state.selectedBrickIds.size > 0
}));

export const useModeState = () => useBrickStore((state) => ({
  mode: state.mode,
  isBuildMode: state.mode === 'build',
  isSelectMode: state.mode === 'select',
  isMovingOrPasting: state.mode === 'move' || state.mode === 'paste'
}));
