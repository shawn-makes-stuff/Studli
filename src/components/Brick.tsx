import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import {
  STUD_SPACING,
  STUD_RADIUS,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
  hasStuds,
  PlacedBrick
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';

interface BrickProps {
  brick: PlacedBrick;
  isGhost?: boolean;
  ghostValid?: boolean;
}

export const Brick = ({ brick, isGhost = false, ghostValid = true }: BrickProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const mode = useBrickStore((state) => state.mode);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const toggleBrickSelection = useBrickStore((state) => state.toggleBrickSelection);
  const openContextMenu = useBrickStore((state) => state.openContextMenu);
  const cancelMoveOrPaste = useBrickStore((state) => state.cancelMoveOrPaste);
  const confirmMoveOrPaste = useBrickStore((state) => state.confirmMoveOrPaste);
  const ghostValidState = useBrickStore((state) => state.ghostValid);

  const brickType = getBrickType(brick.typeId);
  if (!brickType) return null;

  const isSelected = !isGhost && selectedBrickIds.has(brick.id);
  const isSelectMode = mode === 'select';

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;
  const showStuds = hasStuds(brickType.variant);

  const studPositions = useMemo(() => {
    if (!showStuds) return [];

    const positions: [number, number][] = [];
    const studsX = brickType.studsX;
    const studsZ = brickType.studsZ;
    const startX = -(studsX - 1) / 2 * STUD_SPACING;
    const startZ = -(studsZ - 1) / 2 * STUD_SPACING;

    for (let x = 0; x < studsX; x++) {
      for (let z = 0; z < studsZ; z++) {
        positions.push([
          startX + x * STUD_SPACING,
          startZ + z * STUD_SPACING
        ]);
      }
    }
    return positions;
  }, [brickType.studsX, brickType.studsZ, showStuds]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode === 'build') {
      // Build mode - don't stop propagation, let Grid handle placement
      return;
    }

    e.stopPropagation();

    if (mode === 'select') {
      // Selection mode - toggle selection
      toggleBrickSelection(brick.id);
    } else if ((mode === 'move' || mode === 'paste') && ghostValidState) {
      // Move/Paste mode - left click places if valid
      confirmMoveOrPaste();
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (isGhost) return;

    if (mode === 'build') {
      // Build mode - don't intercept, allow camera rotation
      return;
    }

    e.stopPropagation();
    e.nativeEvent.preventDefault();

    if (mode === 'select') {
      // If right-clicking an unselected brick, select it first
      if (!isSelected) {
        toggleBrickSelection(brick.id);
      }
      openContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
    } else if (mode === 'move' || mode === 'paste') {
      // Move/Paste mode - right click cancels
      cancelMoveOrPaste();
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (isSelectMode && !isGhost) {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  // Ghost styling
  const opacity = isGhost ? 0.6 : 1;
  const color = isGhost && !ghostValid ? '#ff4444' : brick.color;

  return (
    <group
      ref={groupRef}
      position={brick.position}
      rotation={[0, brick.rotation * Math.PI / 2, 0]}
      onClick={isGhost ? undefined : handleClick}
      onContextMenu={isGhost ? undefined : handleContextMenu}
      onPointerOver={isGhost ? undefined : handlePointerOver}
      onPointerOut={isGhost ? undefined : handlePointerOut}
    >
      <mesh castShadow={!isGhost} receiveShadow={!isGhost}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          transparent={isGhost || isSelected}
          opacity={opacity}
        />
        {isSelected && !isGhost && (
          <Edges
            scale={1.02}
            threshold={15}
            color="#00ffff"
            lineWidth={2}
          />
        )}
      </mesh>

      {/* Only render studs for bricks and plates, not tiles */}
      {studPositions.map(([x, z], index) => (
        <mesh
          key={index}
          position={[x, height / 2 + STUD_HEIGHT / 2, z]}
          castShadow={!isGhost}
        >
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial
            color={color}
            transparent={isGhost || isSelected}
            opacity={opacity}
          />
          {isSelected && !isGhost && (
            <Edges
              scale={1.05}
              threshold={15}
              color="#00ffff"
              lineWidth={2}
            />
          )}
        </mesh>
      ))}
    </group>
  );
};
