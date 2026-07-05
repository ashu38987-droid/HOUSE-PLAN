import * as THREE from 'three';
import { floorBaseY, SLAB_THICKNESS, WALL_HEIGHT, type FloorBuildContext, type StairShaft } from './types';
import { MAT, std } from './materials';

const RISER = 7 / 12; // 7 inches in feet
const TREAD = 10 / 12; // 10 inches in feet

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

/** L-shaped (quarter-turn) staircase with landing — fits inside shaft. */
export function buildLShapeStairs(
  shaft: StairShaft,
  lowerCtx: FloorBuildContext,
  opacity: number,
  group: THREE.Group
) {
  const stepMat = std(MAT.stair, 0.7);
  const railMat = std(MAT.rail, 0.45, 0.3);
  const landingMat = std(MAT.concrete, 0.75);

  const width = shaft.maxX - shaft.minX - 0.5;
  const depth = shaft.maxZ - shaft.minZ - 0.5;
  const baseY = lowerCtx.slabTopY;
  const totalRise = WALL_HEIGHT - SLAB_THICKNESS;
  const stepsTotal = Math.floor(totalRise / RISER);
  const halfSteps = Math.floor(stepsTotal / 2);

  const cx = (shaft.minX + shaft.maxX) / 2;
  const cz = (shaft.minZ + shaft.maxZ) / 2;

  // Flight 1: along -Z from front of shaft
  const run1Len = Math.min(depth * 0.55, halfSteps * TREAD);
  for (let i = 0; i < halfSteps; i++) {
    const z = shaft.maxZ - 0.3 - TREAD * (i + 0.5);
    const y = baseY + RISER * (i + 0.5);
    box(group, width, RISER * 0.92, TREAD * 0.95, cx, y, z, stepMat);
  }

  const landingY = baseY + RISER * halfSteps;
  // Landing platform
  box(group, width, 0.12, Math.min(depth * 0.45, 3), cx, landingY + 0.06, cz, landingMat);

  // Flight 2: along +X, remaining steps
  const remain = stepsTotal - halfSteps;
  for (let i = 0; i < remain; i++) {
    const x = shaft.minX + 0.3 + TREAD * (i + 0.5);
    const y = landingY + RISER * (i + 0.5);
    box(group, TREAD * 0.95, RISER * 0.92, width * 0.85, x, y, cz, stepMat);
  }

  const topY = baseY + totalRise - RISER * 0.5;

  // Handrails
  box(group, 0.07, totalRise * 0.95, 0.07, shaft.maxX - 0.15, baseY + totalRise / 2, (shaft.minZ + shaft.maxZ) / 2, railMat);
  box(group, 0.07, totalRise * 0.95, 0.07, shaft.minX + 0.15, baseY + totalRise / 2, (shaft.minZ + shaft.maxZ) / 2, railMat);
  box(group, (shaft.maxX - shaft.minX) * 0.9, 0.07, 0.07, cx, landingY + 2.8, shaft.maxZ - 0.2, railMat);

  // Upper floor landing slab
  box(
    group,
    width,
    SLAB_THICKNESS,
    depth * 0.5,
    cx,
    floorBaseY(lowerCtx.level + 1) + SLAB_THICKNESS / 2,
    shaft.minZ + depth * 0.25,
    landingMat
  );
}

export function buildShaftOpening(ctx: FloorBuildContext, shaft: StairShaft, opacity: number, group: THREE.Group) {
  // Visual cut in ceiling slab at stair well
  const mat = std('#334155', opacity * 0.12, 0);
  mat.transparent = true;
  box(
    group,
    shaft.maxX - shaft.minX - 0.1,
    0.05,
    shaft.maxZ - shaft.minZ - 0.1,
    (shaft.minX + shaft.maxX) / 2,
    ctx.wallTopY - 0.025,
    (shaft.minZ + shaft.maxZ) / 2,
    mat
  );
}
