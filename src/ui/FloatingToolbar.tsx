import React, { useState } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { BRICK_TYPES } from '../types/brick';
import {
  BrickIcon,
  EditIcon,
  RotateIcon,
  UndoIcon,
  TrashIcon,
  HelpIcon
} from './Icons';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ isOpen, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-600 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-white mb-2">Clear Canvas?</h3>
        <p className="text-gray-400 mb-6">This will remove all bricks. This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-700 transition-colors touch-manipulation active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition-colors touch-manipulation active:scale-95"
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

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const sections = isTouchDevice ? [
    {
      title: 'Touch',
      items: [
        ['Tap', 'Place / Select'],
        ['Two Finger Drag', 'Rotate view'],
        ['Pinch', 'Zoom'],
      ]
    },
    {
      title: 'Toolbar',
      items: [
        ['Rotate Button', 'Rotate brick'],
        ['Undo Button', 'Undo last action'],
        ['Clear Button', 'Clear all bricks'],
      ]
    }
  ] : [
    {
      title: 'Mouse',
      items: [
        ['Left Click', 'Place / Select'],
        ['Right Click', 'Cancel (move/paste)'],
        ['Right Drag', 'Rotate view'],
        ['Scroll', 'Zoom'],
      ]
    },
    {
      title: 'Keyboard',
      items: [
        ['R', 'Rotate'],
        ['Enter', 'Confirm move/paste'],
        ['W / ↑', 'Layer up'],
        ['S / ↓', 'Layer down'],
        ['Escape', 'Cancel'],
        ['Delete', 'Delete selected'],
      ]
    },
    {
      title: 'Shortcuts',
      items: [
        ['Ctrl+Z / Y', 'Undo / Redo'],
        ['Ctrl+C / V', 'Copy / Paste'],
        ['Ctrl+A', 'Select all'],
      ]
    }
  ];

  return (
    <div
      className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-4 w-72 max-h-96 overflow-y-auto z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">Controls</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 -m-2 touch-manipulation">✕</button>
      </div>
      <div className="text-sm text-gray-400 space-y-3">
        {sections.map(section => (
          <div key={section.title}>
            <div className="text-gray-300 font-medium mb-1">{section.title}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {section.items.map(([key, desc]) => (
                <React.Fragment key={key}>
                  <span className="text-gray-200">{key}</span>
                  <span>{desc}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  variant?: 'default' | 'success' | 'purple' | 'danger';
  children: React.ReactNode;
}

const ToolbarButton = ({
  onClick,
  disabled = false,
  active = false,
  title,
  variant = 'default',
  children
}: ToolbarButtonProps) => {
  const baseClasses = 'p-3 sm:p-4 rounded-xl shadow-lg transition-all active:scale-95 touch-manipulation';

  const variantClasses = {
    default: disabled
      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
      : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-500 active:bg-green-600',
    purple: 'bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-600',
    danger: disabled
      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
      : 'bg-gray-700 text-red-400 hover:bg-red-600 hover:text-white active:bg-red-700 active:text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${active ? variantClasses[variant] : variantClasses[variant === 'success' || variant === 'purple' ? variant : 'default']}`}
      title={title}
    >
      {children}
    </button>
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
        <ToolbarButton
          onClick={toggleMode}
          variant={isBuildMode ? 'success' : 'purple'}
          active
          title={isBuildMode ? 'Build Mode (click to edit)' : 'Edit Mode (click to build)'}
        >
          {isBuildMode ? <BrickIcon /> : <EditIcon />}
        </ToolbarButton>

        <ToolbarButton
          onClick={handleRotate}
          disabled={!canRotate}
          title="Rotate (R)"
        >
          <RotateIcon />
        </ToolbarButton>

        <ToolbarButton
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => setShowClearConfirm(true)}
          disabled={placedBricks.length === 0}
          variant="danger"
          title="Clear Canvas"
        >
          <TrashIcon />
        </ToolbarButton>

        <div className={`
          px-3 py-2 rounded-lg text-sm font-medium
          ${isBuildMode ? 'bg-green-600/20 text-green-400' : 'bg-purple-600/20 text-purple-400'}
        `}>
          {isBuildMode ? 'Build' : 'Edit'}
        </div>
      </div>

      {/* Help Button */}
      <div className="fixed top-4 right-4 z-40">
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowHelp(!showHelp)}
            active={showHelp}
            variant={showHelp ? 'default' : 'default'}
            title="Controls Help"
          >
            <HelpIcon />
          </ToolbarButton>
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
