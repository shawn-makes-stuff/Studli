import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { getBrickDetailEntries } from '../utils/renderCulling';
import { useBrickStore } from '../store/useBrickStore';

const UPDATE_INTERVAL_S = 0.15;

export const BrickDetailCulling = () => {
  const quality = useBrickStore((state) => state.settings.quality);
  const elapsedRef = useRef(0);
  const cameraPosRef = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current < UPDATE_INTERVAL_S) return;
    elapsedRef.current = 0;

    cameraPosRef.current.copy(state.camera.position);

    const [showDistance, hideDistance] =
      quality === 'low'
        ? [55, 68]
        : quality === 'high'
          ? [105, 125]
          : [80, 95];

    const showDistSq = showDistance * showDistance;
    const hideDistSq = hideDistance * hideDistance;

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
