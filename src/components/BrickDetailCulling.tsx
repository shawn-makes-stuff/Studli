import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { getBrickDetailEntries } from '../utils/renderCulling';

const UPDATE_INTERVAL_S = 0.15;
const DETAILS_SHOW_DISTANCE = 80;
const DETAILS_HIDE_DISTANCE = 95;

export const BrickDetailCulling = () => {
  const elapsedRef = useRef(0);
  const cameraPosRef = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current < UPDATE_INTERVAL_S) return;
    elapsedRef.current = 0;

    cameraPosRef.current.copy(state.camera.position);

    const showDistSq = DETAILS_SHOW_DISTANCE * DETAILS_SHOW_DISTANCE;
    const hideDistSq = DETAILS_HIDE_DISTANCE * DETAILS_HIDE_DISTANCE;

    for (const entry of getBrickDetailEntries()) {
      const distSq = cameraPosRef.current.distanceToSquared(entry.position);

      if (entry.object.visible) {
        if (distSq > hideDistSq) entry.object.visible = false;
      } else {
        if (distSq < showDistSq) entry.object.visible = true;
      }
    }
  });

  return null;
};

