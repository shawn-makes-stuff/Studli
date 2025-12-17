import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { getBrickType, getBrickHeight, STUD_SPACING } from '../types/brick';

export const RefinementWidget = () => {
  const lastPlacedBrickId = useBrickStore((state) => state.lastPlacedBrickId);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const nudgeLastPlaced = useBrickStore((state) => state.nudgeLastPlaced);
  const clearLastPlaced = useBrickStore((state) => state.clearLastPlaced);
  const mode = useBrickStore((state) => state.mode);

  const targetBrick = useMemo(
    () => placedBricks.find((b) => b.id === lastPlacedBrickId),
    [placedBricks, lastPlacedBrickId]
  );

  if (!targetBrick || mode === 'move' || mode === 'paste') return null;

  const brickType = getBrickType(targetBrick.typeId);
  if (!brickType) return null;

  const brickHeight = getBrickHeight(brickType.variant);
  const padY = brickHeight + 0.6;
  const stepXZ = STUD_SPACING;
  const stepY = brickHeight;
  const sideOffset = brickType.studsX * STUD_SPACING * 0.5 + 2;
  const widgetPos: [number, number, number] = [
    targetBrick.position[0] - sideOffset,
    targetBrick.position[1] + padY,
    targetBrick.position[2]
  ];

  return (
    <Html position={widgetPos} transform pointerEvents="auto">
      <div className="bg-gray-900/90 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm p-3 flex gap-3 items-center">
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => nudgeLastPlaced(0, 0, -stepXZ)}
            className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
            title="Forward"
          >
            ↑
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => nudgeLastPlaced(-stepXZ, 0, 0)}
              className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
              title="Left"
            >
              ←
            </button>
            <button
              onClick={() => clearLastPlaced()}
              className="w-10 h-10 rounded-lg border-2 border-blue-500 bg-blue-600/80 text-white font-semibold active:scale-95 transition-transform"
              title="Confirm"
            >
              OK
            </button>
            <button
              onClick={() => nudgeLastPlaced(stepXZ, 0, 0)}
              className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
              title="Right"
            >
              →
            </button>
          </div>
          <button
            onClick={() => nudgeLastPlaced(0, 0, stepXZ)}
            className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
            title="Back"
          >
            ↓
          </button>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => nudgeLastPlaced(0, stepY, 0)}
            className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
            title="Raise"
          >
            +Y
          </button>
          <button
            onClick={() => nudgeLastPlaced(0, -stepY, 0)}
            className="w-10 h-10 rounded-lg border-2 border-gray-600 bg-gray-700/80 text-white font-bold active:scale-95 transition-transform"
            title="Lower"
          >
            -Y
          </button>
        </div>
      </div>
    </Html>
  );
};
