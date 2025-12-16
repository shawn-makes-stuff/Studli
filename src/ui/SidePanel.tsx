import { useState } from 'react';
import { BRICK_TYPES, BrickType } from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { ColorPicker } from './ColorPicker';

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

interface BrickButtonProps {
  brickType: BrickType;
  isSelected: boolean;
  onClick: () => void;
}

const BrickButton = ({ brickType, isSelected, onClick }: BrickButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg text-left transition-all
        ${isSelected
          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded border-2 border-gray-500 flex-shrink-0"
          style={{ backgroundColor: brickType.color }}
        />
        <div className="min-w-0">
          <div className="font-medium truncate">{brickType.name}</div>
          <div className="text-xs text-gray-400">
            {brickType.variant.charAt(0).toUpperCase() + brickType.variant.slice(1)}
          </div>
        </div>
      </div>
    </button>
  );
};

const PANEL_WIDTH = 280;

export const SidePanel = () => {
  const [isOpen, setIsOpen] = useState(true);

  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const setSelectedBrickType = useBrickStore((state) => state.setSelectedBrickType);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const resetLayerOffset = useBrickStore((state) => state.resetLayerOffset);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const mode = useBrickStore((state) => state.mode);
  const placedBricks = useBrickStore((state) => state.placedBricks);

  const bricks = BRICK_TYPES.filter(b => b.variant === 'brick');
  const plates = BRICK_TYPES.filter(b => b.variant === 'plate');
  const tiles = BRICK_TYPES.filter(b => b.variant === 'tile');

  const handleBrickClick = (brick: BrickType) => {
    if (selectedBrickType?.id === brick.id) {
      setSelectedBrickType(null); // Deselect to enter edit mode
    } else {
      setSelectedBrickType(brick);
    }
  };

  return (
    <div
      className="fixed top-0 left-0 h-full z-40 transition-transform duration-300 flex"
      style={{
        width: `${PANEL_WIDTH + 56}px`,
        transform: isOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`
      }}
    >
      {/* Side Panel */}
      <div
        className="h-full bg-gray-800/95 backdrop-blur-sm shadow-xl flex-shrink-0"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        <div className="h-full py-4 px-4 flex flex-col gap-4 overflow-y-auto">
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-white">Studli</h1>
            <p className="text-sm text-gray-400">{placedBricks.length} bricks placed</p>
          </div>

          {/* Selection Info */}
          {selectedBrickIds.size > 0 && (
            <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-2 text-sm text-blue-300">
              {selectedBrickIds.size} brick{selectedBrickIds.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Mode Info */}
          {(mode === 'move' || mode === 'paste') && (
            <div className="bg-yellow-600/30 border border-yellow-500 rounded-lg p-2 text-sm text-yellow-300">
              {mode === 'move' ? 'Moving bricks...' : 'Pasting bricks...'}
              <div className="text-xs mt-1 opacity-80">Left click to place, right click to cancel</div>
            </div>
          )}

          {/* Bricks Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Bricks</h2>
            <div className="flex flex-col gap-2">
              {bricks.map((brick) => (
                <BrickButton
                  key={brick.id}
                  brickType={brick}
                  isSelected={selectedBrickType?.id === brick.id}
                  onClick={() => handleBrickClick(brick)}
                />
              ))}
            </div>
          </div>

          {/* Plates Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Plates</h2>
            <div className="flex flex-col gap-2">
              {plates.map((plate) => (
                <BrickButton
                  key={plate.id}
                  brickType={plate}
                  isSelected={selectedBrickType?.id === plate.id}
                  onClick={() => handleBrickClick(plate)}
                />
              ))}
            </div>
          </div>

          {/* Tiles Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Tiles</h2>
            <p className="text-xs text-gray-500 mb-2">Smooth top - no stacking</p>
            <div className="flex flex-col gap-2">
              {tiles.map((tile) => (
                <BrickButton
                  key={tile.id}
                  brickType={tile}
                  isSelected={selectedBrickType?.id === tile.id}
                  onClick={() => handleBrickClick(tile)}
                />
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Color</h2>
            <ColorPicker />
          </div>

          {/* Layer Indicator */}
          {layerOffset !== 0 && mode === 'build' && (
            <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-3">
              <div className="text-yellow-400 text-sm font-medium">
                Layer Offset: {layerOffset}
              </div>
              <button
                onClick={resetLayerOffset}
                className="text-xs text-yellow-300 hover:text-yellow-100 mt-1"
              >
                Reset to auto
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-700">
            Click brick type to build • Click again to edit
          </div>
        </div>
      </div>

      {/* Hamburger Toggle Button - slides with panel */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-4 ml-4 p-3 h-fit bg-gray-800 rounded-xl shadow-lg text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        title={isOpen ? 'Close panel' : 'Open panel'}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
    </div>
  );
};
