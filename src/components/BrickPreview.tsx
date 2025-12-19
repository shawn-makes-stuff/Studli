import { useMemo } from 'react';
import * as THREE from 'three';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  SIDE_STUD_POS_X,
  SIDE_STUD_POS_Z,
  SIDE_STUD_NEG_X,
  SIDE_STUD_NEG_Z,
  getBrickType,
  getBrickHeight,
} from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { getLayerPosition, snapToGrid } from '../utils/snapToGrid';
import { checkAabbCollision, checkCollisionWithStuds, checkSideStudCollision, getBrickAabb, getBrickBounds } from '../utils/collision';
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
import { getBrickQuaternion, normalToOrientation } from '../utils/brickTransform';
import { findNearestStudConnectorOnFace } from '../utils/studConnectors';

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

    const targetX = raycastHit.position[0];
    const targetZ = raycastHit.position[2];

    const selection = getSelectedConnectionPoint(selectedBrickType, connectionPointIndex);
    if (!selection) return null;

    const height = getBrickHeight(selectedBrickType.variant);

    // Stud snapping: attach to any stud on the face you're aiming at (supports sideways/downward studs from SNOT).
    if (raycastHit.hitBrick && !raycastHit.hitGround) {
      const hitBrick = raycastHit.hitBrick;
      const stud = findNearestStudConnectorOnFace(hitBrick, raycastHit.position, raycastHit.normal);

      if (stud) {
        const bottomPoints = getBottomConnectionPoints(selectedBrickType);
        if (bottomPoints.length > 0) {
          const idx = ((connectionPointIndex % bottomPoints.length) + bottomPoints.length) % bottomPoints.length;
          const [selX, selZ] = bottomPoints[idx];

          const orientation = normalToOrientation(stud.direction);
          const quat = getBrickQuaternion(orientation, rotation);

          const localPoint = new THREE.Vector3(selX, -height / 2, selZ);
          const worldOffset = localPoint.applyQuaternion(quat);
          const center: [number, number, number] = [
            stud.position[0] - worldOffset.x,
            stud.position[1] - worldOffset.y,
            stud.position[2] - worldOffset.z,
          ];

          const candidate = {
            id: 'preview',
            typeId: selectedBrickType.id,
            position: center,
            color: '',
            rotation,
            orientation,
          };
          const candidateAabb = getBrickAabb(candidate);
          const isValid =
            Boolean(candidateAabb) &&
            candidateAabb!.minY >= -0.01 &&
            !checkAabbCollision(candidateAabb!, placedBricks) &&
            !checkCollisionWithStuds(candidateAabb!, orientation, placedBricks) &&
            !checkSideStudCollision(candidate, placedBricks);

          return {
            center,
            orientation,
            isValid,
          };
        }
      }
    }

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

    const center: [number, number, number] = [snappedX, result.bottomY + height / 2, snappedZ];
    const candidate = {
      id: 'preview',
      typeId: selectedBrickType.id,
      position: center,
      color: '',
      rotation,
    };

    const candidateAabb = getBrickAabb(candidate);

    return {
      center,
      orientation: 'up' as const,
      isValid:
        result.isValid &&
        (!candidateAabb || !checkCollisionWithStuds(candidateAabb, 'up', placedBricks)) &&
        !checkSideStudCollision(candidate, placedBricks),
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

  const previewOrientation = previewData?.orientation ?? 'up';
  const previewQuat = useMemo(() => getBrickQuaternion(previewOrientation, rotation), [previewOrientation, rotation]);

  const sideStuds = useMemo(() => {
    const mask = selectedBrickType?.sideStudMask ?? 0;
    if (!selectedBrickType || mask === 0) {
      return [] as Array<{ position: [number, number, number]; rotation: [number, number, number] }>;
    }

    const studs: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [];
    const xOut = width / 2 + STUD_HEIGHT / 2;
    const zOut = depth / 2 + STUD_HEIGHT / 2;
    if (mask & SIDE_STUD_POS_X) studs.push({ position: [xOut, 0, 0], rotation: [0, 0, -Math.PI / 2] });
    if (mask & SIDE_STUD_NEG_X) studs.push({ position: [-xOut, 0, 0], rotation: [0, 0, Math.PI / 2] });
    if (mask & SIDE_STUD_POS_Z) studs.push({ position: [0, 0, zOut], rotation: [Math.PI / 2, 0, 0] });
    if (mask & SIDE_STUD_NEG_Z) studs.push({ position: [0, 0, -zOut], rotation: [-Math.PI / 2, 0, 0] });
    return studs;
  }, [depth, selectedBrickType, width]);

  // Don't render if no selection or no valid raycast
  if (!selectedBrickType || !previewData) return null;

  const effectiveColor = useDefaultColor ? selectedBrickType.color : selectedColor;
  const previewColor = previewData.isValid ? effectiveColor : '#ff0000';
  const opacity = previewData.isValid ? 0.6 : 0.4;

  return (
    <group
      position={previewData.center}
      quaternion={previewQuat}
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

      {/* Side studs (SNOT bricks) */}
      {sideStuds.map((s, idx) => (
        <mesh
          key={`side-stud-${idx}`}
          geometry={studGeometry}
          position={s.position}
          rotation={s.rotation}
          raycast={() => null}
        >
          <meshStandardMaterial color={previewColor} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};
