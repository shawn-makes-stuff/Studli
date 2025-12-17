import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useBrickStore } from '../store/useBrickStore';
import { snapToGrid, getLayerPosition } from '../utils/snapToGrid';
import { getBrickHeight, STUD_SPACING } from '../types/brick';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_GRID_SIZE = 32;
const EDGE_THRESHOLD = 3; // Expand when within 3 cells of edge
const GRID_COLOR = '#444444';
const BASE_COLOR = '#2a2a2a';

export const Grid = () => {
  const planeRef = useRef<THREE.Mesh>(null);

  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const rotation = useBrickStore((state) => state.rotation);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const setCursorPosition = useBrickStore((state) => state.setCursorPosition);
  const addBrick = useBrickStore((state) => state.addBrick);
  const addToRecentBricks = useBrickStore((state) => state.addToRecentBricks);
  const clearSelection = useBrickStore((state) => state.clearSelection);
  const openContextMenu = useBrickStore((state) => state.openContextMenu);
  const mode = useBrickStore((state) => state.mode);
  const cancelMoveOrPaste = useBrickStore((state) => state.cancelMoveOrPaste);
  const confirmMoveOrPaste = useBrickStore((state) => state.confirmMoveOrPaste);
  const rightClickStart = useBrickStore((state) => state.rightClickStart);
  const setRightClickStart = useBrickStore((state) => state.setRightClickStart);

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

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorPosition([e.point.x, e.point.z]);
  };

  const handlePointerLeave = () => {
    setCursorPosition(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (e.button !== 0) return; // Only left click

    if (mode === 'build' && selectedBrickType) {
      // Build mode - place a brick
      const [snappedX, snappedZ] = snapToGrid(
        e.point.x,
        e.point.z,
        selectedBrickType.studsX,
        selectedBrickType.studsZ,
        rotation
      );

      const height = getBrickHeight(selectedBrickType.variant);

      const result = getLayerPosition(
        snappedX,
        snappedZ,
        selectedBrickType.studsX,
        selectedBrickType.studsZ,
        rotation,
        height,
        placedBricks,
        layerOffset,
        selectedBrickType.variant === 'slope',
        selectedBrickType.isInverted ?? false,
        selectedBrickType.variant === 'corner-slope'
      );

      // Only place brick if position is valid
      if (!result.isValid) return;

      addBrick({
        id: uuidv4(),
        typeId: selectedBrickType.id,
        position: [snappedX, result.bottomY + height / 2, snappedZ],
        color: selectedColor,
        rotation: rotation
      });

      // Add to recent bricks
      addToRecentBricks(selectedBrickType);
    } else if (mode === 'select') {
      // Selection mode - clicking grid clears selection
      clearSelection();
    } else if (mode === 'move' || mode === 'paste') {
      // Move or Paste mode - use existing cursor position from pointer move
      confirmMoveOrPaste();
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();

    // Check if mouse moved significantly (user was orbiting)
    const MOVE_THRESHOLD = 5;
    if (rightClickStart) {
      const dx = e.nativeEvent.clientX - rightClickStart.x;
      const dy = e.nativeEvent.clientY - rightClickStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setRightClickStart(null);

      if (distance > MOVE_THRESHOLD) {
        return;
      }
    }

    if (mode === 'select') {
      openContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
    } else if (mode === 'move' || mode === 'paste') {
      cancelMoveOrPaste();
    }
  };

  return (
    <group>
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>

      <gridHelper
        args={[gridSize, gridSize, GRID_COLOR, GRID_COLOR]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
};
