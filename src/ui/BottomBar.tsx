import { useRef, useState } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { BrickThumbnail } from './BrickThumbnail';
import { ColorPopout } from './ColorPopout';
import { BrickPickerPopout } from './BrickPickerPopout';

export const BottomBar = () => {
  const [showColorPopout, setShowColorPopout] = useState(false);
  const [showBrickPicker, setShowBrickPicker] = useState(false);
  const colorButtonRef = useRef<HTMLDivElement>(null);
  const brickPickerButtonRef = useRef<HTMLDivElement>(null);

  const selectedColor = useBrickStore((state) => state.selectedColor);
  const setSelectedColor = useBrickStore((state) => state.setSelectedColor);
  const recentBricks = useBrickStore((state) => state.recentBricks);
  const setSelectedBrickType = useBrickStore((state) => state.setSelectedBrickType);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);

  const handleBrickPickerClick = () => {
    setShowBrickPicker(!showBrickPicker);
    setShowColorPopout(false);
  };

  const handleColorClick = () => {
    setShowColorPopout(!showColorPopout);
    setShowBrickPicker(false);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleBrickSelect = (brick: typeof recentBricks[0]) => {
    if (brick) {
      setSelectedBrickType(brick);
    }
  };

  const handleRecentBrickClick = (brickType: typeof recentBricks[0]) => {
    setSelectedBrickType(brickType);
  };

  // Show fewer recent bricks on mobile
  const recentBricksToShow = typeof window !== 'undefined' && window.innerWidth < 400 ? 3 : 5;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-full mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Brick Picker */}
          <div ref={brickPickerButtonRef} className="flex flex-col items-center gap-1 pointer-events-auto relative">
            <span className="text-xs text-gray-300 font-medium bg-gray-800/90 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Bricks</span>
            <button
              onClick={handleBrickPickerClick}
              className={`
                w-11 h-11 sm:w-14 sm:h-14 rounded-lg border-2 transition-colors shadow-lg active:scale-95 backdrop-blur-sm
                ${showBrickPicker
                  ? 'border-blue-500 bg-blue-600/80'
                  : 'border-gray-600 hover:border-gray-400 bg-gray-800/80'
                }
              `}
              title="Select brick"
            >
              <img src={`${import.meta.env.BASE_URL}brick.png`} alt="Studli" className="w-full h-full p-2" />
            </button>
            <BrickPickerPopout
              isOpen={showBrickPicker}
              onClose={() => setShowBrickPicker(false)}
              currentBrick={selectedBrickType}
              onBrickSelect={handleBrickSelect}
              anchorRef={brickPickerButtonRef}
            />
          </div>

          {/* Color Selector */}
          <div ref={colorButtonRef} className="flex flex-col items-center gap-1 pointer-events-auto relative">
            <span className="text-xs text-gray-300 font-medium bg-gray-800/90 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Color</span>
            <button
              onClick={handleColorClick}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 hover:border-gray-400 transition-colors shadow-lg active:scale-95 bg-gray-800/30 backdrop-blur-sm"
              style={{
                backgroundColor: selectedColor,
                boxShadow: `0 0 0 3px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2)`
              }}
              title="Select color"
            />
            <ColorPopout
              isOpen={showColorPopout}
              onClose={() => setShowColorPopout(false)}
              currentColor={selectedColor}
              onColorSelect={handleColorSelect}
              anchorRef={colorButtonRef}
            />
          </div>

          {/* Recent Bricks */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <span className="text-xs text-gray-300 font-medium bg-gray-800/90 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Recent</span>
            <div className="flex gap-1.5 sm:gap-2">
              {Array.from({ length: recentBricksToShow }).map((_, index) => {
                const brick = recentBricks[index];
                return (
                  <button
                    key={index}
                    onClick={() => brick && handleRecentBrickClick(brick)}
                    className={`
                      w-11 h-11 sm:w-14 sm:h-14 rounded-lg border-2 transition-all shadow-lg
                      ${brick
                        ? selectedBrickType?.id === brick.id
                          ? 'border-blue-500 bg-blue-600/80 backdrop-blur-sm'
                          : 'border-gray-600 hover:border-gray-400 bg-gray-800/80 backdrop-blur-sm'
                        : 'border-gray-700 bg-gray-800/40 backdrop-blur-sm'
                      }
                      ${brick ? 'active:scale-95' : 'cursor-default'}
                    `}
                    disabled={!brick}
                  >
                    {brick && (
                      <div className="w-full h-full flex items-center justify-center p-0.5 sm:p-1">
                        <BrickThumbnail brickType={brick} color={brick.color} size={40} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
