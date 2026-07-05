import * as THREE from 'three';
import type { PlanData } from '@/types/plan';
import type { FloorSelection } from '@/types/plan';
import { WALL_HEIGHT } from './types';

export type WorldSide = 'north' | 'south' | 'east' | 'west';

export interface PlotOrientation {
  facing: string;
  frontSide: WorldSide;
  /** World Z of front edge (road side) */
  frontZ: number;
  frontX: number;
  plotCenter: THREE.Vector3;
}

/** Map vastu facing to which plot edge is the front (road / main entrance side). */
export function facingToFrontSide(facing: string): WorldSide {
  const f = facing.toLowerCase();
  if (f.includes('east')) return 'east';
  if (f.includes('west')) return 'west';
  if (f.includes('north')) return 'north';
  if (f.includes('south')) return 'south';
  return 'north';
}

export function getPlotOrientation(plan: PlanData): PlotOrientation {
  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const frontSide = facingToFrontSide(plan.meta.facing);

  let frontZ = pl / 2;
  let frontX = pw / 2;
  switch (frontSide) {
    case 'north':
      frontZ = pl;
      frontX = pw / 2;
      break;
    case 'south':
      frontZ = 0;
      frontX = pw / 2;
      break;
    case 'east':
      frontZ = pl / 2;
      frontX = pw;
      break;
    case 'west':
      frontZ = pl / 2;
      frontX = 0;
      break;
  }

  return {
    facing: plan.meta.facing,
    frontSide,
    frontZ,
    frontX,
    plotCenter: new THREE.Vector3(pw / 2, 0, pl / 2),
  };
}

export function isFrontExteriorEdge(
  edge: { axis: 'x' | 'z'; fixed: number },
  orient: PlotOrientation,
  plotWidth: number,
  plotLength: number,
  eps = 0.15
): boolean {
  switch (orient.frontSide) {
    case 'north':
      return edge.axis === 'x' && edge.fixed >= plotLength - eps;
    case 'south':
      return edge.axis === 'x' && edge.fixed <= eps;
    case 'east':
      return edge.axis === 'z' && edge.fixed >= plotWidth - eps;
    case 'west':
      return edge.axis === 'z' && edge.fixed <= eps;
  }
}

export interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/** Deterministic seed 0–1 from plan id for procedural variation. */
export function planSeed(planId: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < planId.length; i++) h = (h * 31 + planId.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

/** World point at front center — gate / main entrance anchor. */
export function getFrontEntryAnchor(plan: PlanData): THREE.Vector3 {
  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const orient = getPlotOrientation(plan);
  const inset = 0.5;
  switch (orient.frontSide) {
    case 'north':
      return new THREE.Vector3(pw / 2, 0, pl - inset);
    case 'south':
      return new THREE.Vector3(pw / 2, 0, inset);
    case 'east':
      return new THREE.Vector3(pw - inset, 0, pl / 2);
    case 'west':
      return new THREE.Vector3(inset, 0, pl / 2);
  }
}

/** Front perspective ~35°, slightly above eye level, entire house visible. */
export function getFrontCameraPreset(
  plan: PlanData,
  floorSelection: FloorSelection
): CameraPreset {
  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const orient = getPlotOrientation(plan);
  const entry = getFrontEntryAnchor(plan);
  const maxLevel = Math.max(...plan.floors.map((f) => f.level), 0);
  const stackH = (maxLevel + 1) * WALL_HEIGHT;

  const focusLevel = floorSelection === 'all' ? maxLevel : floorSelection;
  const targetY = focusLevel * WALL_HEIGHT + WALL_HEIGHT * 0.42;
  const target = new THREE.Vector3(entry.x, targetY, entry.z);

  const maxDim = Math.max(pw, pl, stackH);
  const dist = maxDim * 1.5;
  const elev = maxDim * 0.4;
  const angle = 0.62;

  let position: THREE.Vector3;
  switch (orient.frontSide) {
    case 'north':
      position = new THREE.Vector3(entry.x, targetY + elev, entry.z + dist * Math.cos(angle));
      break;
    case 'south':
      position = new THREE.Vector3(entry.x, targetY + elev, entry.z - dist * Math.cos(angle));
      break;
    case 'east':
      position = new THREE.Vector3(entry.x + dist * Math.cos(angle), targetY + elev, entry.z);
      break;
    case 'west':
      position = new THREE.Vector3(entry.x - dist * Math.cos(angle), targetY + elev, entry.z);
      break;
  }

  return { position, target };
}
