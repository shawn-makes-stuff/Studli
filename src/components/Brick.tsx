import { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
  PlacedBrick
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { getCachedSlopeGeometry, getCachedCornerSlopeGeometry, calculateStudPositions, getStudGeometry } from '../utils/geometry';

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
  const setCursorPosition = useBrickStore((state) => state.setCursorPosition);
  const rightClickStart = useBrickStore((state) => state.rightClickStart);
  const setRightClickStart = useBrickStore((state) => state.setRightClickStart);

  const brickType = getBrickType(brick.typeId);
  if (!brickType) return null;

  const isSelected = !isGhost && selectedBrickIds.has(brick.id);
  const isSelectMode = mode === 'select';

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;
  const isSlope = brickType.variant === 'slope';
  const isCornerSlope = brickType.variant === 'corner-slope';
  const isInverted = brickType.isInverted ?? false;

  // Get cached slope geometry (shared across same-sized slopes)
  const slopeGeometry = useMemo(() => {
    if (!isSlope) return null;
    return getCachedSlopeGeometry(width, height, depth, isInverted);
  }, [isSlope, width, height, depth, isInverted]);

  // Get cached corner slope geometry
  const cornerSlopeGeometry = useMemo(() => {
    if (!isCornerSlope) return null;
    return getCachedCornerSlopeGeometry(width, height, depth, isInverted);
  }, [isCornerSlope, width, height, depth, isInverted]);

  // Get shared stud geometry
  const studGeometry = useMemo(() => getStudGeometry(), []);

  // Calculate stud positions based on brick type
  const studPositions = useMemo(() => {
    return calculateStudPositions(brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted);
  }, [brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode === 'build') return;
    e.stopPropagation();

    if (mode === 'select') {
      toggleBrickSelection(brick.id);
    } else if (mode === 'move' || mode === 'paste') {
      // Use existing cursor position (from pointer move) - don't update from click point
      // as it may be on a brick surface at a different XZ than the ghost preview
      confirmMoveOrPaste();
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (isGhost) return;
    if (mode === 'build') return;

    e.stopPropagation();
    e.nativeEvent.preventDefault();

    // Check if mouse moved significantly (user was orbiting)
    const MOVE_THRESHOLD = 5; // pixels
    if (rightClickStart) {
      const dx = e.nativeEvent.clientX - rightClickStart.x;
      const dy = e.nativeEvent.clientY - rightClickStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setRightClickStart(null);

      if (distance > MOVE_THRESHOLD) {
        // User was orbiting, don't show context menu
        return;
      }
    }

    if (mode === 'select') {
      if (!isSelected) {
        toggleBrickSelection(brick.id);
      }
      openContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
    } else if (mode === 'move' || mode === 'paste') {
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

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // Update cursor position when hovering over bricks during move/paste mode
    // This ensures ghosts track correctly even when not over the grid
    if (mode === 'move' || mode === 'paste') {
      setCursorPosition([e.point.x, e.point.z]);
    }
  };

  // Material properties
  const opacity = isGhost ? (ghostValid ? 0.6 : 0.4) : 1;
  const color = isGhost && !ghostValid ? '#ff4444' : brick.color;
  const isTransparent = isGhost || isSelected;

  // Disable raycasting for ghost bricks so pointer events pass through to real bricks/grid
  const noRaycast = useCallback(() => null, []);

  return (
    <group
      ref={groupRef}
      position={brick.position}
      rotation={[0, brick.rotation * Math.PI / 2, 0]}
      onClick={isGhost ? undefined : handleClick}
      onContextMenu={isGhost ? undefined : handleContextMenu}
      onPointerOver={isGhost ? undefined : handlePointerOver}
      onPointerOut={isGhost ? undefined : handlePointerOut}
      onPointerMove={isGhost ? undefined : handlePointerMove}
      raycast={isGhost ? noRaycast : undefined}
    >
      {/* Main brick body */}
      {isSlope && slopeGeometry ? (
        <mesh
          geometry={slopeGeometry}
          castShadow={!isGhost}
          receiveShadow={!isGhost}
        >
          <meshStandardMaterial
            color={color}
            transparent={isTransparent}
            opacity={opacity}
            depthWrite={!isTransparent}
            flatShading
          />
          {isSelected && !isGhost && (
            <Edges scale={1.02} threshold={15} color="#00ffff" lineWidth={2} />
          )}
        </mesh>
      ) : isCornerSlope && cornerSlopeGeometry ? (
        <mesh
          geometry={cornerSlopeGeometry}
          castShadow={!isGhost}
          receiveShadow={!isGhost}
        >
          <meshStandardMaterial
            color={color}
            transparent={isTransparent}
            opacity={opacity}
            depthWrite={!isTransparent}
            flatShading
          />
          {isSelected && !isGhost && (
            <Edges scale={1.02} threshold={15} color="#00ffff" lineWidth={2} />
          )}
        </mesh>
      ) : (
        <mesh castShadow={!isGhost} receiveShadow={!isGhost}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={color}
            transparent={isTransparent}
            opacity={opacity}
            depthWrite={!isTransparent}
          />
          {isSelected && !isGhost && (
            <Edges scale={1.02} threshold={15} color="#00ffff" lineWidth={2} />
          )}
        </mesh>
      )}

      {/* Studs - using shared geometry */}
      {studPositions.map(([x, z], index) => (
        <mesh
          key={index}
          geometry={studGeometry}
          position={[x, height / 2 + STUD_HEIGHT / 2, z]}
          castShadow={!isGhost}
        >
          <meshStandardMaterial
            color={color}
            transparent={isTransparent}
            opacity={opacity}
            depthWrite={!isTransparent}
          />
          {isSelected && !isGhost && (
            <Edges scale={1.05} threshold={15} color="#00ffff" lineWidth={2} />
          )}
        </mesh>
      ))}
    </group>
  );
};
