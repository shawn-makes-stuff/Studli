import { useState } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { BRICK_TYPES } from '../types/brick';

// Icons
const BrickIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <rect x="3" y="8" width="18" height="10" rx="1" />
    <rect x="5" y="5" width="4" height="3" rx="0.5" />
    <rect x="10" y="5" width="4" height="3" rx="0.5" />
    <rect x="15" y="5" width="4" height="3" rx="0.5" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 10h10a5 5 0 0 1 5 5v2" />
    <path d="M7 6L3 10l4 4" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ isOpen, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-600 max-w-sm">
        <h3 className="text-lg font-semibold text-white mb-2">Clear Canvas?</h3>
        <p className="text-gray-400 mb-6">This will remove all bricks. This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

interface HelpPopoutProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpPopout = ({ isOpen, onClose }: HelpPopoutProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-4 w-72 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">Controls</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="text-sm text-gray-400 space-y-3">
        <div>
          <div className="text-gray-300 font-medium mb-1">Mouse</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-200">Left Click</span>
            <span>Place / Select</span>
            <span className="text-gray-200">Right Click</span>
            <span>Cancel (move/paste)</span>
            <span className="text-gray-200">Right Drag</span>
            <span>Rotate view</span>
            <span className="text-gray-200">Scroll</span>
            <span>Zoom</span>
          </div>
        </div>
        <div>
          <div className="text-gray-300 font-medium mb-1">Keyboard</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-200">R</span>
            <span>Rotate</span>
            <span className="text-gray-200">Enter</span>
            <span>Confirm move/paste</span>
            <span className="text-gray-200">W / ↑</span>
            <span>Layer up</span>
            <span className="text-gray-200">S / ↓</span>
            <span>Layer down</span>
            <span className="text-gray-200">Escape</span>
            <span>Cancel</span>
            <span className="text-gray-200">Delete</span>
            <span>Delete selected</span>
          </div>
        </div>
        <div>
          <div className="text-gray-300 font-medium mb-1">Shortcuts</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-200">Ctrl+Z / Y</span>
            <span>Undo / Redo</span>
            <span className="text-gray-200">Ctrl+C / V</span>
            <span>Copy / Paste</span>
            <span className="text-gray-200">Ctrl+A</span>
            <span>Select all</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloatingToolbar = () => {
  const mode = useBrickStore((state) => state.mode);
  const setSelectedBrickType = useBrickStore((state) => state.setSelectedBrickType);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const undo = useBrickStore((state) => state.undo);
  const past = useBrickStore((state) => state.past);
  const clearAllBricks = useBrickStore((state) => state.clearAllBricks);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const rotatePreview = useBrickStore((state) => state.rotatePreview);
  const rotateGroup = useBrickStore((state) => state.rotateGroup);
  const rotateSelectedBricks = useBrickStore((state) => state.rotateSelectedBricks);

  const [showHelp, setShowHelp] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isBuildMode = mode === 'build';
  const isMovingOrPasting = mode === 'move' || mode === 'paste';
  const isEditMode = mode === 'select';
  const hasSelection = selectedBrickIds.size > 0;

  // Rotate is available in build mode, edit mode with selection, or move/paste mode
  const canRotate = isBuildMode || isMovingOrPasting || (isEditMode && hasSelection);

  const toggleMode = () => {
    if (isBuildMode) {
      setSelectedBrickType(null);
    } else {
      setSelectedBrickType(selectedBrickType || BRICK_TYPES[0]);
    }
  };

  const handleRotate = () => {
    if (isMovingOrPasting) {
      rotateGroup();
    } else if (isBuildMode) {
      rotatePreview();
    } else if (isEditMode && hasSelection) {
      rotateSelectedBricks();
    }
  };

  const handleClear = () => {
    clearAllBricks();
    setShowClearConfirm(false);
  };

  return (
    <>
      {/* Center Toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40">
        {/* Build/Edit Toggle */}
        <button
          onClick={toggleMode}
          className={`
            p-3 rounded-xl shadow-lg transition-all
            ${isBuildMode
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-purple-600 text-white hover:bg-purple-500'
            }
          `}
          title={isBuildMode ? 'Build Mode (click to edit)' : 'Edit Mode (click to build)'}
        >
          {isBuildMode ? <BrickIcon /> : <EditIcon />}
        </button>

        {/* Rotate Button */}
        <button
          onClick={handleRotate}
          disabled={!canRotate}
          className={`
            p-3 rounded-xl shadow-lg transition-all
            ${!canRotate
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
            }
          `}
          title="Rotate (R)"
        >
          <RotateIcon />
        </button>

        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={past.length === 0}
          className={`
            p-3 rounded-xl shadow-lg transition-all
            ${past.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
            }
          `}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
        </button>

        {/* Delete/Clear Button */}
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={placedBricks.length === 0}
          className={`
            p-3 rounded-xl shadow-lg transition-all
            ${placedBricks.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-red-400 hover:bg-red-600 hover:text-white'
            }
          `}
          title="Clear Canvas"
        >
          <TrashIcon />
        </button>

        {/* Mode Label */}
        <div className={`
          px-3 py-2 rounded-lg text-sm font-medium
          ${isBuildMode ? 'bg-green-600/20 text-green-400' : 'bg-purple-600/20 text-purple-400'}
        `}>
          {isBuildMode ? 'Build' : 'Edit'}
        </div>
      </div>

      {/* Help Button - Top Right */}
      <div className="fixed top-4 right-4 z-40">
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`
              p-3 rounded-xl shadow-lg transition-all
              ${showHelp
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
              }
            `}
            title="Controls Help"
          >
            <HelpIcon />
          </button>
          <HelpPopout isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
};
