import { useMemo } from 'react';
import {
  STUD_SPACING,
  STUD_RADIUS,
  STUD_HEIGHT,
  getBrickHeight,
  hasStuds
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { snapToGrid, getLayerPosition } from '../utils/snapToGrid';

export const BrickPreview = () => {
  const cursorPosition = useBrickStore((state) => state.cursorPosition);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const rotation = useBrickStore((state) => state.rotation);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const mode = useBrickStore((state) => state.mode);

  // Calculate dimensions (safe even if selectedBrickType is null)
  const originalWidth = (selectedBrickType?.studsX ?? 1) * STUD_SPACING;
  const originalDepth = (selectedBrickType?.studsZ ?? 1) * STUD_SPACING;
  const height = selectedBrickType ? getBrickHeight(selectedBrickType.variant) : 1;
  const showStuds = selectedBrickType ? hasStuds(selectedBrickType.variant) : true;

  // Calculate snapped position reactively (responds to rotation changes)
  // All hooks must be called before any conditional returns
  const previewData = useMemo(() => {
    if (!cursorPosition || !selectedBrickType) return null;

    const [snappedX, snappedZ] = snapToGrid(
      cursorPosition[0],
      cursorPosition[1],
      selectedBrickType.studsX,
      selectedBrickType.studsZ,
      rotation
    );

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

    return {
      position: [snappedX, result.bottomY, snappedZ] as [number, number, number],
      isValid: result.isValid
    };
  }, [cursorPosition, selectedBrickType, rotation, layerOffset, placedBricks, height]);

  // Generate stud positions using ORIGINAL dimensions (before rotation)
  const studPositions = useMemo(() => {
    if (!selectedBrickType || !showStuds) return [];

    const positions: [number, number][] = [];
    const studsX = selectedBrickType.studsX;
    const studsZ = selectedBrickType.studsZ;
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
  }, [selectedBrickType, showStuds]);

  // Now we can have conditional returns after all hooks
  if (mode !== 'build') return null;
  if (!selectedBrickType || !previewData) return null;

  // Use red for invalid placement, selected color for valid
  const previewColor = previewData.isValid ? selectedColor : '#ff0000';
  const opacity = previewData.isValid ? 0.6 : 0.4;

  return (
    <group
      position={[previewData.position[0], previewData.position[1] + height / 2, previewData.position[2]]}
      rotation={[0, rotation * Math.PI / 2, 0]}
    >
      {/* Main brick body - semi-transparent */}
      <mesh>
        <boxGeometry args={[originalWidth, height, originalDepth]} />
        <meshStandardMaterial
          color={previewColor}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Studs - only for bricks and plates */}
      {studPositions.map(([x, z], index) => (
        <mesh
          key={index}
          position={[x, height / 2 + STUD_HEIGHT / 2, z]}
        >
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
};
