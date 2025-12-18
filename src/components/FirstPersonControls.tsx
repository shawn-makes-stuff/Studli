import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBrickStore } from '../store/useBrickStore';
import { getBrickBounds } from '../utils/collision';
import type { PlacedBrick } from '../types/brick';
import { snapToGrid, getLayerPosition } from '../utils/snapToGrid';
import { getBrickHeight, STUD_SPACING } from '../types/brick';

const MOVEMENT_SPEED = 5;
const FAST_MOVEMENT_MULTIPLIER = 2;
const COLLISION_RADIUS = 0.4;
const COLLISION_HEIGHT = 1.8;
const RAYCAST_MAX_DISTANCE = 60;
const MIN_FOV = 35;
const MAX_FOV = 120;
const WHEEL_ZOOM_SENSITIVITY = 0.03;
const PINCH_ZOOM_SENSITIVITY = 0.06;

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
  const isTouchDevice = detectMobile();

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'KeyW':
          event.preventDefault();
          setMoveForward(true);
          break;
        case 'KeyS':
          event.preventDefault();
          setMoveBackward(true);
          break;
        case 'KeyA':
          event.preventDefault();
          setMoveLeft(true);
          break;
        case 'KeyD':
          event.preventDefault();
          setMoveRight(true);
          break;
        case 'Space':
          event.preventDefault();
          setMoveUp(true);
          break;
        case 'ControlLeft':
        case 'ControlRight':
          event.preventDefault();
          setMoveDown(true);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setIsFastMove(true);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          event.preventDefault();
          setMoveForward(false);
          break;
        case 'KeyS':
          event.preventDefault();
          setMoveBackward(false);
          break;
        case 'KeyA':
          event.preventDefault();
          setMoveLeft(false);
          break;
        case 'KeyD':
          event.preventDefault();
          setMoveRight(false);
          break;
        case 'Space':
          event.preventDefault();
          setMoveUp(false);
          break;
        case 'ControlLeft':
        case 'ControlRight':
          event.preventDefault();
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
  }, []);

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

      const state = useBrickStore.getState();

      const selectedBrickType = state.selectedBrickType;
      const raycastHit = state.raycastHit;
      if (!selectedBrickType || !raycastHit) return;
      const effectiveColor = state.useDefaultColor ? selectedBrickType.color : state.selectedColor;

      let targetX = raycastHit.position[0];
      let targetZ = raycastHit.position[2];

      if (raycastHit.isTopFace === false && !raycastHit.hitGround) {
        const offsetDistance = STUD_SPACING / 2;
        targetX += raycastHit.normal[0] * offsetDistance;
        targetZ += raycastHit.normal[2] * offsetDistance;
      }

      const [snappedX, snappedZ] = snapToGrid(
        targetX,
        targetZ,
        selectedBrickType.studsX,
        selectedBrickType.studsZ,
        state.rotation
      );

      const height = getBrickHeight(selectedBrickType.variant);

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
        selectedBrickType.variant === 'corner-slope'
      );

      if (!result.isValid) return;

      state.addBrick({
        id: crypto.randomUUID(),
        typeId: selectedBrickType.id,
        position: [snappedX, result.bottomY + height / 2, snappedZ],
        color: effectiveColor,
        rotation: state.rotation
      });

      state.addToRecentBricks(selectedBrickType);
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
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
  }, [camera, gl.domElement, isTouchDevice]);

  // Pointer lock management (desktop only)
  useEffect(() => {
    if (isTouchDevice) return;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setIsPointerLocked(locked);
      isPointerLockedRef.current = locked;
      if (!locked) {
        lastPointerLockExitAtRef.current = performance.now();
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

      // Some browsers release pointer lock before dispatching Esc; avoid re-locking immediately.
      const now = performance.now();
      const justExitedPointerLock = now - lastPointerLockExitAtRef.current < 250;
      if (justExitedPointerLock) return;

      if (!isPointerLockedRef.current) {
        gl.domElement.requestPointerLock();
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

    // Get camera direction
    camera.getWorldDirection(directionRef.current);
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, directionRef.current).normalize();

    // Calculate velocity from input
    const inputVector = new THREE.Vector3();

    // Desktop: Use keyboard state
    if (!isTouchDevice) {
      if (moveForward) inputVector.z -= 1;
      if (moveBackward) inputVector.z += 1;
      if (moveLeft) inputVector.x -= 1;
      if (moveRight) inputVector.x += 1;
    } else {
      // Mobile: Use virtual joystick
      if (virtualJoystickInput) {
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

    const speed = MOVEMENT_SPEED * (isFastMove ? FAST_MOVEMENT_MULTIPLIER : 1);
    velocityRef.current.set(0, 0, 0);
    velocityRef.current.addScaledVector(right, -inputVector.x * speed); // Negate for correct left/right
    velocityRef.current.addScaledVector(forward, -inputVector.z * speed); // Negate for correct forward/back

    // Add vertical movement
    if (moveUp || (isTouchDevice && virtualAscend)) velocityRef.current.y += speed;
    if (moveDown || (isTouchDevice && virtualDescend)) velocityRef.current.y -= speed;

    // Handle camera rotation for mobile
    if (isTouchDevice && virtualJoystickCamera) {
      const baseRotationSpeed = 0.7; // Radians per second at max joystick deflection (large screens)
      const minDim = Math.min(window.innerWidth, window.innerHeight);
      const scale = Math.max(0.45, Math.min(1, minDim / 800));
      const rotationSpeed = baseRotationSpeed * scale;
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
