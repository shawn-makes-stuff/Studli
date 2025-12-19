import { useMemo } from 'react';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { getLayerPosition, snapToGrid } from '../utils/snapToGrid';
import { getBrickBounds } from '../utils/collision';
import {
  getCachedBoxGeometry,
  getCachedCornerSlopeGeometry,
  getCachedRoundedRectGeometry,
  getCachedSlopeGeometry,
  calculateStudPositions,
  getStudGeometry
} from '../utils/geometry';
import { getSelectedConnectionPoint, getBottomConnectionPoints, getTopStudPoints, findNearestLocalPoint } from '../utils/connectionPoints';
import { rotatePoint } from '../utils/math';

export const BrickPreview = () => {
  const raycastHit = useBrickStore((state) => state.raycastHit);
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const useDefaultColor = useBrickStore((state) => state.useDefaultColor);
  const rotation = useBrickStore((state) => state.rotation);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const connectionPointIndex = useBrickStore((state) => state.connectionPointIndex);

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

    const selection = getSelectedConnectionPoint(selectedBrickType, connectionPointIndex);
    if (!selection) return null;

    let targetStudX: number;
    let targetStudZ: number;

    const isAimingUnderBrick = Boolean(raycastHit.hitBrick) && raycastHit.normal[1] < -0.7;
    const shouldTargetBrickConnectionGrid = Boolean(raycastHit.hitBrick) && raycastHit.isTopFace !== false;

    if (shouldTargetBrickConnectionGrid && raycastHit.hitBrick) {
      const hitBrick = raycastHit.hitBrick;
      const hitBrickType = getBrickType(hitBrick.typeId);
      const targetPlanePoints = hitBrickType
        ? (isAimingUnderBrick ? getBottomConnectionPoints(hitBrickType) : getTopStudPoints(hitBrickType))
        : [];

      if (targetPlanePoints.length > 0) {
        const dx = targetX - hitBrick.position[0];
        const dz = targetZ - hitBrick.position[2];
        const [localX, localZ] = rotatePoint(dx, dz, -hitBrick.rotation);
        const nearestLocal = findNearestLocalPoint(localX, localZ, targetPlanePoints);

        if (nearestLocal) {
          const [rx, rz] = rotatePoint(nearestLocal[0], nearestLocal[1], hitBrick.rotation);
          targetStudX = hitBrick.position[0] + rx;
          targetStudZ = hitBrick.position[2] + rz;
        } else {
          [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
        }
      } else {
        [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
      }
    } else {
      [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
    }

    const [selOffsetX, selOffsetZ] = rotatePoint(selection.local[0], selection.local[1], rotation);
    const snappedX = targetStudX - selOffsetX;
    const snappedZ = targetStudZ - selOffsetZ;

    let preferredBottomY: number | undefined;
    if (raycastHit.hitBrick) {
      const bounds = getBrickBounds(raycastHit.hitBrick);
      if (bounds) {
        if (raycastHit.normal[1] < -0.7) {
          preferredBottomY = bounds.bottomY - height;
        } else if (raycastHit.isTopFace) {
          preferredBottomY = bounds.topY;
        }
      }
    } else if (raycastHit.hitGround) {
      preferredBottomY = 0;
    }

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
      selectedBrickType.variant === 'corner-slope',
      preferredBottomY
    );

    return {
      position: [snappedX, result.bottomY, snappedZ] as [number, number, number],
      isValid: result.isValid
    };
  }, [raycastHit, selectedBrickType, rotation, layerOffset, placedBricks, height, connectionPointIndex]);

  const bodyGeometry = useMemo(() => {
    if (!selectedBrickType) return null;
    if (isSlope) return getCachedSlopeGeometry(width, height, depth, isInverted);
    if (isCornerSlope) return getCachedCornerSlopeGeometry(width, height, depth, isInverted);
    if (selectedBrickType.isRound) return getCachedRoundedRectGeometry(width, height, depth);
    return getCachedBoxGeometry(width, height, depth);
  }, [selectedBrickType, isSlope, isCornerSlope, width, height, depth, isInverted]);

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
      {bodyGeometry && (
        <mesh key={`preview-${selectedBrickType.id}`} geometry={bodyGeometry} raycast={() => null}>
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={opacity}
            depthWrite={false}
            flatShading={isSlope || isCornerSlope}
          />
        </mesh>
      )}

      {/* Studs - using shared geometry */}
      {studPositions.map(([x, z], index) => (
        <mesh
          key={index}
          geometry={studGeometry}
          position={[x, height / 2 + STUD_HEIGHT / 2, z]}
          raycast={() => null}
        >
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
