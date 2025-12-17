import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Grid } from './Grid';
import { Brick } from './Brick';
import { BrickPreview } from './BrickPreview';
import { GhostPreview } from './GhostPreview';
import { useBrickStore } from '../store/useBrickStore';
import { useEffect } from 'react';
import { RefinementWidget } from './RefinementWidget';

const BrickLayer = () => {
  const placedBricks = useBrickStore((state) => state.placedBricks);
  const mode = useBrickStore((state) => state.mode);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);

  // In move mode, hide the selected bricks (they're shown as ghosts)
  const visibleBricks = mode === 'move'
    ? placedBricks.filter(b => !selectedBrickIds.has(b.id))
    : placedBricks;

  return (
    <>
      {visibleBricks.map((brick) => (
        <Brick key={brick.id} brick={brick} />
      ))}
    </>
  );
};

export const Scene = () => {
  const rotatePreview = useBrickStore((state) => state.rotatePreview);
  const rotateGroup = useBrickStore((state) => state.rotateGroup);
  const rotateSelectedBricks = useBrickStore((state) => state.rotateSelectedBricks);
  const adjustLayer = useBrickStore((state) => state.adjustLayer);
  const undo = useBrickStore((state) => state.undo);
  const redo = useBrickStore((state) => state.redo);
  const copySelection = useBrickStore((state) => state.copySelection);
  const removeBricks = useBrickStore((state) => state.removeBricks);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const selectAllBricks = useBrickStore((state) => state.selectAllBricks);
  const clipboard = useBrickStore((state) => state.clipboard);
  const closeContextMenu = useBrickStore((state) => state.closeContextMenu);
  const setMode = useBrickStore((state) => state.setMode);
  const mode = useBrickStore((state) => state.mode);
  const cancelMoveOrPaste = useBrickStore((state) => state.cancelMoveOrPaste);
  const confirmMoveOrPaste = useBrickStore((state) => state.confirmMoveOrPaste);
  const ghostValid = useBrickStore((state) => state.ghostValid);
  const setRightClickStart = useBrickStore((state) => state.setRightClickStart);
  const clearLastPlaced = useBrickStore((state) => state.clearLastPlaced);
  const lastPlacedBrickId = useBrickStore((state) => state.lastPlacedBrickId);

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
            closeContextMenu();
            return;
          case 'y':
            e.preventDefault();
            redo();
            closeContextMenu();
            return;
          case 'c':
            e.preventDefault();
            if (selectedBrickIds.size > 0) {
              copySelection();
            }
            closeContextMenu();
            return;
          case 'v':
            e.preventDefault();
            if (clipboard.length > 0) {
              setMode('paste');
            }
            closeContextMenu();
            return;
          case 'a':
            e.preventDefault();
            selectAllBricks();
            closeContextMenu();
            return;
        }
      }

      // Non-modifier shortcuts
      switch (e.key.toLowerCase()) {
        case 'r':
          // Rotate based on mode
          if (mode === 'build') {
            rotatePreview();
          } else if (mode === 'move' || mode === 'paste') {
            rotateGroup();
          } else if (mode === 'select' && selectedBrickIds.size > 0) {
            rotateSelectedBricks();
          }
          break;
        case 'w':
        case 'arrowup':
          if (mode === 'build') {
            e.preventDefault();
            adjustLayer(1);
          }
          break;
        case 's':
        case 'arrowdown':
          if (mode === 'build') {
            e.preventDefault();
            adjustLayer(-1);
          }
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          if (selectedBrickIds.size > 0) {
            removeBricks([...selectedBrickIds]);
          }
          closeContextMenu();
          break;
        case 'escape':
          closeContextMenu();
          if (mode === 'move' || mode === 'paste') {
            cancelMoveOrPaste();
          }
          break;
        case 'enter':
          // Confirm move/paste with Enter key
          if ((mode === 'move' || mode === 'paste') && ghostValid) {
            e.preventDefault();
            confirmMoveOrPaste();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotatePreview, rotateGroup, rotateSelectedBricks, adjustLayer, undo, redo, copySelection,
      removeBricks, selectedBrickIds, selectAllBricks, clipboard, closeContextMenu, setMode,
      mode, cancelMoveOrPaste, confirmMoveOrPaste, ghostValid]);

  return (
    <Canvas
      shadows
      camera={{ position: [15, 15, 15], fov: 50 }}
      onPointerDown={(e) => {
        if (e.button === 2) {
          setRightClickStart({ x: e.clientX, y: e.clientY });
        }
      }}
      onPointerMissed={() => {
        if (lastPlacedBrickId) {
          clearLastPlaced();
        }
      }}
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
      {!lastPlacedBrickId && <BrickPreview />}
      <GhostPreview />
      <RefinementWidget />

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1}
        enableDamping
        dampingFactor={0.08}
        panSpeed={0.8}
        zoomSpeed={0.8}
        mouseButtons={{
          LEFT: undefined,
          MIDDLE: 2,
          RIGHT: 0,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,      // one-finger drag to orbit
          TWO: THREE.TOUCH.DOLLY_PAN,   // two-finger pinch to zoom + pan
        }}
      />
    </Canvas>
  );
};
