import { useEffect, useRef, useState } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { BrickThumbnail } from './BrickThumbnail';
import { ColorPopout } from './ColorPopout';
import { BrickPickerPopout } from './BrickPickerPopout';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import UndoIcon from '@mui/icons-material/Undo';

export const BottomBar = () => {
  const [showColorPopout, setShowColorPopout] = useState(false);
  const [showBrickPicker, setShowBrickPicker] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('brickPickerPopout');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.isPinned);
    } catch {
      return false;
    }
  });
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  });
  const colorButtonRef = useRef<HTMLDivElement>(null);
  const brickPickerButtonRef = useRef<HTMLDivElement>(null);

  const selectedColor = useBrickStore((state) => state.selectedColor);
  const setSelectedColor = useBrickStore((state) => state.setSelectedColor);
  const useDefaultColor = useBrickStore((state) => state.useDefaultColor);
  const setUseDefaultColor = useBrickStore((state) => state.setUseDefaultColor);
  const recentBricks = useBrickStore((state) => state.recentBricks);
  const setSelectedBrickType = useBrickStore((state) => state.setSelectedBrickType);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const rotatePreview = useBrickStore((state) => state.rotatePreview);
  const undo = useBrickStore((state) => state.undo);
  const past = useBrickStore((state) => state.past);

  const handleBrickPickerClick = () => {
    // Exit pointer lock when opening UI elements
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setShowBrickPicker(!showBrickPicker);
    setShowColorPopout(false);
  };

  const handleColorClick = () => {
    // Exit pointer lock when opening UI elements
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setShowColorPopout(!showColorPopout);
    setShowBrickPicker(false);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleDefaultColorSelect = () => {
    setUseDefaultColor(true);
  };

  const handleBrickSelect = (brick: typeof recentBricks[0]) => {
    if (brick) {
      setSelectedBrickType(brick);
    }
  };

  const handleRecentBrickClick = (brickType: typeof recentBricks[0]) => {
    setSelectedBrickType(brickType);
  };

  const isCompactHeight = viewport.height > 0 && viewport.height <= 500;

  // Show fewer recent bricks on narrow or short screens
  const recentBricksToShow =
    typeof window !== 'undefined' && (window.innerWidth < 400 || isCompactHeight) ? 4 : 5;
  const effectiveColor = useDefaultColor ? selectedBrickType.color : selectedColor;

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className={`max-w-full mx-auto px-2 sm:px-4 ${isCompactHeight ? 'py-1' : 'py-2'} sm:py-3`}>
          <div className={`flex items-center justify-center ${isCompactHeight ? 'gap-1.5' : 'gap-1'} sm:gap-4`}>
          {/* Brick Picker */}
          <div ref={brickPickerButtonRef} className="flex flex-col items-center gap-1 pointer-events-auto relative">
            <span className="text-[10px] sm:text-xs text-gray-300 font-medium bg-gray-800/90 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Bricks</span>
            <button
              onClick={handleBrickPickerClick}
              className={`
                w-10 h-10 sm:w-14 sm:h-14 rounded-lg border-2 transition-colors shadow-lg active:scale-95 backdrop-blur-sm
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
            <span className="text-[10px] sm:text-xs text-gray-300 font-medium bg-gray-800/90 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Color</span>
            <button
              onClick={handleColorClick}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 hover:border-gray-400 transition-colors shadow-lg active:scale-95 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center"
              style={{
                backgroundColor: effectiveColor,
                boxShadow: `0 0 0 3px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2)`
              }}
              title="Select color"
            >
              {useDefaultColor && (
                <span className="text-white font-black text-lg leading-none drop-shadow">*</span>
              )}
            </button>
            <ColorPopout
              isOpen={showColorPopout}
              onClose={() => setShowColorPopout(false)}
              currentColor={effectiveColor}
              isDefault={useDefaultColor}
              onDefaultSelect={handleDefaultColorSelect}
              onColorSelect={handleColorSelect}
              anchorRef={colorButtonRef}
            />
          </div>

          {/* Recent Bricks */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <span className="text-[10px] sm:text-xs text-gray-300 font-medium bg-gray-800/90 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Recent</span>
            <div className="flex gap-1.5 sm:gap-2">
              {Array.from({ length: recentBricksToShow }).map((_, index) => {
                const brick = recentBricks[index];
                return (
                  <button
                    key={index}
                    onClick={() => brick && handleRecentBrickClick(brick)}
                    className={`
                      w-10 h-10 sm:w-14 sm:h-14 rounded-lg border-2 transition-all shadow-lg
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
                        <BrickThumbnail brickType={brick} color={brick.color} size={isCompactHeight ? 34 : 40} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <span className="text-[10px] sm:text-xs text-gray-300 font-medium bg-gray-800/90 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">Actions</span>
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  if (document.pointerLockElement) {
                    document.exitPointerLock();
                  }
                  rotatePreview();
                }}
                className={`
                  w-10 h-10 sm:w-14 sm:h-14 rounded-lg border-2 transition-all shadow-lg
                  border-gray-600 hover:border-gray-400 bg-gray-800/80 backdrop-blur-sm active:scale-95
                `}
                title="Rotate (R)"
              >
                <RotateRightIcon className="mx-auto text-white" fontSize="small" />
              </button>

              <button
                onClick={() => {
                  if (document.pointerLockElement) {
                    document.exitPointerLock();
                  }
                  undo();
                }}
                disabled={past.length === 0}
                className={`
                  w-10 h-10 sm:w-14 sm:h-14 rounded-lg border-2 transition-all shadow-lg backdrop-blur-sm
                  ${past.length === 0
                    ? 'border-gray-700 bg-gray-800/40 text-gray-500 cursor-not-allowed'
                    : 'border-gray-600 hover:border-gray-400 bg-gray-800/80 text-white active:scale-95'
                  }
                `}
                title="Undo (Ctrl+Z)"
              >
                <UndoIcon className="mx-auto" fontSize="small" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
