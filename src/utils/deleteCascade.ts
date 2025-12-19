import * as THREE from 'three';
import type { PlacedBrick } from '../types/brick';
import { getBrickHeight, getBrickType } from '../types/brick';
import { getBottomConnectionPoints } from './connectionPoints';
import { getBrickQuaternion, getUpVector } from './brickTransform';
import { getStudConnectors } from './studConnectors';
import { getBrickAabb } from './collision';

const KEY_SCALE = 1000; // 1e-3 world units
const DOT_THRESHOLD = 0.85;

const keyOf = (x: number, y: number, z: number) =>
  `${Math.round(x * KEY_SCALE)},${Math.round(y * KEY_SCALE)},${Math.round(z * KEY_SCALE)}`;

type StudEntry = { brickId: string; direction: THREE.Vector3 };

const addEdge = (adj: Map<string, Set<string>>, a: string, b: string) => {
  if (a === b) return;
  if (!adj.has(a)) adj.set(a, new Set());
  if (!adj.has(b)) adj.set(b, new Set());
  adj.get(a)!.add(b);
  adj.get(b)!.add(a);
};

export const computeCascadeDeleteIds = (placedBricks: PlacedBrick[], rootId: string): string[] => {
  const root = placedBricks.find((b) => b.id === rootId);
  if (!root) return [];

  const studsByKey = new Map<string, StudEntry[]>();
  const adjacency = new Map<string, Set<string>>();
  const anchored = new Set<string>();

  for (const b of placedBricks) {
    adjacency.set(b.id, new Set());

    const aabb = getBrickAabb(b);
    if (aabb && aabb.minY <= 0.01) anchored.add(b.id);

    for (const s of getStudConnectors(b)) {
      const k = keyOf(s.position[0], s.position[1], s.position[2]);
      const list = studsByKey.get(k) ?? [];
      list.push({ brickId: b.id, direction: new THREE.Vector3(s.direction[0], s.direction[1], s.direction[2]).normalize() });
      studsByKey.set(k, list);
    }
  }

  for (const b of placedBricks) {
    const brickType = getBrickType(b.typeId);
    if (!brickType) continue;

    const height = getBrickHeight(brickType.variant);
    const q = getBrickQuaternion(b.orientation, b.rotation);
    const up = getUpVector(b.orientation).clone().normalize();
    const center = new THREE.Vector3(b.position[0], b.position[1], b.position[2]);

    const bottomPoints = getBottomConnectionPoints(brickType);
    for (const [x, z] of bottomPoints) {
      const wp = new THREE.Vector3(x, -height / 2, z).applyQuaternion(q).add(center);
      const k = keyOf(wp.x, wp.y, wp.z);
      const entries = studsByKey.get(k);
      if (!entries) continue;

      for (const e of entries) {
        if (e.brickId === b.id) continue;
        if (e.direction.dot(up) < DOT_THRESHOLD) continue;
        addEdge(adjacency, e.brickId, b.id);
      }
    }
  }

  const bfs = (seeds: Iterable<string>, blocked: Set<string>, limit?: Set<string>) => {
    const visited = new Set<string>();
    const queue: string[] = [];
    for (const s of seeds) {
      if (blocked.has(s)) continue;
      if (limit && !limit.has(s)) continue;
      if (!visited.has(s)) {
        visited.add(s);
        queue.push(s);
      }
    }
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const nbrs = adjacency.get(cur);
      if (!nbrs) continue;
      for (const n of nbrs) {
        if (blocked.has(n)) continue;
        if (limit && !limit.has(n)) continue;
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
      }
    }
    return visited;
  };

  // Original connected component containing the root (so we don't delete unrelated floating structures).
  const component = bfs([rootId], new Set());
  const blocked = new Set<string>([rootId]);

  const componentAnchors = Array.from(component).filter((id) => anchored.has(id) && id !== rootId);
  const supported = componentAnchors.length > 0 ? bfs(componentAnchors, blocked, component) : new Set<string>();

  const toDelete: string[] = [];
  for (const id of component) {
    if (id === rootId) continue;
    if (!supported.has(id)) toDelete.push(id);
  }
  toDelete.push(rootId);

  return toDelete;
};

