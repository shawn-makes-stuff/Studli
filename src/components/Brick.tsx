import { useEffect, useMemo, useRef } from 'react';
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
import { getBrickQuaternion } from '../utils/brickTransform';

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

  const sideStuds = useMemo(() => {
    const mask = brickType.sideStudMask ?? 0;
    if (mask === 0) return [] as Array<{ position: [number, number, number]; rotation: [number, number, number] }>;

    const studs: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [];
    const xOut = width / 2 + STUD_HEIGHT / 2;
    const zOut = depth / 2 + STUD_HEIGHT / 2;

    if (mask & SIDE_STUD_POS_X) studs.push({ position: [xOut, 0, 0], rotation: [0, 0, -Math.PI / 2] });
    if (mask & SIDE_STUD_NEG_X) studs.push({ position: [-xOut, 0, 0], rotation: [0, 0, Math.PI / 2] });
    if (mask & SIDE_STUD_POS_Z) studs.push({ position: [0, 0, zOut], rotation: [Math.PI / 2, 0, 0] });
    if (mask & SIDE_STUD_NEG_Z) studs.push({ position: [0, 0, -zOut], rotation: [-Math.PI / 2, 0, 0] });

    return studs;
  }, [brickType.sideStudMask, depth, width]);

  const totalStudCount = studPositions.length + sideStuds.length;

  // Keep stud instances in a single draw call
  useEffect(() => {
    const studs = studsRef.current;
    if (!studs) return;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (const [x, z] of studPositions) {
      dummy.position.set(x, height / 2 + STUD_HEIGHT / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      studs.setMatrixAt(idx++, dummy.matrix);
    }

    for (const s of sideStuds) {
      dummy.position.set(s.position[0], s.position[1], s.position[2]);
      dummy.rotation.set(s.rotation[0], s.rotation[1], s.rotation[2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      studs.setMatrixAt(idx++, dummy.matrix);
    }

    studs.instanceMatrix.needsUpdate = true;
  }, [height, sideStuds, studPositions]);

  const brickQuat = useMemo(() => getBrickQuaternion(brick.orientation, brick.rotation), [brick.orientation, brick.rotation]);

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
      quaternion={brickQuat}
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
          {totalStudCount > 0 && (
            <instancedMesh
              ref={studsRef}
              args={[studGeometry, undefined, totalStudCount]}
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
