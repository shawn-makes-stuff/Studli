import * as THREE from 'three';
import type { BrickType } from '../types/brick';
import {
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickHeight,
  SIDE_STUD_POS_X,
  SIDE_STUD_POS_Z,
  SIDE_STUD_NEG_X,
  SIDE_STUD_NEG_Z,
} from '../types/brick';
import {
  getCachedSlopeGeometry,
  getCachedCornerSlopeGeometry,
  getCachedBoxGeometry,
  getCachedRoundedRectGeometry,
  calculateStudPositions,
  getStudGeometry
} from './geometry';

// Cache for rendered thumbnail images: key = `${brickTypeId}-${color}`
const thumbnailCache = new Map<string, string>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.OrthographicCamera | null = null;

export const DEFAULT_THUMBNAIL_TILE_SIZE = 80;

const getSharedRenderer = (tileSize: number) => {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    sharedRenderer.setSize(tileSize, tileSize);
    sharedRenderer.setPixelRatio(1);

    sharedScene = new THREE.Scene();

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    sharedScene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    sharedScene.add(directional);

    sharedCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    sharedCamera.position.set(3, 3, 3);
    sharedCamera.lookAt(0, 0, 0);
  } else {
    const size = sharedRenderer.getSize(new THREE.Vector2());
    if (size.x !== tileSize || size.y !== tileSize) {
      sharedRenderer.setSize(tileSize, tileSize);
    }
  }

  return { renderer: sharedRenderer, scene: sharedScene!, camera: sharedCamera! };
};

const createBrickMesh = (brickType: BrickType, color: string): THREE.Group => {
  const group = new THREE.Group();

  const height = getBrickHeight(brickType.variant);
  const width = brickType.studsX * STUD_SPACING;
  const depth = brickType.studsZ * STUD_SPACING;
  const isSlope = brickType.variant === 'slope';
  const isCornerSlope = brickType.variant === 'corner-slope';
  const isInverted = brickType.isInverted ?? false;
  const isRound = brickType.isRound === true && !isSlope && !isCornerSlope;

  const material = new THREE.MeshStandardMaterial({
    color,
    flatShading: isSlope || isCornerSlope
  });

  let geometry: THREE.BufferGeometry;
  if (isSlope) {
    geometry = getCachedSlopeGeometry(width, height, depth, isInverted);
  } else if (isCornerSlope) {
    geometry = getCachedCornerSlopeGeometry(width, height, depth, isInverted);
  } else if (isRound) {
    geometry = getCachedRoundedRectGeometry(width, height, depth);
  } else {
    geometry = getCachedBoxGeometry(width, height, depth);
  }

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const studGeometry = getStudGeometry();
  const studMaterial = new THREE.MeshStandardMaterial({ color });

  const studPositions = calculateStudPositions(
    brickType.studsX,
    brickType.studsZ,
    depth,
    brickType.variant,
    isInverted
  );
  for (const [x, z] of studPositions) {
    const stud = new THREE.Mesh(studGeometry, studMaterial);
    stud.position.set(x, height / 2 + STUD_HEIGHT / 2, z);
    group.add(stud);
  }

  // Side studs (SNOT bricks)
  const mask = brickType.sideStudMask ?? 0;
  if (mask) {
    const xOut = width / 2 + STUD_HEIGHT / 2;
    const zOut = depth / 2 + STUD_HEIGHT / 2;

    const addSideStud = (pos: [number, number, number], rot: [number, number, number]) => {
      const stud = new THREE.Mesh(studGeometry, studMaterial);
      stud.position.set(pos[0], pos[1], pos[2]);
      stud.rotation.set(rot[0], rot[1], rot[2]);
      group.add(stud);
    };

    if (mask & SIDE_STUD_POS_X) addSideStud([xOut, 0, 0], [0, 0, -Math.PI / 2]);
    if (mask & SIDE_STUD_NEG_X) addSideStud([-xOut, 0, 0], [0, 0, Math.PI / 2]);
    if (mask & SIDE_STUD_POS_Z) addSideStud([0, 0, zOut], [Math.PI / 2, 0, 0]);
    if (mask & SIDE_STUD_NEG_Z) addSideStud([0, 0, -zOut], [-Math.PI / 2, 0, 0]);
  }

  const maxDim = Math.max(width, depth, height);
  const scale = 1.8 / maxDim;
  group.scale.setScalar(scale);
  group.rotation.set(0.4, -0.6, 0);

  return group;
};

export const renderBrickThumbnailDataUrl = (
  brickType: BrickType,
  color: string,
  tileSize = DEFAULT_THUMBNAIL_TILE_SIZE
): string => {
  const cacheKey = `${brickType.id}-${color}-${tileSize}`;
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey)!;

  const { renderer, scene, camera } = getSharedRenderer(tileSize);

  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group) toRemove.push(obj);
  });
  toRemove.forEach((obj) => scene.remove(obj));

  const brickGroup = createBrickMesh(brickType, color);
  scene.add(brickGroup);

  renderer.render(scene, camera);

  const dataUrl = renderer.domElement.toDataURL('image/png');
  thumbnailCache.set(cacheKey, dataUrl);

  scene.remove(brickGroup);

  const materials = new Set<THREE.Material>();
  brickGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const m = obj.material;
    if (Array.isArray(m)) m.forEach((mat) => materials.add(mat));
    else materials.add(m);
  });
  materials.forEach((mat) => mat.dispose());

  return dataUrl;
};

export const clearThumbnailCache = () => {
  thumbnailCache.clear();
};
