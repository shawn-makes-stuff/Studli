import { useEffect, useMemo } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { STUD_SPACING } from '../types/brick';

export const RefinementControls = () => {
  const lastPlacedBrickId = useBrickStore((state) => state.lastPlacedBrickId);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const nudgeLastPlaced = useBrickStore((state) => state.nudgeLastPlaced);
  const clearLastPlaced = useBrickStore((state) => state.clearLastPlaced);

  const targetBrick = useMemo(
    () => placedBricks.find((b) => b.id === lastPlacedBrickId),
    [placedBricks, lastPlacedBrickId]
  );

  useEffect(() => {
    if (lastPlacedBrickId && !targetBrick) {
      clearLastPlaced();
    }
  }, [lastPlacedBrickId, targetBrick, clearLastPlaced]);

  if (!targetBrick) return null;

  return (
    <div className="fixed inset-x-0 bottom-28 sm:bottom-32 flex justify-center px-4 z-40 pointer-events-none">
      <div className="pointer-events-auto bg-gray-800/95 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm p-3 sm:p-4 flex flex-col gap-2 w-full max-w-xs">
        <div className="text-xs text-gray-300 text-center">Fine adjust placement</div>
        <div className="grid grid-cols-3 gap-2 place-items-center">
          <span />
          <button
            onClick={() => nudgeLastPlaced(0, -STUD_SPACING)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 bg-gray-700/70 text-white font-semibold active:scale-95 transition-all"
          >
            ↑
          </button>
          <span />
          <button
            onClick={() => nudgeLastPlaced(-STUD_SPACING, 0)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 bg-gray-700/70 text-white font-semibold active:scale-95 transition-all"
          >
            ←
          </button>
          <button
            onClick={() => clearLastPlaced()}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-blue-500 bg-blue-600/80 text-white font-semibold active:scale-95 transition-all"
          >
            OK
          </button>
          <button
            onClick={() => nudgeLastPlaced(STUD_SPACING, 0)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 bg-gray-700/70 text-white font-semibold active:scale-95 transition-all"
          >
            →
          </button>
          <span />
          <button
            onClick={() => nudgeLastPlaced(0, STUD_SPACING)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-600 bg-gray-700/70 text-white font-semibold active:scale-95 transition-all"
          >
            ↓
          </button>
          <span />
        </div>
      </div>
    </div>
  );
};
