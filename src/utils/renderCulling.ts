import * as THREE from 'three';

type BrickDetailEntry = {
  object: THREE.Object3D;
  position: THREE.Vector3;
};

const brickDetailsById = new Map<string, BrickDetailEntry>();

export const registerBrickDetails = (
  brickId: string,
  object: THREE.Object3D,
  position: [number, number, number]
): void => {
  brickDetailsById.set(brickId, {
    object,
    position: new THREE.Vector3(position[0], position[1], position[2]),
  });
};

export const unregisterBrickDetails = (brickId: string): void => {
  brickDetailsById.delete(brickId);
};

export const getBrickDetailEntries = (): IterableIterator<BrickDetailEntry> => {
  return brickDetailsById.values();
};

