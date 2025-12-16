import { useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useBrickStore } from '../store/useBrickStore';
import { snapToGrid, getLayerPosition } from '../utils/snapToGrid';
import { getBrickHeight } from '../types/brick';
import { v4 as uuidv4 } from 'uuid';

const GRID_SIZE = 32;
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
  const clearSelection = useBrickStore((state) => state.clearSelection);
  const openContextMenu = useBrickStore((state) => state.openContextMenu);
  const mode = useBrickStore((state) => state.mode);
  const ghostValid = useBrickStore((state) => state.ghostValid);
  const cancelMoveOrPaste = useBrickStore((state) => state.cancelMoveOrPaste);
  const confirmMoveOrPaste = useBrickStore((state) => state.confirmMoveOrPaste);

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
        layerOffset
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
    } else if (mode === 'select') {
      // Selection mode - clicking grid clears selection
      clearSelection();
    } else if ((mode === 'move' || mode === 'paste') && ghostValid) {
      // Move or Paste mode - left click places if valid
      confirmMoveOrPaste();
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();

    if (mode === 'select') {
      // Selection mode - show context menu
      openContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
    } else if (mode === 'move' || mode === 'paste') {
      // Move/Paste mode - right click cancels
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
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>

      <gridHelper
        args={[GRID_SIZE, GRID_SIZE, GRID_COLOR, GRID_COLOR]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
};
