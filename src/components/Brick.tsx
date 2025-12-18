import { useMemo } from 'react';
import * as THREE from 'three';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
  PlacedBrick
} from '../types/brick';
import {
  calculateStudPositions,
  getCachedBoxGeometry,
  getCachedCornerSlopeGeometry,
  getCachedEdgesGeometry,
  getCachedSlopeGeometry,
  getStudGeometry
} from '../utils/geometry';

interface BrickProps {
  brick: PlacedBrick;
}

export const Brick = ({ brick }: BrickProps) => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return null;

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;
  const isSlope = brickType.variant === 'slope';
  const isCornerSlope = brickType.variant === 'corner-slope';
  const isInverted = brickType.isInverted ?? false;

  const slopeGeometry = useMemo(() => {
    if (!isSlope) return null;
    return getCachedSlopeGeometry(width, height, depth, isInverted);
  }, [isSlope, width, height, depth, isInverted]);

  const cornerSlopeGeometry = useMemo(() => {
    if (!isCornerSlope) return null;
    return getCachedCornerSlopeGeometry(width, height, depth, isInverted);
  }, [isCornerSlope, width, height, depth, isInverted]);

  const boxGeometry = useMemo(() => {
    if (isSlope || isCornerSlope) return null;
    return getCachedBoxGeometry(width, height, depth);
  }, [depth, height, isCornerSlope, isSlope, width]);

  const bodyGeometryKey = isSlope
    ? `slope-${width}-${height}-${depth}-${isInverted}`
    : isCornerSlope
      ? `corner-slope-${width}-${height}-${depth}-${isInverted}`
      : `box-${width}-${height}-${depth}`;

  const bodyGeometry = slopeGeometry ?? cornerSlopeGeometry ?? boxGeometry;

  const cavityEdgesGeometry = useMemo(() => {
    if (!bodyGeometry) return null;
    return getCachedEdgesGeometry(bodyGeometryKey, bodyGeometry);
  }, [bodyGeometry, bodyGeometryKey]);

  const studGeometry = useMemo(() => getStudGeometry(), []);

  const studPositions = useMemo(() => {
    return calculateStudPositions(brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted);
  }, [brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted]);

  return (
    <group
      position={brick.position}
      rotation={[0, brick.rotation * Math.PI / 2, 0]}
      userData={{ placedBrick: brick }}
    >
      {/* Main brick body */}
      {bodyGeometry && (
        <mesh geometry={bodyGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={brick.color} flatShading={isSlope || isCornerSlope} />
        </mesh>
      )}

      {/* Cavity-like edge enhancement (dark valleys + bright ridges) */}
      {cavityEdgesGeometry && (
        <>
          <lineSegments geometry={cavityEdgesGeometry} userData={{ ignoreRaycast: true }} renderOrder={10}>
            <lineBasicMaterial
              color="#000000"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </lineSegments>
          <lineSegments geometry={cavityEdgesGeometry} userData={{ ignoreRaycast: true }} renderOrder={11}>
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.07}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
        </>
      )}

      {/* Studs */}
      {studPositions.map(([x, z], index) => (
        <mesh
          key={index}
          geometry={studGeometry}
          position={[x, height / 2 + STUD_HEIGHT / 2, z]}
          castShadow
          userData={{ isStud: true }}
        >
          <meshStandardMaterial color={brick.color} />
        </mesh>
      ))}
    </group>
  );
};
