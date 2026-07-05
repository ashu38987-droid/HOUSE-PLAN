import * as THREE from 'three';
import type { PlanData } from '@/types/plan';
import { WALL_HEIGHT } from './types';
import { getPlotOrientation } from './orientation';
import { MAT, glass, std } from './materials';
import type { FloorBuildContext } from './types';
import { isOutdoorRoom, roomToWorld } from './types';

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

export function buildFrontElevation(
  plan: PlanData,
  groundCtx: FloorBuildContext,
  opacity: number
): THREE.Group {
  const g = new THREE.Group();
  if (opacity < 0.05) return g;

  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const orient = getPlotOrientation(plan);
  const slabY = groundCtx.slabTopY;
  const wallTop = groundCtx.wallTopY;

  const living = groundCtx.rooms.find((r) => r.type === 'living');
  const porch = groundCtx.rooms.find((r) => isOutdoorRoom(r) && /park|porch/i.test(r.name));
  const balcony = plan.floors[1]?.rooms.find((r) => /balcony/i.test(r.name));

  // Entrance steps at front center
  const steps = 4;
  const stepH = 0.2;
  const stepD = 0.45;
  const stepMat = std(MAT.concrete, 0.75);
  let stepBaseX = pw / 2;
  let stepBaseZ = pl / 2;
  let stepDirZ = 1;
  let stepDirX = 0;

  switch (orient.frontSide) {
    case 'north':
      stepBaseZ = pl;
      stepDirZ = -1;
      break;
    case 'south':
      stepBaseZ = 0;
      stepDirZ = 1;
      break;
    case 'east':
      stepBaseX = pw;
      stepDirX = -1;
      stepDirZ = 0;
      break;
    case 'west':
      stepBaseX = 0;
      stepDirX = 1;
      stepDirZ = 0;
      break;
  }

  for (let i = 0; i < steps; i++) {
    const sx = stepBaseX + stepDirX * stepD * (i + 0.5);
    const sz = stepBaseZ + stepDirZ * stepD * (i + 0.5);
    box(g, 3.5, stepH, stepD, sx, slabY + stepH * (i + 0.5), sz, stepMat);
  }

  // Entrance porch columns
  const colMat = std(MAT.wallAccent, 0.5);
  const colH = 8;
  const colR = 0.22;
  const porchCenter = porch ? roomToWorld(porch, pl) : living ? roomToWorld(living, pl) : null;
  const px = porchCenter ? (porchCenter.minX + porchCenter.maxX) / 2 : pw / 2;
  const pz = porchCenter ? (porchCenter.minZ + porchCenter.maxZ) / 2 : stepBaseZ;

  for (const dx of [-1.8, 1.8]) {
    const cx = orient.frontSide === 'east' || orient.frontSide === 'west' ? px : px + dx;
    const cz = orient.frontSide === 'east' || orient.frontSide === 'west' ? pz + dx : pz;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR, colH, 10), colMat);
    col.position.set(cx, slabY + colH / 2, cz);
    col.castShadow = true;
    g.add(col);
  }

  // Porch roof slab / sunshade
  const shadeMat = std(MAT.sunshade, 0.55);
  box(g, 6, 0.15, 2.5, px, slabY + 8.5, pz + (orient.frontSide === 'north' ? -1.2 : orient.frontSide === 'south' ? 1.2 : 0), shadeMat);

  // Main door frame (larger) on front
  const doorW = 3.8;
  const doorH = 7.5;
  const doorMat = std(MAT.doorMain, 0.55);
  const frameMat = std('#ffffff', 0.4);
  const doorX = px;
  const doorZ = orient.frontSide === 'north' ? pl - 0.2 : orient.frontSide === 'south' ? 0.2 : orient.frontSide === 'east' ? pw - 0.2 : 0.2;
  if (orient.frontSide === 'north' || orient.frontSide === 'south') {
    box(g, doorW + 0.3, doorH + 0.3, 0.2, doorX, slabY + doorH / 2, doorZ, frameMat);
    box(g, doorW, doorH, 0.12, doorX, slabY + doorH / 2, doorZ, doorMat);
  } else {
    box(g, 0.2, doorH + 0.3, doorW + 0.3, doorX, slabY + doorH / 2, pl / 2, frameMat);
    box(g, 0.12, doorH, doorW, doorX, slabY + doorH / 2, pl / 2, doorMat);
  }

  // Balcony on 1st floor front
  if (balcony) {
    const br = roomToWorld(balcony, pl);
    const bx = (br.minX + br.maxX) / 2;
    const bz = (br.minZ + br.maxZ) / 2;
    const by = WALL_HEIGHT + slabY;
    const railH = 3;
    const railMat = std(MAT.metal, 0.35, 0.4);
    box(g, br.maxX - br.minX, 0.12, br.maxZ - br.minZ, bx, by, bz, std(MAT.tile, 0.6));
    box(g, br.maxX - br.minX, railH, 0.08, bx, by + railH / 2, bz + (orient.frontSide === 'north' ? (br.maxZ - br.minZ) / 2 : -(br.maxZ - br.minZ) / 2), railMat);
  }

  // Facade accent panels on front living wall
  if (living) {
    const lr = roomToWorld(living, pl);
    const panelMat = std('#d4cfc4', 0.55);
    const lx = (lr.minX + lr.maxX) / 2;
    const lz = orient.frontSide === 'north' ? lr.maxZ + 0.14 : orient.frontSide === 'south' ? lr.minZ - 0.14 : lr.maxZ;
    if (orient.frontSide === 'north' || orient.frontSide === 'south') {
      box(g, 4, 5, 0.08, lx - 5, slabY + 5, lz, panelMat);
      box(g, 4, 5, 0.08, lx + 5, slabY + 5, lz, panelMat);
    }
  }

  // Exterior wall lights
  const lightMat = std(MAT.light, 0.2, 0.1);
  box(g, 0.25, 0.35, 0.15, px - 4, slabY + 6, doorZ, lightMat);
  box(g, 0.25, 0.35, 0.15, px + 4, slabY + 6, doorZ, lightMat);

  // Roof overhang at front
  const oh = std(MAT.parapet, 0.6);
  switch (orient.frontSide) {
    case 'north':
      box(g, pw + 1, 0.25, 1.2, pw / 2, wallTop + 0.1, pl + 0.6, oh);
      break;
    case 'south':
      box(g, pw + 1, 0.25, 1.2, pw / 2, wallTop + 0.1, -0.6, oh);
      break;
    case 'east':
      box(g, 1.2, 0.25, pl + 1, pw + 0.6, wallTop + 0.1, pl / 2, oh);
      break;
    case 'west':
      box(g, 1.2, 0.25, pl + 1, -0.6, wallTop + 0.1, pl / 2, oh);
      break;
  }

  return g;
}
