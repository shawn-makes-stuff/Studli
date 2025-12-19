import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBrickStore } from '../store/useBrickStore';
import { checkAabbCollision, getBrickAabb, getBrickBounds } from '../utils/collision';
import {
  getBrickType,
  getBrickHeight,
  STUD_SPACING,
  SIDE_STUD_POS_X,
  SIDE_STUD_POS_Z,
  SIDE_STUD_NEG_X,
  SIDE_STUD_NEG_Z,
  type PlacedBrick
} from '../types/brick';
import { getLayerPosition, snapToGrid } from '../utils/snapToGrid';
import { v4 as uuidv4 } from 'uuid';
import { playSfx } from '../utils/sfx';
import { findNearestLocalPoint, getBottomConnectionPoints, getSelectedConnectionPoint, getTopStudPoints } from '../utils/connectionPoints';
import { rotatePoint } from '../utils/math';
import { getBrickQuaternion, normalToOrientation } from '../utils/brickTransform';

const MOVEMENT_SPEED = 5;
const FAST_MOVEMENT_MULTIPLIER = 2;
const COLLISION_RADIUS = 0.4;
const COLLISION_HEIGHT = 1.8;
const RAYCAST_MAX_DISTANCE = 60;
const MIN_FOV = 35;
const MAX_FOV = 120;
const WHEEL_ZOOM_SENSITIVITY = 0.03;
const PINCH_ZOOM_SENSITIVITY = 0.06;
const TOUCH_TAP_MAX_DISTANCE = 10;
const TOUCH_TAP_MAX_TIME = 300;

// Detect actual mobile/tablet devices (including iPad)
const detectMobile = () => {
  // Check for mobile/tablet user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Check for iPad specifically (newer iPads report as MacIntel)
  const isIPad = (navigator.userAgent.includes('Mac') && 'ontouchstart' in window && navigator.maxTouchPoints > 1);

  // Check for small screens with touch
  const isSmallTouch = window.innerWidth <= 1024 && 'ontouchstart' in window;

  return mobileRegex || isIPad || isSmallTouch;
};

export const FirstPersonControls = () => {
  const { camera, gl, scene } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const directionRef = useRef(new THREE.Vector3());
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const isPointerLockedRef = useRef(false);
  const lastPointerLockExitAtRef = useRef(0);
  const escapeDownStartedLockedRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const ndcRef = useRef(new THREE.Vector2(0, 0));
  const pinchRef = useRef<{
    isActive: boolean;
    initialDistance: number;
    initialFov: number;
    idA: number;
    idB: number;
  } | null>(null);
  const tapRef = useRef<{ x: number; y: number; time: number; id: number; moved: boolean } | null>(null);

  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);
  const [moveUp, setMoveUp] = useState(false);
  const [moveDown, setMoveDown] = useState(false);
  const [isFastMove, setIsFastMove] = useState(false);

  const placedBricks = useBrickStore((state) => state.placedBricks);
  const setRaycastHit = useBrickStore((state) => state.setRaycastHit);
  const virtualJoystickInput = useBrickStore((state) => state.virtualJoystickInput);
  const virtualJoystickCamera = useBrickStore((state) => state.virtualJoystickCamera);
  const virtualAscend = useBrickStore((state) => state.virtualAscend);
  const virtualDescend = useBrickStore((state) => state.virtualDescend);
  const uiControlsDisabled = useBrickStore((state) => state.uiControlsDisabled);
  const menuOpen = useBrickStore((state) => state.menuOpen);
  const joystickMoveSensitivity = useBrickStore((state) => state.settings.joystickMoveSensitivity);
  const joystickLookSensitivity = useBrickStore((state) => state.settings.joystickLookSensitivity);
  const isTouchDevice = detectMobile();

  const controlsDisabled = uiControlsDisabled || menuOpen;

  const tryPlaceFromRaycast = () => {
    const state = useBrickStore.getState();
    const selectedBrickType = state.selectedBrickType;
    const raycastHit = state.raycastHit;
    if (!selectedBrickType || !raycastHit) return false;

    const effectiveColor = state.useDefaultColor ? selectedBrickType.color : state.selectedColor;

    let targetX = raycastHit.position[0];
    let targetZ = raycastHit.position[2];

    const selection = getSelectedConnectionPoint(selectedBrickType, state.connectionPointIndex);
    if (!selection) return false;

    // SNOT side-stud snapping: attach to side studs on special bricks (1x1 SNOT variants for now).
    if (raycastHit.hitBrick && raycastHit.isTopFace === false && !raycastHit.hitGround) {
      const hitBrick = raycastHit.hitBrick;
      const hitBrickType = getBrickType(hitBrick.typeId);
      const mask = hitBrickType?.sideStudMask ?? 0;

      const nx = raycastHit.normal[0];
      const nz = raycastHit.normal[2];
      const ax = Math.abs(nx);
      const az = Math.abs(nz);

      if (
        hitBrickType &&
        mask !== 0 &&
        (ax > 0.7 || az > 0.7) &&
        selection.plane === 'bottom' &&
        selectedBrickType.variant !== 'slope' &&
        selectedBrickType.variant !== 'corner-slope'
      ) {
        // Map the hit normal into the hit brick's local space (Y-rotation only).
        const [lnx, lnz] = rotatePoint(nx, nz, -hitBrick.rotation);
        const localFaceBit =
          Math.abs(lnx) > Math.abs(lnz)
            ? (lnx > 0 ? SIDE_STUD_POS_X : SIDE_STUD_NEG_X)
            : (lnz > 0 ? SIDE_STUD_POS_Z : SIDE_STUD_NEG_Z);

        if (mask & localFaceBit) {
          const hitWidth = hitBrickType.studsX * STUD_SPACING;
          const hitDepth = hitBrickType.studsZ * STUD_SPACING;
          const localStud = (() => {
            if (localFaceBit === SIDE_STUD_POS_X) return [hitWidth / 2, 0, 0] as const;
            if (localFaceBit === SIDE_STUD_NEG_X) return [-hitWidth / 2, 0, 0] as const;
            if (localFaceBit === SIDE_STUD_POS_Z) return [0, 0, hitDepth / 2] as const;
            return [0, 0, -hitDepth / 2] as const;
          })();

          const [rx, rz] = rotatePoint(localStud[0], localStud[2], hitBrick.rotation);
          const targetPoint: [number, number, number] = [
            hitBrick.position[0] + rx,
            hitBrick.position[1],
            hitBrick.position[2] + rz
          ];

          const height = getBrickHeight(selectedBrickType.variant);
          const orientation = normalToOrientation([nx, raycastHit.normal[1], nz]);
          const quat = getBrickQuaternion(orientation, state.rotation);
          const localPoint = new THREE.Vector3(selection.local[0], -height / 2, selection.local[1]);
          const worldOffset = localPoint.applyQuaternion(quat);
          const center: [number, number, number] = [
            targetPoint[0] - worldOffset.x,
            targetPoint[1] - worldOffset.y,
            targetPoint[2] - worldOffset.z
          ];

          const candidateAabb = getBrickAabb({
            id: 'candidate',
            typeId: selectedBrickType.id,
            position: center,
            color: effectiveColor,
            rotation: state.rotation,
            orientation
          });

          if (!candidateAabb) return false;
          if (checkAabbCollision(candidateAabb, state.placedBricks)) return false;

          state.addBrick({
            id: uuidv4(),
            typeId: selectedBrickType.id,
            position: center,
            color: effectiveColor,
            rotation: state.rotation,
            orientation
          });

          playSfx('place');
          state.addToRecentBricks(selectedBrickType);
          return true;
        }
      }
    }

    if (raycastHit.isTopFace === false && !raycastHit.hitGround) {
      const offsetDistance = STUD_SPACING / 2;
      targetX += raycastHit.normal[0] * offsetDistance;
      targetZ += raycastHit.normal[2] * offsetDistance;
    }

    let targetStudX: number;
    let targetStudZ: number;

    const isAimingUnderBrick = Boolean(raycastHit.hitBrick) && raycastHit.normal[1] < -0.7;
    const shouldTargetBrickConnectionGrid = Boolean(raycastHit.hitBrick) && raycastHit.isTopFace !== false;

    if (shouldTargetBrickConnectionGrid && raycastHit.hitBrick) {
      const hitBrick = raycastHit.hitBrick;
      const hitBrickType = getBrickType(hitBrick.typeId);
      const targetPlanePoints = hitBrickType
        ? (isAimingUnderBrick ? getBottomConnectionPoints(hitBrickType) : getTopStudPoints(hitBrickType))
        : [];

      if (targetPlanePoints.length > 0) {
        const dx = targetX - hitBrick.position[0];
        const dz = targetZ - hitBrick.position[2];
        const [localX, localZ] = rotatePoint(dx, dz, -hitBrick.rotation);
        const nearestLocal = findNearestLocalPoint(localX, localZ, targetPlanePoints);

        if (nearestLocal) {
          const [rx, rz] = rotatePoint(nearestLocal[0], nearestLocal[1], hitBrick.rotation);
          targetStudX = hitBrick.position[0] + rx;
          targetStudZ = hitBrick.position[2] + rz;
        } else {
          [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
        }
      } else {
        [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
      }
    } else {
      [targetStudX, targetStudZ] = snapToGrid(targetX, targetZ, 1, 1, 0);
    }

    const [selOffsetX, selOffsetZ] = rotatePoint(selection.local[0], selection.local[1], state.rotation);
    const snappedX = targetStudX - selOffsetX;
    const snappedZ = targetStudZ - selOffsetZ;

    const height = getBrickHeight(selectedBrickType.variant);

    let preferredBottomY: number | undefined;
    if (raycastHit.hitBrick) {
      const bounds = getBrickBounds(raycastHit.hitBrick);
      if (bounds) {
        if (raycastHit.normal[1] < -0.7) {
          preferredBottomY = bounds.bottomY - height;
        } else if (raycastHit.isTopFace) {
          preferredBottomY = bounds.topY;
        }
      }
    } else if (raycastHit.hitGround) {
      // If you can see the ground through an opening, prefer placing on the base layer
      // instead of jumping to the topmost valid layer (e.g. above an overhang).
      preferredBottomY = 0;
    }

    const result = getLayerPosition(
      snappedX,
      snappedZ,
      selectedBrickType.studsX,
      selectedBrickType.studsZ,
      state.rotation,
      height,
      state.placedBricks,
      state.layerOffset,
      selectedBrickType.variant === 'slope',
      selectedBrickType.isInverted ?? false,
      selectedBrickType.variant === 'corner-slope',
      preferredBottomY
    );

    if (!result.isValid) return false;

    state.addBrick({
      id: uuidv4(),
      typeId: selectedBrickType.id,
      position: [snappedX, result.bottomY + height / 2, snappedZ],
      color: effectiveColor,
      rotation: state.rotation
    });

    playSfx('place');
    state.addToRecentBricks(selectedBrickType);
    return true;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const allowDesktopMovement = isPointerLockedRef.current;

      switch (event.code) {
        case 'KeyC':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          useBrickStore.getState().cycleConnectionPoint();
          break;
        case 'KeyW':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveForward(true);
          break;
        case 'KeyS':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveBackward(true);
          break;
        case 'KeyA':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveLeft(true);
          break;
        case 'KeyD':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveRight(true);
          break;
        case 'Space':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveUp(true);
          break;
        case 'ControlLeft':
        case 'ControlRight':
          if (!isTouchDevice && !allowDesktopMovement) return;
          if (allowDesktopMovement) event.preventDefault();
          setMoveDown(true);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (!isTouchDevice && !allowDesktopMovement) return;
          setIsFastMove(true);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const allowDesktopMovement = isPointerLockedRef.current;
      switch (event.code) {
        case 'KeyW':
          if (allowDesktopMovement) event.preventDefault();
          setMoveForward(false);
          break;
        case 'KeyS':
          if (allowDesktopMovement) event.preventDefault();
          setMoveBackward(false);
          break;
        case 'KeyA':
          if (allowDesktopMovement) event.preventDefault();
          setMoveLeft(false);
          break;
        case 'KeyD':
          if (allowDesktopMovement) event.preventDefault();
          setMoveRight(false);
          break;
        case 'Space':
          if (allowDesktopMovement) event.preventDefault();
          setMoveUp(false);
          break;
        case 'ControlLeft':
        case 'ControlRight':
          if (allowDesktopMovement) event.preventDefault();
          setMoveDown(false);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setIsFastMove(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTouchDevice]);

  // Mouse wheel zoom (desktop only)
  useEffect(() => {
    if (isTouchDevice) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const handleWheel = (event: WheelEvent) => {
      const isLockedToCanvas = document.pointerLockElement === gl.domElement;
      const isCanvasTarget = event.target === gl.domElement;
      if (!isLockedToCanvas && !isCanvasTarget) return;

      // Convert wheel delta into pixels
      const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
      const deltaPixels = event.deltaY * deltaMultiplier;

      const nextFov = clamp(camera.fov + deltaPixels * WHEEL_ZOOM_SENSITIVITY, MIN_FOV, MAX_FOV);
      if (nextFov === camera.fov) return;

      camera.fov = nextFov;
      camera.updateProjectionMatrix();
      event.preventDefault();
    };

    // Use document listener so wheel works while pointer-locked too.
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, [camera, gl.domElement, isTouchDevice]);

  // Left click to place/confirm while pointer-locked (desktop only).
  // This avoids relying on pointer hit-testing (which can be stale/unrelated in pointer lock).
  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (document.pointerLockElement !== gl.domElement) return;
      tryPlaceFromRaycast();
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
    };
  }, [gl.domElement, isTouchDevice]);

  // Tap to place (touch devices)
  useEffect(() => {
    if (!isTouchDevice) return;

    const el = gl.domElement;

    const handleTouchStart = (event: TouchEvent) => {
      if (controlsDisabled) return;
      if (event.touches.length !== 1) {
        tapRef.current = null;
        return;
      }

      const touch = event.touches[0];
      tapRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
        id: touch.identifier,
        moved: false
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (controlsDisabled) return;
      const start = tapRef.current;
      if (!start) return;
      if (event.touches.length !== 1) {
        tapRef.current = null;
        return;
      }
      const touch = Array.from(event.touches).find((t) => t.identifier === start.id);
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.hypot(dx, dy) > TOUCH_TAP_MAX_DISTANCE) {
        tapRef.current = { ...start, moved: true };
      }
    };

    const handleTouchEndOrCancel = (event: TouchEvent) => {
      if (controlsDisabled) {
        tapRef.current = null;
        return;
      }
      const start = tapRef.current;
      if (!start) return;

      const touch = Array.from(event.changedTouches).find((t) => t.identifier === start.id);
      if (!touch) return;

      tapRef.current = null;

      // Ignore taps that were part of a pinch gesture
      if (pinchRef.current?.isActive) return;

      const elapsed = performance.now() - start.time;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      const moved = start.moved || dist > TOUCH_TAP_MAX_DISTANCE;
      if (moved || elapsed > TOUCH_TAP_MAX_TIME) return;

      tryPlaceFromRaycast();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    el.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEndOrCancel);
      el.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [controlsDisabled, gl.domElement, isTouchDevice]);

  // Suppress browser shortcuts/scrolling while in build mode (pointer-locked).
  useEffect(() => {
    if (isTouchDevice) return;

    const shouldSuppress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return false;
      }

      if (document.pointerLockElement !== gl.domElement) return false;
      if (event.code === 'Escape') return false;
      return true;
    };

    const handleKeyDownCapture = (event: KeyboardEvent) => {
      if (!shouldSuppress(event)) return;
      event.preventDefault();
    };

    const handleKeyUpCapture = (event: KeyboardEvent) => {
      if (!shouldSuppress(event)) return;
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('keyup', handleKeyUpCapture, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('keyup', handleKeyUpCapture, true);
    };
  }, [gl.domElement, isTouchDevice]);

  // Pinch zoom (touch devices)
  useEffect(() => {
    if (!isTouchDevice) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const getDistance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const getTouchesById = (touches: TouchList, idA: number, idB: number): { a: Touch; b: Touch } | null => {
      let a: Touch | null = null;
      let b: Touch | null = null;
      for (const touch of Array.from(touches)) {
        if (touch.identifier === idA) a = touch;
        else if (touch.identifier === idB) b = touch;
      }
      return a && b ? { a, b } : null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (controlsDisabled) return;
      const touches = event.targetTouches;
      if (touches.length < 2) return;

      const t0 = touches[0];
      const t1 = touches[1];
      pinchRef.current = {
        isActive: true,
        initialDistance: getDistance(t0, t1),
        initialFov: camera.fov,
        idA: t0.identifier,
        idB: t1.identifier
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (controlsDisabled) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      const pinch = pinchRef.current;
      if (!pinch?.isActive) return;

      const touches = event.targetTouches;
      const pair = getTouchesById(touches, pinch.idA, pinch.idB);
      if (!pair) {
        pinchRef.current = null;
        return;
      }

      const distance = getDistance(pair.a, pair.b);
      const delta = distance - pinch.initialDistance;

      // Spread fingers (delta > 0) => zoom in (smaller FOV).
      const nextFov = clamp(pinch.initialFov - delta * PINCH_ZOOM_SENSITIVITY, MIN_FOV, MAX_FOV);
      if (nextFov !== camera.fov) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }

      event.preventDefault();
    };

    const handleTouchEndOrCancel = (event: TouchEvent) => {
      if (controlsDisabled) {
        pinchRef.current = null;
        return;
      }
      const pinch = pinchRef.current;
      if (!pinch?.isActive) return;

      const touches = event.targetTouches;
      if (touches.length < 2) {
        pinchRef.current = null;
      } else {
        // If more than one touch remains on the canvas, restart pinch with the first two.
        const t0 = touches[0];
        const t1 = touches[1];
        pinchRef.current = {
          isActive: true,
          initialDistance: getDistance(t0, t1),
          initialFov: camera.fov,
          idA: t0.identifier,
          idB: t1.identifier
        };
      }
    };

    const el = gl.domElement;
    const previousTouchAction = el.style.touchAction;
    el.style.touchAction = 'none';

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    el.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    return () => {
      el.style.touchAction = previousTouchAction;
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEndOrCancel);
      el.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [camera, controlsDisabled, gl.domElement, isTouchDevice]);

  // Pointer lock management (desktop only)
  useEffect(() => {
    if (isTouchDevice) return;

    const keyboard = (navigator as unknown as {
      keyboard?: { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void };
    }).keyboard;

    const tryLockKeyboard = () => {
      if (!keyboard?.lock) return;
      void keyboard.lock([
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'Space',
        'ShiftLeft',
        'ShiftRight',
        'ControlLeft',
        'ControlRight',
        'KeyC',
        'KeyR',
        'KeyZ',
        'KeyY'
      ]).catch(() => {
        // Ignore (unsupported without fullscreen in many browsers)
      });
    };

    const tryUnlockKeyboard = () => {
      if (!keyboard?.unlock) return;
      try {
        keyboard.unlock();
      } catch {
        // ignore
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setIsPointerLocked(locked);
      isPointerLockedRef.current = locked;
      if (locked) {
        tryLockKeyboard();
      } else {
        tryUnlockKeyboard();
        lastPointerLockExitAtRef.current = performance.now();
        setMoveForward(false);
        setMoveBackward(false);
        setMoveLeft(false);
        setMoveRight(false);
        setMoveUp(false);
        setMoveDown(false);
        setIsFastMove(false);
        velocityRef.current.set(0, 0, 0);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || event.repeat) return;

      // When pointer-locked, Esc is the standard way to release.
      // Track whether this press started while locked so the subsequent keyup
      // doesn't immediately re-lock.
      escapeDownStartedLockedRef.current = isPointerLockedRef.current;

      if (isPointerLockedRef.current) {
        document.exitPointerLock();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;

      // If this Esc press started while locked, treat it as "unlock" only.
      if (escapeDownStartedLockedRef.current) {
        escapeDownStartedLockedRef.current = false;
        return;
      }

      // Never (re)capture the mouse while a menu/popover is open.
      // This keeps Esc from stealing focus when you're interacting with UI.
      const uiState = useBrickStore.getState();
      const popoverBlocksPointerLock = uiState.uiPopoverOpen && uiState.uiPopoverType !== 'brickPicker';
      if (uiState.menuOpen || popoverBlocksPointerLock || uiState.uiControlsDisabled) return;

      // Some browsers release pointer lock before dispatching Esc; avoid re-locking immediately.
      const now = performance.now();
      const justExitedPointerLock = now - lastPointerLockExitAtRef.current < 250;
      if (justExitedPointerLock) return;

      if (!isPointerLockedRef.current) {
        gl.domElement.requestPointerLock();
        tryLockKeyboard();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isPointerLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      const sensitivity = 0.0008;
      camera.rotation.order = 'YXZ';
      camera.rotation.y -= movementX * sensitivity;
      camera.rotation.x -= movementY * sensitivity;

      // Clamp vertical rotation
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isTouchDevice, gl, camera, isPointerLocked]);

  // Camera rotation state for mobile joystick
  const cameraRotationRef = useRef({ x: 0, y: 0 });

  // Check if camera would collide with bricks at given position
  const checkCollision = (newPosition: THREE.Vector3): boolean => {
    const capsuleMin = new THREE.Vector3(
      newPosition.x - COLLISION_RADIUS,
      newPosition.y - COLLISION_HEIGHT / 2,
      newPosition.z - COLLISION_RADIUS
    );
    const capsuleMax = new THREE.Vector3(
      newPosition.x + COLLISION_RADIUS,
      newPosition.y + COLLISION_HEIGHT / 2,
      newPosition.z + COLLISION_RADIUS
    );

    for (const brick of placedBricks) {
      const bounds = getBrickBounds(brick);
      if (!bounds) continue;

      const brickMin = new THREE.Vector3(
        bounds.footprint.minX,
        bounds.bottomY,
        bounds.footprint.minZ
      );
      const brickMax = new THREE.Vector3(
        bounds.footprint.maxX,
        bounds.topY,
        bounds.footprint.maxZ
      );

      // AABB collision check
      if (
        capsuleMin.x < brickMax.x &&
        capsuleMax.x > brickMin.x &&
        capsuleMin.y < brickMax.y &&
        capsuleMax.y > brickMin.y &&
        capsuleMin.z < brickMax.z &&
        capsuleMax.z > brickMin.z
      ) {
        return true;
      }
    }

    return false;
  };

  // Update loop
  useFrame((_state, delta) => {
    const allowTouchControls = isTouchDevice && !controlsDisabled;

    // Get camera direction
    camera.getWorldDirection(directionRef.current);
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, directionRef.current).normalize();

    // Calculate velocity from input
    const inputVector = new THREE.Vector3();

    // Desktop: Use keyboard state
    if (!isTouchDevice) {
      if (isPointerLockedRef.current) {
        if (moveForward) inputVector.z -= 1;
        if (moveBackward) inputVector.z += 1;
        if (moveLeft) inputVector.x -= 1;
        if (moveRight) inputVector.x += 1;
      }
    } else {
      // Mobile: Use virtual joystick
      if (allowTouchControls && virtualJoystickInput) {
        inputVector.x = virtualJoystickInput.x;
        inputVector.z = virtualJoystickInput.y;
      }
    }

    // Normalize diagonal movement
    if (inputVector.length() > 0) {
      inputVector.normalize();
    }

    // Calculate movement velocity
    const forward = directionRef.current.clone();
    forward.y = 0; // Remove vertical component for horizontal movement
    forward.normalize();

    const speed =
      MOVEMENT_SPEED *
      (isFastMove ? FAST_MOVEMENT_MULTIPLIER : 1) *
      (allowTouchControls ? joystickMoveSensitivity : 1);
    velocityRef.current.set(0, 0, 0);
    velocityRef.current.addScaledVector(right, -inputVector.x * speed); // Negate for correct left/right
    velocityRef.current.addScaledVector(forward, -inputVector.z * speed); // Negate for correct forward/back

    // Add vertical movement
    if ((allowTouchControls && virtualAscend) || (!isTouchDevice && isPointerLockedRef.current && moveUp)) {
      velocityRef.current.y += speed;
    }
    if ((allowTouchControls && virtualDescend) || (!isTouchDevice && isPointerLockedRef.current && moveDown)) {
      velocityRef.current.y -= speed;
    }

    // Handle camera rotation for mobile
    if (allowTouchControls && virtualJoystickCamera) {
      const baseRotationSpeed = 0.7; // Radians per second at max joystick deflection (large screens)
      const minDim = Math.min(window.innerWidth, window.innerHeight);
      const scale = Math.max(0.45, Math.min(1, minDim / 800));
      const rotationSpeed = baseRotationSpeed * scale * joystickLookSensitivity;
      cameraRotationRef.current.y -= virtualJoystickCamera.x * rotationSpeed * delta;
      cameraRotationRef.current.x -= virtualJoystickCamera.y * rotationSpeed * delta;

      // Clamp vertical rotation
      cameraRotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationRef.current.x));

      camera.rotation.order = 'YXZ';
      camera.rotation.y = cameraRotationRef.current.y;
      camera.rotation.x = cameraRotationRef.current.x;
    }

    // Apply movement with collision detection
    const movement = velocityRef.current.clone().multiplyScalar(delta);
    const newPosition = camera.position.clone().add(movement);

    // Check collision and apply movement
    if (!checkCollision(newPosition)) {
      camera.position.copy(newPosition);
    } else {
      // Try sliding along walls
      const slideX = camera.position.clone().add(new THREE.Vector3(movement.x, 0, 0));
      const slideZ = camera.position.clone().add(new THREE.Vector3(0, 0, movement.z));
      const slideY = camera.position.clone().add(new THREE.Vector3(0, movement.y, 0));

      if (!checkCollision(slideX)) {
        camera.position.x = slideX.x;
      }
      if (!checkCollision(slideZ)) {
        camera.position.z = slideZ.z;
      }
      if (!checkCollision(slideY)) {
        camera.position.y = slideY.y;
      }
    }

    // Perform raycasting from camera center
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(ndcRef.current, camera);
    raycaster.far = RAYCAST_MAX_DISTANCE;

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Find the first valid hit, prioritizing bricks over grid
      let hit = null;
      let brickHit = null;
      let gridHit = null;

      const hasFlagInParents = (obj: THREE.Object3D, flag: string): boolean => {
        let current: THREE.Object3D | null = obj;
        while (current) {
          if ((current.userData as Record<string, unknown> | undefined)?.[flag]) return true;
          current = current.parent;
        }
        return false;
      };

      const getPlacedBrickFromParents = (obj: THREE.Object3D): PlacedBrick | null => {
        let current: THREE.Object3D | null = obj;
        while (current) {
          const maybe = (current.userData as Record<string, unknown> | undefined)?.placedBrick;
          if (maybe) return maybe as PlacedBrick;
          current = current.parent;
        }
        return null;
      };

      const isGridObject = (obj: THREE.Object3D): boolean => {
        let current: THREE.Object3D | null = obj;
        while (current) {
          if (current.name === 'grid') return true;
          current = current.parent;
        }
        return false;
      };

      for (const intersect of intersects) {
        // Skip helpers, edges, and other non-placeable objects
        if (intersect.object.type === 'LineSegments' || intersect.object.type === 'GridHelper') {
          continue;
        }

        // Skip preview/ghost meshes and stud cylinders so the raycast targets real brick bodies/grid.
        if (hasFlagInParents(intersect.object, 'ignoreRaycast')) continue;
        if ((intersect.object.userData as Record<string, unknown> | undefined)?.isStud) continue;

        // Categorize hits
        if (isGridObject(intersect.object)) {
          if (!gridHit) gridHit = intersect;
        } else if (intersect.object.type === 'Mesh') {
          if (!brickHit) brickHit = intersect;
        }

        // Stop after finding both types
        if (brickHit && gridHit) break;
      }

      // Prioritize brick hits, but use grid if no brick found
      hit = brickHit || gridHit;

      if (hit) {
        // Get the normal and determine if we hit a brick or the ground
        const normal = hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
        normal.transformDirection(hit.object.matrixWorld);

        const isGroundHit = hit === gridHit;
        const hitBrick = isGroundHit ? null : getPlacedBrickFromParents(hit.object);
        const hitBounds = hitBrick ? getBrickBounds(hitBrick) : null;
        const isNearBrickTop = Boolean(hitBounds) && Math.abs(hit.point.y - hitBounds!.topY) < 0.15;
        const isTopFace = Math.abs(normal.y) > 0.7 || isNearBrickTop;

        let hitX = hit.point.x;
        let hitZ = hit.point.z;
        if (isNearBrickTop && hitBounds) {
          // If we clipped a side face near the top edge, clamp inside the brick footprint
          // so small aim jitter doesn't flip placement to the adjacent cell.
          const epsilon = 0.001;
          hitX = Math.min(Math.max(hitX, hitBounds.footprint.minX + epsilon), hitBounds.footprint.maxX - epsilon);
          hitZ = Math.min(Math.max(hitZ, hitBounds.footprint.minZ + epsilon), hitBounds.footprint.maxZ - epsilon);
        }

        setRaycastHit({
          position: [hitX, hit.point.y, hitZ],
          normal: [normal.x, normal.y, normal.z],
          hitBrick: hitBrick ?? undefined,
          hitGround: isGroundHit,
          isTopFace: isTopFace
        });
      } else {
        setRaycastHit(null);
      }
    } else {
      setRaycastHit(null);
    }
  });

  return null;
};
