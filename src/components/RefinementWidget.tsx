import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { useBrickStore } from '../store/useBrickStore';
import { getBrickType, getBrickHeight, STUD_SPACING } from '../types/brick';

const Arrow = ({
  position,
  rotation,
  color,
  onPreDrag,
  onDragStart
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  onPreDrag: () => void;
  onDragStart: () => void;
}) => (
  <group
    position={position}
    rotation={rotation}
    onPointerDown={(e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // Stop native event to prevent OrbitControls from capturing right-click
      e.nativeEvent.stopPropagation();
      e.nativeEvent.preventDefault();
      onPreDrag();
      onDragStart();
    }}
    onClick={(e: ThreeEvent<MouseEvent>) => {
      // Consume click event to prevent it from hitting bricks behind
      e.stopPropagation();
    }}
  >
    <mesh>
      <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[0, 0.45, 0]}>
      <coneGeometry args={[0.16, 0.25, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  </group>
);

export const RefinementWidget = () => {
  const lastPlacedBrickId = useBrickStore((state) => state.lastPlacedBrickId);
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const nudgeLastPlaced = useBrickStore((state) => state.nudgeLastPlaced);
  const mode = useBrickStore((state) => state.mode);
  const { camera, size } = useThree();
  const setOrbitLocked = useBrickStore((state) => state.setOrbitLocked);
  const markSuppressPlacement = useBrickStore((state) => state.markSuppressPlacement);
  const clearLastPlaced = useBrickStore((state) => state.clearLastPlaced);

  const dragRef = useRef<{
    axisStep: THREE.Vector3;
    dir2: THREE.Vector2;
    accum: number;
    pixelsPerStep: number;
  } | null>(null);

  useEffect(() => {
  const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const move = new THREE.Vector2(ev.movementX, -ev.movementY);
      const dot = move.dot(dragRef.current.dir2);
      if (dot === 0) return;
      dragRef.current.accum += dot;
      const steps = Math.trunc(dragRef.current.accum / dragRef.current.pixelsPerStep);
      if (steps !== 0) {
        dragRef.current.accum -= steps * dragRef.current.pixelsPerStep;
        const delta = dragRef.current.axisStep.clone().multiplyScalar(steps);
        nudgeLastPlaced(delta.x, delta.y, delta.z);
      }
    };
    const handleUp = () => {
      dragRef.current = null;
      setOrbitLocked(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [nudgeLastPlaced, setOrbitLocked]);

  const targetBrick = useMemo(
    () => placedBricks.find((b) => b.id === lastPlacedBrickId),
    [placedBricks, lastPlacedBrickId]
  );

  if (!targetBrick || mode === 'move' || mode === 'paste') return null;

  const brickType = getBrickType(targetBrick.typeId);
  if (!brickType) return null;

  const brickHeight = getBrickHeight(brickType.variant);
  const stepXZ = STUD_SPACING;
  const stepY = brickHeight;
  const maxStudSpan = Math.max(brickType.studsX, brickType.studsZ);
  const offset = Math.max(0.9, maxStudSpan * STUD_SPACING * 0.5 + 0.8);
  const scale = Math.max(0.9, Math.min(1.6, maxStudSpan * 0.55 + 0.65));

  const startDrag = (axisVec: THREE.Vector3, stepSize: number) => {
    const center = new THREE.Vector3(...targetBrick.position);
    const axisDir = axisVec.clone().normalize();
    const end = center.clone().add(axisDir);
    const projCenter = center.clone().project(camera);
    const projEnd = end.clone().project(camera);
    const dir2Ndc = new THREE.Vector2(projEnd.x - projCenter.x, projEnd.y - projCenter.y);
    let dir2Px = new THREE.Vector2(
      dir2Ndc.x * (size.width / 2),
      dir2Ndc.y * (size.height / 2)
    );
    if (dir2Px.lengthSq() < 1e-6) {
      dir2Px = new THREE.Vector2(0, 1); // fallback vertical
    }
    const dir2 = dir2Px.clone().normalize();
    const pixelsPerStep = Math.max(10, dir2Px.length() * 0.9);
    dragRef.current = { axisStep: axisDir.multiplyScalar(stepSize), dir2, accum: 0, pixelsPerStep };
  };

  return (
    <group position={targetBrick.position} scale={scale}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          clearLastPlaced();
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          markSuppressPlacement();
        }}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#666" emissiveIntensity={0.3} />
      </mesh>

      {/* +X */}
      <Arrow
        position={[offset, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        color="#4ade80"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(1, 0, 0), stepXZ)}
      />
      {/* -X */}
      <Arrow
        position={[-offset, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        color="#f87171"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(-1, 0, 0), stepXZ)}
      />
      {/* +Z */}
      <Arrow
        position={[0, 0, offset]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#60a5fa"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(0, 0, 1), stepXZ)}
      />
      {/* -Z */}
      <Arrow
        position={[0, 0, -offset]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#facc15"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(0, 0, -1), stepXZ)}
      />
      {/* +Y */}
      <Arrow
        position={[0, offset, 0]}
        rotation={[0, 0, 0]}
        color="#a78bfa"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(0, 1, 0), stepY)}
      />
      {/* -Y */}
      <Arrow
        position={[0, -offset, 0]}
        rotation={[Math.PI, 0, 0]}
        color="#38bdf8"
        onPreDrag={() => { markSuppressPlacement(); setOrbitLocked(true); }}
        onDragStart={() => startDrag(new THREE.Vector3(0, -1, 0), stepY)}
      />
    </group>
  );
};
