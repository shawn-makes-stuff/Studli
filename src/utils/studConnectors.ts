import * as THREE from 'three';
import {
  SIDE_STUD_NEG_X,
  SIDE_STUD_NEG_Z,
  SIDE_STUD_POS_X,
  SIDE_STUD_POS_Z,
  STUD_SPACING,
  type PlacedBrick,
  getBrickHeight,
  getBrickType,
  hasStuds,
} from '../types/brick';
import { getBrickQuaternion } from './brickTransform';
import { calculateStudPositions } from './studPositions';

export type StudConnector = {
  position: [number, number, number]; // world position on the brick surface
  direction: [number, number, number]; // world outward direction of the stud
};

const toTuple3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

export const getStudConnectors = (brick: PlacedBrick): StudConnector[] => {
  const brickType = getBrickType(brick.typeId);
  if (!brickType) return [];

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;

  const q = getBrickQuaternion(brick.orientation, brick.rotation);
  const center = new THREE.Vector3(brick.position[0], brick.position[1], brick.position[2]);

  const connectors: StudConnector[] = [];

  // Regular top studs (local +Y face)
  if (hasStuds(brickType.variant)) {
    const localStuds = calculateStudPositions(
      brickType.studsX,
      brickType.studsZ,
      depth,
      brickType.variant,
      brickType.isInverted ?? false,
    );
    const localDir = new THREE.Vector3(0, 1, 0);
    const worldDir = localDir.clone().applyQuaternion(q).normalize();

    for (const [x, z] of localStuds) {
      const localPos = new THREE.Vector3(x, height / 2, z);
      const worldPos = localPos.applyQuaternion(q).add(center);
      connectors.push({ position: toTuple3(worldPos), direction: toTuple3(worldDir) });
    }
  }

  // SNOT side studs (local +/-X or +/-Z faces)
  const mask = brickType.sideStudMask ?? 0;
  if (mask !== 0) {
    const candidates: Array<{ pos: THREE.Vector3; dir: THREE.Vector3 }> = [];
    if (mask & SIDE_STUD_POS_X) candidates.push({ pos: new THREE.Vector3(width / 2, 0, 0), dir: new THREE.Vector3(1, 0, 0) });
    if (mask & SIDE_STUD_NEG_X) candidates.push({ pos: new THREE.Vector3(-width / 2, 0, 0), dir: new THREE.Vector3(-1, 0, 0) });
    if (mask & SIDE_STUD_POS_Z) candidates.push({ pos: new THREE.Vector3(0, 0, depth / 2), dir: new THREE.Vector3(0, 0, 1) });
    if (mask & SIDE_STUD_NEG_Z) candidates.push({ pos: new THREE.Vector3(0, 0, -depth / 2), dir: new THREE.Vector3(0, 0, -1) });

    for (const c of candidates) {
      const worldPos = c.pos.clone().applyQuaternion(q).add(center);
      const worldDir = c.dir.clone().applyQuaternion(q).normalize();
      connectors.push({ position: toTuple3(worldPos), direction: toTuple3(worldDir) });
    }
  }

  return connectors;
};

export const findNearestStudConnectorOnFace = (
  brick: PlacedBrick,
  hitPoint: [number, number, number],
  hitNormal: [number, number, number],
  directionDotThreshold = 0.85,
): StudConnector | null => {
  const studs = getStudConnectors(brick);
  if (studs.length === 0) return null;

  const n = new THREE.Vector3(hitNormal[0], hitNormal[1], hitNormal[2]).normalize();
  const p = new THREE.Vector3(hitPoint[0], hitPoint[1], hitPoint[2]);

  let best: StudConnector | null = null;
  let bestDistSq = Infinity;

  for (const s of studs) {
    const d = new THREE.Vector3(s.direction[0], s.direction[1], s.direction[2]).normalize();
    if (d.dot(n) < directionDotThreshold) continue;

    const sp = new THREE.Vector3(s.position[0], s.position[1], s.position[2]);
    const distSq = sp.distanceToSquared(p);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = s;
    }
  }

  return best;
};

