import { useMemo } from 'react';
import * as THREE from 'three';
import { useBrickStore } from '../store/useBrickStore';
import { getBrickType, getBrickHeight, STUD_SPACING } from '../types/brick';

const Arrow = ({
  position,
  rotation,
  color,
  onClick
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  onClick: (e: THREE.Event) => void;
}) => (
  <group position={position} rotation={rotation} onPointerDown={(e) => { e.stopPropagation(); onClick(e); }}>
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
  const clearLastPlaced = useBrickStore((state) => state.clearLastPlaced);
  const mode = useBrickStore((state) => state.mode);

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
  const scale = Math.max(brickType.studsX, brickType.studsZ) * 0.8 + 0.6;
  const offset = Math.max(brickType.studsX, brickType.studsZ) * STUD_SPACING * 0.5 + 0.6;

  return (
    <group position={targetBrick.position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#666" emissiveIntensity={0.3} />
      </mesh>

      {/* +X */}
      <Arrow
        position={[offset, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        color="#4ade80"
        onClick={() => nudgeLastPlaced(stepXZ, 0, 0)}
      />
      {/* -X */}
      <Arrow
        position={[-offset, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        color="#f87171"
        onClick={() => nudgeLastPlaced(-stepXZ, 0, 0)}
      />
      {/* +Z */}
      <Arrow
        position={[0, 0, offset]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#60a5fa"
        onClick={() => nudgeLastPlaced(0, 0, stepXZ)}
      />
      {/* -Z */}
      <Arrow
        position={[0, 0, -offset]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#facc15"
        onClick={() => nudgeLastPlaced(0, 0, -stepXZ)}
      />
      {/* +Y */}
      <Arrow
        position={[0, offset, 0]}
        rotation={[0, 0, 0]}
        color="#a78bfa"
        onClick={() => nudgeLastPlaced(0, stepY, 0)}
      />
      {/* -Y */}
      <Arrow
        position={[0, -offset, 0]}
        rotation={[Math.PI, 0, 0]}
        color="#38bdf8"
        onClick={() => nudgeLastPlaced(0, -stepY, 0)}
      />
    </group>
  );
};
