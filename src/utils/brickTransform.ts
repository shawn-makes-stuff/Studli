import * as THREE from 'three';
import { BrickOrientation, DEFAULT_BRICK_ORIENTATION } from '../types/brick';

const ORIENTATION_UP: Record<BrickOrientation, THREE.Vector3> = {
  up: new THREE.Vector3(0, 1, 0),
  down: new THREE.Vector3(0, -1, 0),
  posX: new THREE.Vector3(1, 0, 0),
  negX: new THREE.Vector3(-1, 0, 0),
  posZ: new THREE.Vector3(0, 0, 1),
  negZ: new THREE.Vector3(0, 0, -1),
};

export const getUpVector = (orientation?: BrickOrientation) =>
  ORIENTATION_UP[orientation ?? DEFAULT_BRICK_ORIENTATION] ?? ORIENTATION_UP.up;

export const getBrickQuaternion = (orientation?: BrickOrientation, rotationQuarterTurns?: number) => {
  const up = getUpVector(orientation);

  const orient = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up.clone().normalize());
  const spinTurns = ((rotationQuarterTurns ?? 0) % 4 + 4) % 4;
  const spin = new THREE.Quaternion().setFromAxisAngle(up, spinTurns * (Math.PI / 2));
  return spin.multiply(orient);
};

export const normalToOrientation = (normal: [number, number, number]): BrickOrientation => {
  const [x, y, z] = normal;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);

  if (ay >= ax && ay >= az) return y >= 0 ? 'up' : 'down';
  if (ax >= az) return x >= 0 ? 'posX' : 'negX';
  return z >= 0 ? 'posZ' : 'negZ';
};

