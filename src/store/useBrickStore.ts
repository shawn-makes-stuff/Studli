import { create } from 'zustand';
import { BrickType, BRICK_TYPES, PlacedBrick } from '../types/brick';

const DEFAULT_BRICK_TYPE: BrickType =
  BRICK_TYPES.find((b) => b.id === '2x2-brick') ?? BRICK_TYPES[0];

interface HistoryState {
  placedBricks: PlacedBrick[];
}

interface RaycastHit {
  position: [number, number, number];
  normal: [number, number, number];
  hitBrick?: PlacedBrick;
  hitGround?: boolean;
  isTopFace?: boolean;
}

interface BrickStore {
  placedBricks: PlacedBrick[];
  selectedBrickType: BrickType;
  selectedColor: string;
  useDefaultColor: boolean;
  rotation: number;
  layerOffset: number;
  recentBricks: BrickType[];

  // UI state
  uiControlsDisabled: boolean;

  // Placement/raycast state
  raycastHit: RaycastHit | null;

  // Mobile inputs
  virtualJoystickInput: { x: number; y: number } | null;
  virtualJoystickCamera: { x: number; y: number } | null;
  virtualAscend: boolean;
  virtualDescend: boolean;

  // Undo/redo
  past: HistoryState[];
  future: HistoryState[];

  setSelectedBrickType: (type: BrickType) => void;
  addToRecentBricks: (type: BrickType) => void;
  setSelectedColor: (color: string) => void;
  setUseDefaultColor: (useDefault: boolean) => void;

  setRotation: (rotation: number) => void;
  rotatePreview: () => void;

  setLayerOffset: (offset: number) => void;
  adjustLayer: (delta: number) => void;
  resetLayerOffset: () => void;

  addBrick: (brick: PlacedBrick) => void;

  undo: () => void;
  redo: () => void;

  setUiControlsDisabled: (disabled: boolean) => void;

  setRaycastHit: (hit: RaycastHit | null) => void;
  setVirtualJoystickInput: (input: { x: number; y: number } | null) => void;
  setVirtualJoystickCamera: (input: { x: number; y: number } | null) => void;
  setVirtualAscend: (pressed: boolean) => void;
  setVirtualDescend: (pressed: boolean) => void;
}

const saveToHistory = (state: BrickStore): HistoryState => ({
  placedBricks: [...state.placedBricks]
});

export const useBrickStore = create<BrickStore>((set) => ({
  placedBricks: [],
  selectedBrickType: DEFAULT_BRICK_TYPE,
  selectedColor: DEFAULT_BRICK_TYPE.color,
  useDefaultColor: true,
  rotation: 0,
  layerOffset: 0,
  recentBricks: [],

  uiControlsDisabled: false,

  raycastHit: null,
  virtualJoystickInput: null,
  virtualJoystickCamera: null,
  virtualAscend: false,
  virtualDescend: false,

  past: [],
  future: [],

  setSelectedBrickType: (type) => set({
    selectedBrickType: type,
    layerOffset: 0
  }),

  addToRecentBricks: (type) => set((state) => {
    const filtered = state.recentBricks.filter(b => b.id !== type.id);
    return { recentBricks: [type, ...filtered].slice(0, 5) };
  }),

  setSelectedColor: (color) => set({ selectedColor: color, useDefaultColor: false }),
  setUseDefaultColor: (useDefault) => set({ useDefaultColor: useDefault }),

  setRotation: (rotation) => set({ rotation: ((rotation % 4) + 4) % 4 }),
  rotatePreview: () => set((state) => ({ rotation: (state.rotation + 1) % 4 })),

  setLayerOffset: (offset) => set({ layerOffset: offset }),
  adjustLayer: (delta) => set((state) => ({
    layerOffset: Math.max(state.layerOffset + delta, -100)
  })),
  resetLayerOffset: () => set({ layerOffset: 0 }),

  addBrick: (brick) => set((state) => ({
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: [...state.placedBricks, brick],
    layerOffset: 0
  })),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      future: [saveToHistory(state), ...state.future],
      placedBricks: previous.placedBricks
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, saveToHistory(state)],
      future: state.future.slice(1),
      placedBricks: next.placedBricks
    };
  }),

  setUiControlsDisabled: (disabled) => set({ uiControlsDisabled: disabled }),

  setRaycastHit: (hit) => set({ raycastHit: hit }),
  setVirtualJoystickInput: (input) => set({ virtualJoystickInput: input }),
  setVirtualJoystickCamera: (input) => set({ virtualJoystickCamera: input }),
  setVirtualAscend: (pressed) => set({ virtualAscend: pressed }),
  setVirtualDescend: (pressed) => set({ virtualDescend: pressed })
}));
