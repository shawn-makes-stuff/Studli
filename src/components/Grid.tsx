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
const TOUCH_TAP_MAX_DISTANCE = 10;
const TOUCH_TAP_MAX_TIME = 300;

export const Grid = () => {
  const planeRef = useRef<THREE.Mesh>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number; id: number; moved: boolean } | null>(null);

  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const useDefaultColor = useBrickStore((state) => state.useDefaultColor);
  const rotation = useBrickStore((state) => state.rotation);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const raycastHit = useBrickStore((state) => state.raycastHit);
  const addBrick = useBrickStore((state) => state.addBrick);
  const addToRecentBricks = useBrickStore((state) => state.addToRecentBricks);

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

  const handlePlace = () => {
    if (selectedBrickType && raycastHit) {
      const effectiveColor = useDefaultColor ? selectedBrickType.color : selectedColor;
      let targetX = raycastHit.position[0];
      let targetZ = raycastHit.position[2];

      // If hitting a side face, offset the placement position
      if (raycastHit.isTopFace === false && !raycastHit.hitGround) {
        const offsetDistance = STUD_SPACING / 2;
        targetX += raycastHit.normal[0] * offsetDistance;
        targetZ += raycastHit.normal[2] * offsetDistance;
      }

      const [snappedX, snappedZ] = snapToGrid(
        targetX,
        targetZ,
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

      if (!result.isValid) return;

      addBrick({
        id: uuidv4(),
        typeId: selectedBrickType.id,
        position: [snappedX, result.bottomY + height / 2, snappedZ],
        color: effectiveColor,
        rotation: rotation
      });

      addToRecentBricks(selectedBrickType);
    }
  };

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
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button === 2) {
            return; // let right click pass through
          }
          e.stopPropagation();
          if (e.pointerType === 'touch') {
            touchStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              time: performance.now(),
              id: e.pointerId,
              moved: false
            };
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (e.pointerType === 'touch' && touchStartRef.current && touchStartRef.current.id === e.pointerId) {
            const elapsed = performance.now() - touchStartRef.current.time;
            const dx = e.clientX - touchStartRef.current.x;
            const dy = e.clientY - touchStartRef.current.y;
            const dist = Math.hypot(dx, dy);
            const moved = touchStartRef.current.moved || dist > TOUCH_TAP_MAX_DISTANCE;
            touchStartRef.current = null;
            if (!moved && elapsed <= TOUCH_TAP_MAX_TIME) {
              handlePlace();
              return;
            }
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch' && touchStartRef.current && touchStartRef.current.id === e.pointerId) {
            const dx = e.clientX - touchStartRef.current.x;
            const dy = e.clientY - touchStartRef.current.y;
            if (Math.hypot(dx, dy) > TOUCH_TAP_MAX_DISTANCE) {
              touchStartRef.current = { ...touchStartRef.current, moved: true };
            }
          }
        }}
        onPointerCancel={() => {
          touchStartRef.current = null;
        }}
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
