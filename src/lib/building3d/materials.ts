import * as THREE from 'three';
import { planSeed } from './orientation';

export const MAT = {
  wall: '#f5f3ef',
  wallAccent: '#e8e4dc',
  concrete: '#b8bcc4',
  roof: '#7a8490',
  parapet: '#9aa3ad',
  wood: '#8b6914',
  woodDark: '#6b4f3a',
  glass: '#b8dff0',
  metal: '#64748b',
  grass: '#5a9e4b',
  grassDark: '#4a8540',
  road: '#4a4f57',
  pavement: '#c4c8cc',
  tile: '#d4c4a8',
  driveway: '#6b7280',
  boundary: '#e2e8f0',
  gate: '#374151',
  plant: '#3d7a35',
  treeTrunk: '#6b4423',
  waterTank: '#1e3a5f',
  stair: '#94a3b8',
  rail: '#475569',
  doorMain: '#5c3d2e',
  doorInner: '#8b6b4a',
  sunshade: '#d6d3d1',
  light: '#fef9c3',
};

export function std(color: string, rough = 0.65, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function glass(opacity = 0.42) {
  return new THREE.MeshPhysicalMaterial({
    color: MAT.glass,
    transparent: true,
    opacity,
    roughness: 0.04,
    metalness: 0.05,
    depthWrite: false,
  });
}

export function faded(base: THREE.Material, opacity: number): THREE.Material {
  const m = (base as THREE.MeshStandardMaterial).clone();
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = opacity >= 0.85;
  return m;
}

const ACCENT_PALETTE = [
  { facade: '#e8e0d4', trim: '#c4b8a8', column: '#f0ebe3' },
  { facade: '#dde4e8', trim: '#a8b8c4', column: '#eef2f5' },
  { facade: '#e5ddd0', trim: '#b8a890', column: '#f5f0e8' },
  { facade: '#e0e4dc', trim: '#a0a898', column: '#eceee8' },
];

/** Plan-unique paint accents for facade variation. */
export function planAccentColors(planId: string) {
  const idx = Math.floor(planSeed(planId, 7) * ACCENT_PALETTE.length) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[idx];
}

export function wood(rough = 0.75) {
  return std(MAT.woodDark, rough);
}

export function paint(color: string, rough = 0.55) {
  return std(color, rough);
}
