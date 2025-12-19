import { create } from 'zustand';
import { BrickType, BRICK_TYPES, PlacedBrick } from '../types/brick';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_BRICK_TYPE: BrickType =
  BRICK_TYPES.find((b) => b.id === '2x2-brick') ?? BRICK_TYPES[0];

type SettingsState = {
  soundEnabled: boolean;
  masterVolume: number; // 0..1
  effectsVolume: number; // 0..1
  musicVolume: number; // 0..1
  joystickMoveSensitivity: number; // multiplier
  joystickLookSensitivity: number; // multiplier
  quality: 'low' | 'medium' | 'high';
  touchControlsEnabled: boolean;
  movementControlMode: 'joystick' | 'dpad';
};

const SETTINGS_STORAGE_KEY = 'studli_settings_v1';
const PROJECTS_STORAGE_KEY = 'studli_projects_v1';

export type SavedProjectSnapshot = {
  placedBricks: PlacedBrick[];
  selectedBrickTypeId: string;
  selectedColor: string;
  useDefaultColor: boolean;
  rotation: number;
  layerOffset: number;
  connectionPointIndex: number;
};

export type SavedProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: SavedProjectSnapshot;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeQuality = (value: unknown): SettingsState['quality'] => {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return 'medium';
};

const normalizeMovementControlMode = (value: unknown): SettingsState['movementControlMode'] => {
  if (value === 'joystick' || value === 'dpad') return value;
  return 'joystick';
};

const readSettings = (): SettingsState => {
  if (typeof window === 'undefined') {
    return {
      soundEnabled: true,
      masterVolume: 0.95,
      effectsVolume: 0.9,
      musicVolume: 0.5,
      joystickMoveSensitivity: 1.0,
      joystickLookSensitivity: 1.0,
      quality: 'medium',
      touchControlsEnabled: true,
      movementControlMode: 'joystick',
    };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        soundEnabled: true,
        masterVolume: 0.95,
        effectsVolume: 0.9,
        musicVolume: 0.5,
        joystickMoveSensitivity: 1.0,
        joystickLookSensitivity: 1.0,
        quality: 'medium',
        touchControlsEnabled: true,
        movementControlMode: 'joystick',
      };
    }

    const parsed = JSON.parse(raw) as Partial<SettingsState> & {
      // Back-compat with previous settings
      sfxEnabled?: boolean;
      sfxVolume?: number;
    } | null;

    return {
      soundEnabled: parsed?.soundEnabled ?? parsed?.sfxEnabled ?? true,
      masterVolume: clamp(parsed?.masterVolume ?? 0.95, 0, 1),
      effectsVolume: clamp(parsed?.effectsVolume ?? parsed?.sfxVolume ?? 0.9, 0, 1),
      musicVolume: clamp(parsed?.musicVolume ?? 0.5, 0, 1),
      joystickMoveSensitivity: clamp(parsed?.joystickMoveSensitivity ?? 1.0, 0.4, 2.0),
      joystickLookSensitivity: clamp(parsed?.joystickLookSensitivity ?? 1.0, 0.4, 2.0),
      quality: normalizeQuality((parsed as Record<string, unknown> | null)?.quality),
      touchControlsEnabled: Boolean((parsed as Record<string, unknown> | null)?.touchControlsEnabled ?? true),
      movementControlMode: normalizeMovementControlMode((parsed as Record<string, unknown> | null)?.movementControlMode),
    };
  } catch {
    return {
      soundEnabled: true,
      masterVolume: 0.95,
      effectsVolume: 0.9,
      musicVolume: 0.5,
      joystickMoveSensitivity: 1.0,
      joystickLookSensitivity: 1.0,
      quality: 'medium',
      touchControlsEnabled: true,
      movementControlMode: 'joystick',
    };
  }
};

const writeSettings = (settings: SettingsState) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

const readProjects = (): SavedProject[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProject[] | null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeProjects = (projects: SavedProject[]) => {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
};

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
  menuOpen: boolean;
  hasActiveSession: boolean;
  currentProjectId: string | null;
  projects: SavedProject[];

  deleteMode: boolean;
  deleteSelectionRootId: string | null;
  deleteSelectionIds: string[];

  placedBricks: PlacedBrick[];
  selectedBrickType: BrickType;
  selectedColor: string;
  useDefaultColor: boolean;
  rotation: number;
  layerOffset: number;
  recentBricks: BrickType[];
  connectionPointIndex: number;
  settings: SettingsState;

  // UI state
  uiControlsDisabled: boolean;
  uiPopoverOpen: boolean;
  uiPopoverType: 'none' | 'brickPicker' | 'colorPicker';

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

  openMenu: () => void;
  closeMenu: () => void;
  startNewGame: () => void;
  saveNewProject: (name: string) => string | null;
  saveCurrentProject: () => boolean;
  loadProject: (id: string) => boolean;
  refreshProjectsFromStorage: () => void;

  setSoundEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setJoystickMoveSensitivity: (sensitivity: number) => void;
  setJoystickLookSensitivity: (sensitivity: number) => void;
  setQuality: (quality: SettingsState['quality']) => void;
  setTouchControlsEnabled: (enabled: boolean) => void;
  setMovementControlMode: (mode: SettingsState['movementControlMode']) => void;
  setUiPopoverOpen: (open: boolean) => void;
  setUiPopoverType: (type: BrickStore['uiPopoverType']) => void;

  setRotation: (rotation: number) => void;
  rotatePreview: () => void;
  cycleConnectionPoint: () => void;

  setLayerOffset: (offset: number) => void;
  adjustLayer: (delta: number) => void;
  resetLayerOffset: () => void;

  addBrick: (brick: PlacedBrick) => void;
  removeBricksById: (ids: string[]) => void;
  toggleDeleteMode: () => void;
  clearDeleteSelection: () => void;
  setDeleteSelection: (rootId: string, ids: string[]) => void;

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

const getSnapshot = (state: BrickStore): SavedProjectSnapshot => ({
  placedBricks: [...state.placedBricks],
  selectedBrickTypeId: state.selectedBrickType?.id ?? DEFAULT_BRICK_TYPE.id,
  selectedColor: state.selectedColor,
  useDefaultColor: state.useDefaultColor,
  rotation: state.rotation,
  layerOffset: state.layerOffset,
  connectionPointIndex: state.connectionPointIndex,
});

export const useBrickStore = create<BrickStore>((set) => ({
  menuOpen: true,
  hasActiveSession: false,
  currentProjectId: null,
  projects: readProjects(),

  deleteMode: false,
  deleteSelectionRootId: null,
  deleteSelectionIds: [],

  placedBricks: [],
  selectedBrickType: DEFAULT_BRICK_TYPE,
  selectedColor: DEFAULT_BRICK_TYPE.color,
  useDefaultColor: true,
  rotation: 0,
  layerOffset: 0,
  recentBricks: [],
  connectionPointIndex: 0,
  settings: readSettings(),

  uiControlsDisabled: false,
  uiPopoverOpen: false,
  uiPopoverType: 'none',

  raycastHit: null,
  virtualJoystickInput: null,
  virtualJoystickCamera: null,
  virtualAscend: false,
  virtualDescend: false,

  past: [],
  future: [],

  setSelectedBrickType: (type) => set({
    selectedBrickType: type,
    layerOffset: 0,
    connectionPointIndex: 0,
  }),

  addToRecentBricks: (type) => set((state) => {
    const filtered = state.recentBricks.filter(b => b.id !== type.id);
    return { recentBricks: [type, ...filtered].slice(0, 5) };
  }),

  setSelectedColor: (color) => set({ selectedColor: color, useDefaultColor: false }),
  setUseDefaultColor: (useDefault) => set({ useDefaultColor: useDefault }),

  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false, hasActiveSession: true }),
  startNewGame: () =>
    set((state) => ({
      menuOpen: false,
      hasActiveSession: true,
      currentProjectId: null,
      deleteMode: false,
      deleteSelectionRootId: null,
      deleteSelectionIds: [],
      past: [],
      future: [],
      placedBricks: [],
      layerOffset: 0,
      rotation: 0,
      connectionPointIndex: 0,
      selectedBrickType: state.selectedBrickType ?? DEFAULT_BRICK_TYPE,
      selectedColor: state.selectedBrickType?.color ?? DEFAULT_BRICK_TYPE.color,
      useDefaultColor: true,
    })),

  refreshProjectsFromStorage: () => set({ projects: readProjects() }),

  saveNewProject: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const createdAt = Date.now();
    const id = uuidv4();
    set((state) => {
      const projects = readProjects();
      const snapshot = getSnapshot(state);
      const next: SavedProject = {
        id,
        name: trimmed,
        createdAt,
        updatedAt: createdAt,
        snapshot,
      };
      const updated = [next, ...projects];
      writeProjects(updated);
      return { projects: updated, currentProjectId: id, hasActiveSession: true };
    });
    return id;
  },

  saveCurrentProject: () => {
    const state = useBrickStore.getState();
    if (!state.currentProjectId) return false;

    const now = Date.now();
    const updated = readProjects().map((p) => {
      if (p.id !== state.currentProjectId) return p;
      return { ...p, updatedAt: now, snapshot: getSnapshot(state) };
    });
    writeProjects(updated);
    set({ projects: updated, hasActiveSession: true });
    return true;
  },

  loadProject: (id) => {
    const project = readProjects().find((p) => p.id === id);
    if (!project) return false;

    set(() => ({
      menuOpen: false,
      hasActiveSession: true,
      currentProjectId: project.id,
      deleteMode: false,
      deleteSelectionRootId: null,
      deleteSelectionIds: [],
      past: [],
      future: [],
      placedBricks: project.snapshot.placedBricks ?? [],
      layerOffset: project.snapshot.layerOffset ?? 0,
      rotation: ((project.snapshot.rotation ?? 0) % 4 + 4) % 4,
      connectionPointIndex: project.snapshot.connectionPointIndex ?? 0,
      selectedBrickType:
        BRICK_TYPES.find((b) => b.id === project.snapshot.selectedBrickTypeId) ?? DEFAULT_BRICK_TYPE,
      selectedColor: project.snapshot.selectedColor ?? DEFAULT_BRICK_TYPE.color,
      useDefaultColor: project.snapshot.useDefaultColor ?? true,
    }));

    // Refresh in-memory list in case storage changed.
    set({ projects: readProjects() });
    return true;
  },

  setSoundEnabled: (enabled) =>
    set((state) => {
      const settings = { ...state.settings, soundEnabled: enabled };
      writeSettings(settings);
      return { settings };
    }),
  setMasterVolume: (volume) =>
    set((state) => {
      const settings = { ...state.settings, masterVolume: clamp(volume, 0, 1) };
      writeSettings(settings);
      return { settings };
    }),
  setEffectsVolume: (volume) =>
    set((state) => {
      const settings = { ...state.settings, effectsVolume: clamp(volume, 0, 1) };
      writeSettings(settings);
      return { settings };
    }),
  setMusicVolume: (volume) =>
    set((state) => {
      const settings = { ...state.settings, musicVolume: clamp(volume, 0, 1) };
      writeSettings(settings);
      return { settings };
    }),
  setJoystickMoveSensitivity: (sensitivity) =>
    set((state) => {
      const settings = {
        ...state.settings,
        joystickMoveSensitivity: clamp(sensitivity, 0.4, 2.0),
      };
      writeSettings(settings);
      return { settings };
    }),
  setJoystickLookSensitivity: (sensitivity) =>
    set((state) => {
      const settings = {
        ...state.settings,
        joystickLookSensitivity: clamp(sensitivity, 0.4, 2.0),
      };
      writeSettings(settings);
      return { settings };
    }),

  setQuality: (quality) =>
    set((state) => {
      const settings = {
        ...state.settings,
        quality: normalizeQuality(quality),
      };
      writeSettings(settings);
      return { settings };
    }),

  setTouchControlsEnabled: (enabled) =>
    set((state) => {
      const settings = {
        ...state.settings,
        touchControlsEnabled: Boolean(enabled),
      };
      writeSettings(settings);
      return { settings };
    }),

  setMovementControlMode: (mode) =>
    set((state) => {
      const settings = {
        ...state.settings,
        movementControlMode: normalizeMovementControlMode(mode),
      };
      writeSettings(settings);
      return { settings };
    }),

  setUiPopoverOpen: (open) => set({ uiPopoverOpen: open }),
  setUiPopoverType: (type) => set({ uiPopoverType: type }),

  setRotation: (rotation) => set({ rotation: ((rotation % 4) + 4) % 4 }),
  rotatePreview: () => set((state) => ({ rotation: (state.rotation + 1) % 4 })),
  cycleConnectionPoint: () => set((state) => ({ connectionPointIndex: state.connectionPointIndex + 1 })),

  setLayerOffset: (offset) => set({ layerOffset: offset }),
  adjustLayer: (delta) => set((state) => ({
    layerOffset: Math.max(state.layerOffset + delta, -100)
  })),
  resetLayerOffset: () => set({ layerOffset: 0 }),

  addBrick: (brick) => set((state) => ({
    hasActiveSession: true,
    past: [...state.past, saveToHistory(state)],
    future: [],
    placedBricks: [...state.placedBricks, brick],
    layerOffset: 0
  })),

  removeBricksById: (ids) => set((state) => {
    if (!ids || ids.length === 0) return state;
    const remove = new Set(ids);
    const nextPlaced = state.placedBricks.filter((b) => !remove.has(b.id));
    if (nextPlaced.length === state.placedBricks.length) return state;
    return {
      hasActiveSession: true,
      past: [...state.past, saveToHistory(state)],
      future: [],
      placedBricks: nextPlaced,
    };
  }),

  toggleDeleteMode: () => set((state) => ({
    deleteMode: !state.deleteMode,
    deleteSelectionRootId: null,
    deleteSelectionIds: [],
  })),

  clearDeleteSelection: () => set(() => ({
    deleteSelectionRootId: null,
    deleteSelectionIds: [],
  })),

  setDeleteSelection: (rootId, ids) => set(() => ({
    deleteSelectionRootId: rootId,
    deleteSelectionIds: Array.from(new Set(ids)),
  })),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      future: [saveToHistory(state), ...state.future],
      placedBricks: previous.placedBricks,
      deleteSelectionRootId: null,
      deleteSelectionIds: [],
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, saveToHistory(state)],
      future: state.future.slice(1),
      placedBricks: next.placedBricks,
      deleteSelectionRootId: null,
      deleteSelectionIds: [],
    };
  }),

  setUiControlsDisabled: (disabled) => set({ uiControlsDisabled: disabled }),

  setRaycastHit: (hit) => set({ raycastHit: hit }),
  setVirtualJoystickInput: (input) => set({ virtualJoystickInput: input }),
  setVirtualJoystickCamera: (input) => set({ virtualJoystickCamera: input }),
  setVirtualAscend: (pressed) => set({ virtualAscend: pressed }),
  setVirtualDescend: (pressed) => set({ virtualDescend: pressed })
}));
