/**
 * Shared geometry utilities for brick rendering
 * Centralized geometry creation for all brick variants
 */

import * as THREE from 'three';
import { STUD_SPACING, STUD_RADIUS, STUD_HEIGHT, PLATE_HEIGHT } from '../types/brick';
import { calculateStudPositions } from './studPositions';

// Shared cylinder geometry for studs (reused across all bricks)
let sharedStudGeometry: THREE.CylinderGeometry | null = null;

// Cached box geometries (reused across all regular bricks/plates/tiles)
const boxGeometryCache = new Map<string, THREE.BoxGeometry>();

// Cached rounded-rect geometries (reused across all round bricks/plates/tiles)
const roundedRectGeometryCache = new Map<string, THREE.BufferGeometry>();

// Cached edges geometries (for cavity-like edge enhancement)
const edgesGeometryCache = new Map<string, THREE.EdgesGeometry>();

export const getStudGeometry = (): THREE.CylinderGeometry => {
  if (!sharedStudGeometry) {
    sharedStudGeometry = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16);
  }
  return sharedStudGeometry;
};

export const getCachedBoxGeometry = (width: number, height: number, depth: number): THREE.BoxGeometry => {
  const key = `box-${width}-${height}-${depth}`;
  if (!boxGeometryCache.has(key)) {
    boxGeometryCache.set(key, new THREE.BoxGeometry(width, height, depth));
  }
  return boxGeometryCache.get(key)!;
};

const createRoundedRectShape = (width: number, depth: number, radius: number): THREE.Shape => {
  const w = width;
  const h = depth;
  const r = Math.min(radius, w / 2, h / 2);
  const x = -w / 2;
  const y = -h / 2;

  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
};

export const getCachedRoundedRectGeometry = (
  width: number,
  height: number,
  depth: number,
  radius: number = STUD_SPACING / 2,
  curveSegments: number = 16
): THREE.BufferGeometry => {
  const r = Math.min(radius, width / 2, depth / 2);
  const key = `rounded-rect-${width}-${height}-${depth}-${r}-${curveSegments}`;

  if (!roundedRectGeometryCache.has(key)) {
    const shape = createRoundedRectShape(width, depth, r);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      steps: 1,
      curveSegments,
    });

    // ExtrudeGeometry extrudes along +Z; rotate so height is along +Y and center it like BoxGeometry.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    geometry.computeVertexNormals();

    roundedRectGeometryCache.set(key, geometry);
  }

  return roundedRectGeometryCache.get(key)!;
};

export const getCachedEdgesGeometry = (
  geometryKey: string,
  sourceGeometry: THREE.BufferGeometry,
  thresholdAngle: number = 35
): THREE.EdgesGeometry => {
  const key = `edges-${geometryKey}-${thresholdAngle}`;
  if (!edgesGeometryCache.has(key)) {
    edgesGeometryCache.set(key, new THREE.EdgesGeometry(sourceGeometry, thresholdAngle));
  }
  return edgesGeometryCache.get(key)!;
};

/**
 * Calculate stud positions for any brick type
 */
export { calculateStudPositions };

/**
 * Create slope geometry with proper face winding for correct normals
 * This ensures lighting works correctly without needing DoubleSide
 */
export const createSlopeGeometry = (width: number, height: number, depth: number): THREE.BufferGeometry => {
  const geo = new THREE.BufferGeometry();
  const w = width / 2;
  const h = height;
  const d = depth / 2;

  // Front edge is at plate height, back edge is at full height
  const frontHeight = -h/2 + PLATE_HEIGHT;
  const flatEndZ = -d + STUD_SPACING; // Where the flat top section ends

  // Vertices:
  // Bottom quad
  // 0: back-left-bottom, 1: back-right-bottom, 2: front-right-bottom, 3: front-left-bottom
  // Back top edge
  // 4: back-left-top, 5: back-right-top
  // Slope start edge (where flat top meets slope)
  // 6: left-slope-start, 7: right-slope-start
  // Front edge at plate height
  // 8: front-right-plate, 9: front-left-plate

  const vertices = new Float32Array([
    // Bottom quad (y = -h/2)
    -w, -h/2, -d,    // 0: back-left-bottom
     w, -h/2, -d,    // 1: back-right-bottom
     w, -h/2,  d,    // 2: front-right-bottom
    -w, -h/2,  d,    // 3: front-left-bottom
    // Back top edge (y = h/2, z = -d)
    -w,  h/2, -d,    // 4: back-left-top
     w,  h/2, -d,    // 5: back-right-top
    // Slope start edge (y = h/2, z = flatEndZ)
    -w,  h/2, flatEndZ,  // 6: left-slope-start
     w,  h/2, flatEndZ,  // 7: right-slope-start
    // Front edge at plate height (y = frontHeight, z = d)
     w, frontHeight,  d,  // 8: front-right-plate
    -w, frontHeight,  d,  // 9: front-left-plate
  ]);

  // Indices with CORRECT face winding (counter-clockwise when viewed from outside)
  // Each face normal should point outward
  const indices = new Uint16Array([
    // Bottom face (normal -Y, viewed from below)
    0, 1, 2,  0, 2, 3,
    // Top flat section (normal +Y, viewed from above)
    4, 7, 5,  4, 6, 7,
    // Left side (normal -X, viewed from left)
    0, 6, 4,  0, 9, 6,  0, 3, 9,
    // Right side (normal +X, viewed from right)
    1, 5, 7,  1, 7, 8,  1, 8, 2,
    // Back face (normal -Z, viewed from back)
    0, 4, 5,  0, 5, 1,
    // Front face (normal +Z, viewed from front)
    2, 8, 9,  2, 9, 3,
    // Sloped surface (angled normal, viewed from slope direction)
    6, 9, 8,  6, 8, 7,
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();

  return geo;
};

/**
 * Create inverted slope geometry (regular slope flipped upside down with studs on top)
 */
export const createInvertedSlopeGeometry = (width: number, height: number, depth: number): THREE.BufferGeometry => {
  // Create a regular slope
  const regularSlope = createSlopeGeometry(width, height, depth);

  // Flip it upside down by negating all Y coordinates
  const positions = regularSlope.getAttribute('position');
  const flippedPositions = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    flippedPositions[i * 3] = positions.getX(i);      // X stays same
    flippedPositions[i * 3 + 1] = -positions.getY(i); // Y is flipped
    flippedPositions[i * 3 + 2] = positions.getZ(i);  // Z stays same
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(flippedPositions, 3));

  // Reverse all triangle windings for flipped normals
  const indices = regularSlope.getIndex();
  if (indices) {
    const flippedIndices = new Uint16Array(indices.count);
    for (let i = 0; i < indices.count; i += 3) {
      flippedIndices[i] = indices.getX(i + 2);
      flippedIndices[i + 1] = indices.getX(i + 1);
      flippedIndices[i + 2] = indices.getX(i);
    }
    geo.setIndex(new THREE.BufferAttribute(flippedIndices, 1));
  }

  geo.computeVertexNormals();
  return geo;
};

/**
 * Create corner slope geometry
 * 1x1 flat platform at corner (where stud sits) sloping down to plate height at opposite edges
 */
export const createCornerSlopeGeometry = (width: number, height: number, depth: number): THREE.BufferGeometry => {
  const geo = new THREE.BufferGeometry();
  const w = width / 2;
  const h = height;
  const d = depth / 2;

  // The 1x1 platform at the back-left corner is at full height
  const plateHeight = -h/2 + PLATE_HEIGHT;

  const vertices = new Float32Array([
    // Top platform (1x1 at back-left corner, full height)
    -w,  h/2, -d,                              // 0: back-left corner
    -w + STUD_SPACING,  h/2, -d,               // 1: back-right of platform
    -w,  h/2, -d + STUD_SPACING,               // 2: front-left of platform
    -w + STUD_SPACING,  h/2, -d + STUD_SPACING, // 3: front-right of platform (inner corner)

    // Outer edges at plate height
     w, plateHeight, -d,                       // 4: back-right corner (outer)
     w, plateHeight,  d,                       // 5: front-right corner (outer)
    -w, plateHeight,  d,                       // 6: front-left corner (outer)

    // Bottom corners
    -w, -h/2, -d,                              // 7: back-left-bottom
     w, -h/2, -d,                              // 8: back-right-bottom
     w, -h/2,  d,                              // 9: front-right-bottom
    -w, -h/2,  d,                              // 10: front-left-bottom
  ]);

  const indices = new Uint16Array([
    // Top flat platform (1x1 square at corner, normal pointing up +Y)
    0, 3, 1,  0, 2, 3,

    // Sloped surfaces - ONLY THESE HAVE REVERSED WINDING
    // Back-right slope: from platform back-right edge (1) to outer back-right (4)
    1, 3, 4,  3, 5, 4,  // REVERSED from: 1, 4, 3,  3, 4, 5

    // Front-right slope: from platform front edges to outer corners
    3, 2, 5,  2, 6, 5,  // REVERSED from: 3, 5, 2,  2, 5, 6

    // Left slope: from platform left edge to outer left corner
    0, 6, 2,  // REVERSED from: 0, 2, 6

    // Bottom face (normal pointing down -Y)
    7, 8, 9,  7, 9, 10,

    // Vertical/sloped side faces (normals pointing outward)
    // Left side (normal pointing left -X)
    7, 10, 6,  7, 6, 0,  0, 6, 2,
    // Back side (normal pointing back -Z)
    7, 0, 1,  7, 1, 8,  8, 1, 4,
    // Right side (normal pointing right +X)
    8, 4, 5,  8, 5, 9,
    // Front side (normal pointing forward +Z)
    10, 9, 5,  10, 5, 6,
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();

  return geo;
};

/**
 * Create inverted corner slope geometry
 * This is the regular corner slope flipped upside down:
 * - Flat top surface at full height with studs across the whole top
 * - Triangular recess cut into the back-left corner, sloping down
 * - Flat bottom at -h/2
 *
 * The regular corner slope has a 1x1 platform at top that slopes DOWN to outer edges.
 * The inverted has a flat top with a triangular recess that slopes DOWN to the corner.
 */
export const createInvertedCornerSlopeGeometry = (width: number, height: number, depth: number): THREE.BufferGeometry => {
  // Start with the regular corner slope and flip it
  const regularGeo = createCornerSlopeGeometry(width, height, depth);

  // Flip by negating Y coordinates
  const positions = regularGeo.getAttribute('position');
  const flippedPositions = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    flippedPositions[i * 3] = positions.getX(i);
    flippedPositions[i * 3 + 1] = -positions.getY(i); // Flip Y
    flippedPositions[i * 3 + 2] = positions.getZ(i);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(flippedPositions, 3));

  // Reverse triangle winding for correct normals after flip
  const indices = regularGeo.getIndex();
  if (indices) {
    const flippedIndices = new Uint16Array(indices.count);
    for (let i = 0; i < indices.count; i += 3) {
      // Swap second and third vertex of each triangle
      flippedIndices[i] = indices.getX(i);
      flippedIndices[i + 1] = indices.getX(i + 2);
      flippedIndices[i + 2] = indices.getX(i + 1);
    }
    geo.setIndex(new THREE.BufferAttribute(flippedIndices, 1));
  }

  geo.computeVertexNormals();
  return geo;
};

/**
 * Geometry cache to avoid recreating geometries with the same dimensions
 */
const geometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * Get or create a cached slope geometry
 */
export const getCachedSlopeGeometry = (width: number, height: number, depth: number, isInverted: boolean = false): THREE.BufferGeometry => {
  const key = `slope-${width}-${height}-${depth}-${isInverted}`;

  if (!geometryCache.has(key)) {
    const geometry = isInverted
      ? createInvertedSlopeGeometry(width, height, depth)
      : createSlopeGeometry(width, height, depth);
    geometryCache.set(key, geometry);
  }

  return geometryCache.get(key)!;
};

/**
 * Get or create a cached corner slope geometry
 */
export const getCachedCornerSlopeGeometry = (width: number, height: number, depth: number, isInverted: boolean = false): THREE.BufferGeometry => {
  const key = `corner-slope-${width}-${height}-${depth}-${isInverted}`;

  if (!geometryCache.has(key)) {
    const geometry = isInverted
      ? createInvertedCornerSlopeGeometry(width, height, depth)
      : createCornerSlopeGeometry(width, height, depth);
    geometryCache.set(key, geometry);
  }

  return geometryCache.get(key)!;
};

/**
 * Clear geometry cache (useful for cleanup)
 */
export const clearGeometryCache = (): void => {
  geometryCache.forEach(geo => geo.dispose());
  geometryCache.clear();

  boxGeometryCache.forEach((geo) => geo.dispose());
  boxGeometryCache.clear();

  roundedRectGeometryCache.forEach((geo) => geo.dispose());
  roundedRectGeometryCache.clear();

  edgesGeometryCache.forEach((geo) => geo.dispose());
  edgesGeometryCache.clear();
};
