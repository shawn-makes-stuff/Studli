import { useMemo } from 'react';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickHeight,
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { snapToGrid, getLayerPosition } from '../utils/snapToGrid';
import { getCachedSlopeGeometry, getCachedCornerSlopeGeometry, calculateStudPositions, getStudGeometry } from '../utils/geometry';

export const BrickPreview = () => {
  const raycastHit = useBrickStore((state) => state.raycastHit);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const useDefaultColor = useBrickStore((state) => state.useDefaultColor);
  const rotation = useBrickStore((state) => state.rotation);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const placedBricks = useBrickStore((state) => state.placedBricks);

  const width = (selectedBrickType?.studsX ?? 1) * STUD_SPACING;
  const depth = (selectedBrickType?.studsZ ?? 1) * STUD_SPACING;
  const height = selectedBrickType ? getBrickHeight(selectedBrickType.variant) : 1;
  const isSlope = selectedBrickType?.variant === 'slope';
  const isCornerSlope = selectedBrickType?.variant === 'corner-slope';
  const isInverted = selectedBrickType?.isInverted ?? false;

  // Calculate preview position and validity
  const previewData = useMemo(() => {
    if (!raycastHit || !selectedBrickType) return null;

    let targetX = raycastHit.position[0];
    let targetZ = raycastHit.position[2];

    // If hitting a side face, offset the placement position
    if (raycastHit.isTopFace === false && !raycastHit.hitGround) {
      // Place adjacent to the side we're looking at
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

    return {
      position: [snappedX, result.bottomY, snappedZ] as [number, number, number],
      isValid: result.isValid
    };
  }, [raycastHit, selectedBrickType, rotation, layerOffset, placedBricks, height]);

  // Get cached slope geometry
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

  // Calculate stud positions
  const studPositions = useMemo(() => {
    if (!selectedBrickType) return [];
    return calculateStudPositions(selectedBrickType.studsX, selectedBrickType.studsZ, depth, selectedBrickType.variant, isInverted);
  }, [selectedBrickType, depth, isInverted]);

  // Don't render if no selection or no valid raycast
  if (!selectedBrickType || !previewData) return null;

  const effectiveColor = useDefaultColor ? selectedBrickType.color : selectedColor;
  const previewColor = previewData.isValid ? effectiveColor : '#ff0000';
  const opacity = previewData.isValid ? 0.6 : 0.4;

  return (
    <group
      position={[previewData.position[0], previewData.position[1] + height / 2, previewData.position[2]]}
      rotation={[0, rotation * Math.PI / 2, 0]}
      userData={{ ignoreRaycast: true }}
    >
      {/* Main brick body */}
      {isSlope && slopeGeometry ? (
        <mesh key="preview-slope" geometry={slopeGeometry}>
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ) : isCornerSlope && cornerSlopeGeometry ? (
        <mesh key="preview-corner-slope" geometry={cornerSlopeGeometry}>
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ) : (
        <mesh key="preview-box">
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Studs - using shared geometry */}
      {studPositions.map(([x, z], index) => (
        <mesh key={index} geometry={studGeometry} position={[x, height / 2 + STUD_HEIGHT / 2, z]}>
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
