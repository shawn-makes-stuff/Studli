import { useMemo } from 'react';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
  PlacedBrick
} from '../types/brick';
import {
  calculateStudPositions,
  getCachedCornerSlopeGeometry,
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
      {isSlope && slopeGeometry ? (
        <mesh geometry={slopeGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={brick.color} flatShading />
        </mesh>
      ) : isCornerSlope && cornerSlopeGeometry ? (
        <mesh geometry={cornerSlopeGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={brick.color} flatShading />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={brick.color} />
        </mesh>
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
