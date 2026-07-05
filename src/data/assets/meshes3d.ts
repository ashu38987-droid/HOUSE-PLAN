import * as THREE from 'three';
import { getAsset } from './catalog';

function box(w: number, h: number, d: number, color: string, rough = 0.7, metal = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function put(mesh: THREE.Object3D, x: number, y: number, z: number, rotY = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  return mesh;
}

export function createSofaMesh(width = 6, depth = 2.6, color = '#94a3b8') {
  const g = new THREE.Group();
  const seatH = 1.5;
  const base = box(width, seatH * 0.55, depth, color, 0.85);
  put(base, 0, seatH * 0.275, 0);
  g.add(base);
  const back = box(width, seatH * 1.2, depth * 0.28, color, 0.85);
  put(back, 0, seatH * 0.55 + (seatH * 1.2) / 2 - 0.1, -depth / 2 + depth * 0.14);
  g.add(back);
  return g;
}

export function createDiningTableMesh(width = 4, depth = 3) {
  const g = new THREE.Group();
  const top = box(width, 0.15, depth, '#8b6b4a', 0.4);
  put(top, 0, 1.05, 0);
  g.add(top);
  [[-width / 2 + 0.15, -depth / 2 + 0.15], [width / 2 - 0.15, -depth / 2 + 0.15], [-width / 2 + 0.15, depth / 2 - 0.15], [width / 2 - 0.15, depth / 2 - 0.15]].forEach(([lx, lz]) => {
    const leg = box(0.12, 1.0, 0.12, '#3f3f46', 0.5);
    put(leg, lx, 0.5, lz);
    g.add(leg);
  });
  return g;
}

export function createCarMesh(length = 14, width = 6, color = '#6366f1') {
  const g = new THREE.Group();
  const bodyH = 1.6;
  const clearance = 0.55;
  const body = box(length, bodyH, width, color, 0.35, 0.15);
  put(body, 0, clearance + bodyH / 2, 0);
  g.add(body);
  const cabin = box(length * 0.52, 1.05, width * 0.82, color, 0.3, 0.15);
  put(cabin, -length * 0.04, clearance + bodyH + 0.5, 0);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.32, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
  [[length * 0.32, width * 0.4], [length * 0.32, -width * 0.4], [-length * 0.32, width * 0.4], [-length * 0.32, -width * 0.4]].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    put(wheel, wx, 0.55, wz);
    g.add(wheel);
  });
  return g;
}

export function createToiletMesh() {
  const g = new THREE.Group();
  const base = box(0.9, 0.9, 0.7, '#ffffff', 0.3);
  put(base, 0, 0.45, 0);
  g.add(base);
  const tank = box(0.7, 0.55, 0.22, '#ffffff', 0.3);
  put(tank, 0, 1.05, -0.3);
  g.add(tank);
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.32, 0.55, 16),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 })
  );
  put(bowl, 0, 0.7, 0.15);
  g.add(bowl);
  return g;
}

export function createSinkMesh(width = 2) {
  const g = new THREE.Group();
  const counter = box(width, 0.15, 1.0, '#e7e2d8', 0.4);
  put(counter, 0, 2.6, 0);
  g.add(counter);
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.3, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 })
  );
  put(basin, 0, 2.55, 0);
  g.add(basin);
  return g;
}

export function createBedMesh(width = 5, depth = 6.5, color = '#7c6a58') {
  const g = new THREE.Group();
  const frame = box(width, 0.5, depth, '#6b4f3a', 0.6);
  put(frame, 0, 0.25, 0);
  g.add(frame);
  const mattress = box(width * 0.96, 0.45, depth * 0.94, '#f7f4ee', 0.8);
  put(mattress, 0, 0.5 + 0.225, 0);
  g.add(mattress);
  const headboard = box(width, 1.6, 0.18, color, 0.7);
  put(headboard, 0, 1.6 / 2 + 0.3, -depth / 2 - 0.05);
  g.add(headboard);
  return g;
}

export function createAssetMesh(assetId: string, width?: number, length?: number): THREE.Group | null {
  const def = getAsset(assetId);
  const w = width ?? def?.width ?? 2;
  const l = length ?? def?.length ?? 2;

  switch (assetId) {
    case 'sofa':
      return createSofaMesh(w, l, def?.color);
    case 'dining_table':
      return createDiningTableMesh(w, l);
    case 'car':
      return createCarMesh(l, w, def?.color);
    case 'toilet':
      return createToiletMesh();
    case 'sink':
      return createSinkMesh(w);
    case 'bed':
      return createBedMesh(w, l, def?.color);
    default:
      return null;
  }
}
