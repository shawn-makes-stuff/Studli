import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickType,
  getBrickHeight,
  PlacedBrick
} from '../types/brick';
import { registerBrickDetails, unregisterBrickDetails } from '../utils/renderCulling';
import {
  calculateStudPositions,
  getCachedBoxGeometry,
  getCachedRoundedRectGeometry,
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

  const detailsGroupRef = useRef<THREE.Group>(null);
  const studsRef = useRef<THREE.InstancedMesh>(null);
  const [posX, posY, posZ] = brick.position;

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;
  const isSlope = brickType.variant === 'slope';
  const isCornerSlope = brickType.variant === 'corner-slope';
  const isInverted = brickType.isInverted ?? false;
  const isRound = brickType.isRound === true && !isSlope && !isCornerSlope;

  const slopeGeometry = useMemo(() => {
    if (!isSlope) return null;
    return getCachedSlopeGeometry(width, height, depth, isInverted);
  }, [isSlope, width, height, depth, isInverted]);

  const cornerSlopeGeometry = useMemo(() => {
    if (!isCornerSlope) return null;
    return getCachedCornerSlopeGeometry(width, height, depth, isInverted);
  }, [isCornerSlope, width, height, depth, isInverted]);

  const roundedRectGeometry = useMemo(() => {
    if (!isRound) return null;
    return getCachedRoundedRectGeometry(width, height, depth);
  }, [depth, height, isRound, width]);

  const boxGeometry = useMemo(() => {
    if (isSlope || isCornerSlope || isRound) return null;
    return getCachedBoxGeometry(width, height, depth);
  }, [depth, height, isCornerSlope, isRound, isSlope, width]);

  const bodyGeometryKey = isSlope
    ? `slope-${width}-${height}-${depth}-${isInverted}`
    : isCornerSlope
      ? `corner-slope-${width}-${height}-${depth}-${isInverted}`
      : isRound
        ? `rounded-rect-${width}-${height}-${depth}`
        : `box-${width}-${height}-${depth}`;

  const bodyGeometry = slopeGeometry ?? cornerSlopeGeometry ?? roundedRectGeometry ?? boxGeometry;

  const cavityEdgesGeometry = useMemo(() => {
    if (!bodyGeometry) return null;
    return getCachedEdgesGeometry(bodyGeometryKey, bodyGeometry);
  }, [bodyGeometry, bodyGeometryKey]);

  const studGeometry = useMemo(() => getStudGeometry(), []);

  const studPositions = useMemo(() => {
    return calculateStudPositions(brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted);
  }, [brickType.studsX, brickType.studsZ, depth, brickType.variant, isInverted]);

  // Keep stud instances in a single draw call
  useEffect(() => {
    const studs = studsRef.current;
    if (!studs) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < studPositions.length; i++) {
      const [x, z] = studPositions[i];
      dummy.position.set(x, height / 2 + STUD_HEIGHT / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      studs.setMatrixAt(i, dummy.matrix);
    }

    studs.instanceMatrix.needsUpdate = true;
  }, [height, studPositions]);

  // Register this brick's expensive "detail" group so we can distance-cull it globally.
  useEffect(() => {
    const detailsGroup = detailsGroupRef.current;
    if (!detailsGroup) return;

    registerBrickDetails(brick.id, detailsGroup, [posX, posY, posZ]);
    return () => unregisterBrickDetails(brick.id);
  }, [brick.id, posX, posY, posZ]);

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

      {/* Expensive details: cavity edges + studs (distance culled) */}
      {(cavityEdgesGeometry || studPositions.length > 0) && (
        <group ref={detailsGroupRef}>
          {/* Cavity-like edge enhancement (dark valleys + bright ridges) */}
          {cavityEdgesGeometry && (
            <>
              <lineSegments
                geometry={cavityEdgesGeometry}
                userData={{ ignoreRaycast: true }}
                renderOrder={10}
                raycast={() => null}
              >
                <lineBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
              </lineSegments>
              <lineSegments
                geometry={cavityEdgesGeometry}
                userData={{ ignoreRaycast: true }}
                renderOrder={11}
                raycast={() => null}
              >
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

          {/* Studs (instanced) */}
          {studPositions.length > 0 && (
            <instancedMesh
              ref={studsRef}
              args={[studGeometry, undefined, studPositions.length]}
              userData={{ isStud: true }}
              raycast={() => null}
            >
              <meshStandardMaterial color={brick.color} />
            </instancedMesh>
          )}
        </group>
      )}
    </group>
  );
};
