/**
 * 3D thumbnail preview for brick types - renders to cached images
 * Uses a single off-screen canvas to generate all thumbnails
 */

import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import {
  BrickType,
  STUD_SPACING,
  STUD_HEIGHT,
  getBrickHeight,
} from '../types/brick';
import {
  getCachedSlopeGeometry,
  getCachedCornerSlopeGeometry,
  getStudGeometry
} from '../utils/geometry';

// Cache for rendered thumbnail images: key = `${brickTypeId}-${color}`
const thumbnailCache = new Map<string, string>();

// Shared renderer (created lazily)
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.OrthographicCamera | null = null;

const THUMBNAIL_SIZE = 80; // Render at 2x for retina

const getSharedRenderer = () => {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    sharedRenderer.setSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    sharedRenderer.setPixelRatio(1);

    sharedScene = new THREE.Scene();

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    sharedScene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    sharedScene.add(directional);

    // Orthographic camera
    sharedCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    sharedCamera.position.set(3, 3, 3);
    sharedCamera.lookAt(0, 0, 0);
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

  const material = new THREE.MeshStandardMaterial({
    color,
    flatShading: isSlope || isCornerSlope
  });

  // Main body
  let geometry: THREE.BufferGeometry;
  if (isSlope) {
    geometry = getCachedSlopeGeometry(width, height, depth, isInverted);
  } else if (isCornerSlope) {
    geometry = getCachedCornerSlopeGeometry(width, height, depth, isInverted);
  } else {
    geometry = new THREE.BoxGeometry(width, height, depth);
  }

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Studs
  const studGeometry = getStudGeometry();
  const studMaterial = new THREE.MeshStandardMaterial({ color });

  // Calculate stud positions (simplified version)
  if (brickType.variant !== 'tile') {
    const startX = -(brickType.studsX - 1) / 2 * STUD_SPACING;
    const startZ = -(brickType.studsZ - 1) / 2 * STUD_SPACING;

    if (isSlope && !isInverted) {
      // Regular slopes: only back row
      for (let x = 0; x < brickType.studsX; x++) {
        const stud = new THREE.Mesh(studGeometry, studMaterial);
        stud.position.set(
          startX + x * STUD_SPACING,
          height / 2 + STUD_HEIGHT / 2,
          -depth / 2 + STUD_SPACING / 2
        );
        group.add(stud);
      }
    } else if (isCornerSlope && !isInverted) {
      // Regular corner slopes: only corner stud
      const stud = new THREE.Mesh(studGeometry, studMaterial);
      stud.position.set(startX, height / 2 + STUD_HEIGHT / 2, startZ);
      group.add(stud);
    } else {
      // Full grid of studs
      for (let x = 0; x < brickType.studsX; x++) {
        for (let z = 0; z < brickType.studsZ; z++) {
          const stud = new THREE.Mesh(studGeometry, studMaterial);
          stud.position.set(
            startX + x * STUD_SPACING,
            height / 2 + STUD_HEIGHT / 2,
            startZ + z * STUD_SPACING
          );
          group.add(stud);
        }
      }
    }
  }

  // Scale to fit
  const maxDim = Math.max(width, depth, height);
  const scale = 1.8 / maxDim;
  group.scale.setScalar(scale);
  group.rotation.set(0.4, -0.6, 0);

  return group;
};

const renderThumbnail = (brickType: BrickType, color: string): string => {
  const cacheKey = `${brickType.id}-${color}`;

  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  const { renderer, scene, camera } = getSharedRenderer();

  // Clear previous objects (except lights)
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group) toRemove.push(obj);
  });
  toRemove.forEach(obj => scene.remove(obj));

  // Add brick
  const brickGroup = createBrickMesh(brickType, color);
  scene.add(brickGroup);

  // Render
  renderer.render(scene, camera);

  // Get image data
  const dataUrl = renderer.domElement.toDataURL('image/png');
  thumbnailCache.set(cacheKey, dataUrl);

  // Cleanup
  scene.remove(brickGroup);
  brickGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (!(obj.geometry instanceof THREE.CylinderGeometry)) {
        // Don't dispose shared stud geometry
        if (obj.geometry instanceof THREE.BoxGeometry) {
          obj.geometry.dispose();
        }
      }
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    }
  });

  return dataUrl;
};

// Clear cache when color changes significantly
export const clearThumbnailCache = () => {
  thumbnailCache.clear();
};

interface BrickThumbnailProps {
  brickType: BrickType;
  color: string;
  size?: number;
}

export const BrickThumbnail = ({ brickType, color, size = 40 }: BrickThumbnailProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const renderScheduled = useRef(false);

  useEffect(() => {
    // Debounce rendering slightly to batch updates
    if (renderScheduled.current) return;
    renderScheduled.current = true;

    requestAnimationFrame(() => {
      const src = renderThumbnail(brickType, color);
      setImageSrc(src);
      renderScheduled.current = false;
    });
  }, [brickType, color]);

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded border-2 border-gray-600 overflow-hidden flex-shrink-0 bg-gray-800"
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={brickType.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
    </div>
  );
};
