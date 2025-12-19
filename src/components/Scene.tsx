import { Canvas } from '@react-three/fiber';
import { Grid } from './Grid';
import { Brick } from './Brick';
import { BrickPreview } from './BrickPreview';
import { useBrickStore } from '../store/useBrickStore';
import { useEffect, useMemo } from 'react';
import { FirstPersonControls } from './FirstPersonControls';
import { BrickDetailCulling } from './BrickDetailCulling';

const BrickLayer = () => {
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const deleteMode = useBrickStore((state) => state.deleteMode);
  const deleteSelectionIds = useBrickStore((state) => state.deleteSelectionIds);

  const deleteSet = useMemo(() => new Set(deleteSelectionIds), [deleteSelectionIds]);

  return (
    <>
      {placedBricks.map((brick) => (
        <Brick key={brick.id} brick={brick} isDeleteSelected={deleteMode && deleteSet.has(brick.id)} />
      ))}
    </>
  );
};

export const Scene = () => {
  const rotatePreview = useBrickStore((state) => state.rotatePreview);
  const undo = useBrickStore((state) => state.undo);
  const redo = useBrickStore((state) => state.redo);
  const menuOpen = useBrickStore((state) => state.menuOpen);
  const deleteMode = useBrickStore((state) => state.deleteMode);

  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const base = window.devicePixelRatio || 1;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const cap = isTouchDevice ? (minDim >= 700 ? 1.15 : 1.25) : 2;
    return Math.max(1, Math.min(base, cap));
  }, [isTouchDevice]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (menuOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            undo();
            return;
          case 'y':
            e.preventDefault();
            redo();
            return;
        }
      }

      // Non-modifier shortcuts
      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          rotatePreview();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, rotatePreview, undo, redo]);

  return (
    <Canvas
      shadows={!isTouchDevice}
      camera={{ position: [0, 8, 15], fov: 70 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      dpr={dpr}
      gl={{
        alpha: false,
        antialias: !isTouchDevice,
        powerPreference: 'high-performance',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow={!isTouchDevice}
        shadow-mapSize={isTouchDevice ? [1024, 1024] : [2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Grid />
      <BrickLayer />
      {!deleteMode && <BrickPreview />}

      <BrickDetailCulling />
      <FirstPersonControls />
    </Canvas>
  );
};
