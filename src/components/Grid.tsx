import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useBrickStore } from '../store/useBrickStore';
import { STUD_SPACING } from '../types/brick';

const DEFAULT_GRID_SIZE = 32;
const EDGE_THRESHOLD = 3; // Expand when within 3 cells of edge
const GRID_COLOR = '#444444';
const BASE_COLOR = '#2a2a2a';

export const Grid = () => {
  const planeRef = useRef<THREE.Mesh>(null);
  const placedBricks = useBrickStore((state) => state.placedBricks);

  // Calculate dynamic grid size based on placed bricks
  const gridSize = useMemo(() => {
    if (placedBricks.length === 0) return DEFAULT_GRID_SIZE;

    // Find the bounds of all placed bricks
    let minX = 0, maxX = 0, minZ = 0, maxZ = 0;

    for (const brick of placedBricks) {
      // Get brick dimensions (approximate as we don't have the full type info here)
      // We'll use the position and assume max 4x4 for safety
      const halfSize = 2 * STUD_SPACING;

      const brickMinX = brick.position[0] - halfSize;
      const brickMaxX = brick.position[0] + halfSize;
      const brickMinZ = brick.position[2] - halfSize;
      const brickMaxZ = brick.position[2] + halfSize;

      minX = Math.min(minX, brickMinX);
      maxX = Math.max(maxX, brickMaxX);
      minZ = Math.min(minZ, brickMinZ);
      maxZ = Math.max(maxZ, brickMaxZ);
    }

    // Calculate needed size with threshold padding
    const neededX = Math.max(Math.abs(minX), Math.abs(maxX)) + (EDGE_THRESHOLD * STUD_SPACING);
    const neededZ = Math.max(Math.abs(minZ), Math.abs(maxZ)) + (EDGE_THRESHOLD * STUD_SPACING);
    const neededSize = Math.max(neededX, neededZ) * 2;

    // Round up to nearest even number (for proper grid alignment) and ensure default minimum
    const size = Math.max(DEFAULT_GRID_SIZE, Math.ceil(neededSize / 2) * 2);

    return size;
  }, [placedBricks]);

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
  };

  return (
    <group>
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        name="grid"
        onContextMenu={handleContextMenu}
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>

      <gridHelper
        args={[gridSize, gridSize, GRID_COLOR, GRID_COLOR]}
        position={[0, 0.01, 0]}
        raycast={() => null}
      />
    </group>
  );
};
