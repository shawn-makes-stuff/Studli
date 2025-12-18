import { Canvas } from '@react-three/fiber';
import { Grid } from './Grid';
import { Brick } from './Brick';
import { BrickPreview } from './BrickPreview';
import { useBrickStore } from '../store/useBrickStore';
import { useEffect } from 'react';
import { FirstPersonControls } from './FirstPersonControls';

const BrickLayer = () => {
  const placedBricks = useBrickStore((state) => state.placedBricks);

  return (
    <>
      {placedBricks.map((brick) => (
        <Brick key={brick.id} brick={brick} />
      ))}
    </>
  );
};

export const Scene = () => {
  const rotatePreview = useBrickStore((state) => state.rotatePreview);
  const undo = useBrickStore((state) => state.undo);
  const redo = useBrickStore((state) => state.redo);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [rotatePreview, undo, redo]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 15], fov: 70 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      gl={{ alpha: false }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Grid />
      <BrickLayer />
      <BrickPreview />

      <FirstPersonControls />
    </Canvas>
  );
};
