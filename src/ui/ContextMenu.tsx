import { useEffect, useRef } from 'react';
import { useBrickStore } from '../store/useBrickStore';

interface MenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

const MenuItem = ({ label, shortcut, disabled, onClick }: MenuItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full px-4 py-2 text-left flex justify-between items-center
      ${disabled
        ? 'text-gray-500 cursor-not-allowed'
        : 'text-gray-200 hover:bg-gray-600'
      }
    `}
  >
    <span>{label}</span>
    {shortcut && (
      <span className="text-xs text-gray-400 ml-4">{shortcut}</span>
    )}
  </button>
);

const MenuDivider = () => (
  <div className="border-t border-gray-600 my-1" />
);

export const ContextMenu = () => {
  const menuRef = useRef<HTMLDivElement>(null);

  const contextMenu = useBrickStore((state) => state.contextMenu);
  const closeContextMenu = useBrickStore((state) => state.closeContextMenu);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const clipboard = useBrickStore((state) => state.clipboard);
  const copySelection = useBrickStore((state) => state.copySelection);
  const removeBricks = useBrickStore((state) => state.removeBricks);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const updateBrickColor = useBrickStore((state) => state.updateBrickColor);
  const setMode = useBrickStore((state) => state.setMode);

  const hasSelection = selectedBrickIds.size > 0;
  const hasClipboard = clipboard.length > 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  const handleRecolor = () => {
    if (hasSelection) {
      updateBrickColor([...selectedBrickIds], selectedColor);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (hasSelection) {
      removeBricks([...selectedBrickIds]);
    }
    closeContextMenu();
  };

  const handleCopy = () => {
    if (hasSelection) {
      copySelection();
    }
    closeContextMenu();
  };

  const handleMove = () => {
    if (hasSelection) {
      setMode('move');
    }
    closeContextMenu();
  };

  const handlePaste = () => {
    if (hasClipboard) {
      setMode('paste');
    }
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-1 min-w-48 z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <MenuItem
        label="Recolor"
        disabled={!hasSelection}
        onClick={handleRecolor}
      />
      <MenuItem
        label="Move"
        disabled={!hasSelection}
        onClick={handleMove}
      />
      <MenuDivider />
      <MenuItem
        label="Copy"
        shortcut="Ctrl+C"
        disabled={!hasSelection}
        onClick={handleCopy}
      />
      <MenuItem
        label="Paste"
        shortcut="Ctrl+V"
        disabled={!hasClipboard}
        onClick={handlePaste}
      />
      <MenuDivider />
      <MenuItem
        label="Delete"
        shortcut="Del"
        disabled={!hasSelection}
        onClick={handleDelete}
      />
    </div>
  );
};
