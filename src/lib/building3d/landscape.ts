import * as THREE from 'three';
import type { PlanData } from '@/types/plan';
import { getPlotOrientation, type PlotOrientation } from './orientation';
import { MAT, std } from './materials';
import { isOutdoorRoom, roomToWorld } from './types';

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = true;
  g.add(m);
}

function cylinder(g: THREE.Group, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 8), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  g.add(m);
}

function frontRect(orient: PlotOrientation, pw: number, pl: number, depth: number) {
  const d = depth;
  switch (orient.frontSide) {
    case 'north':
      return { cx: pw / 2, cz: pl + d / 2, w: pw + 8, l: d };
    case 'south':
      return { cx: pw / 2, cz: -d / 2, w: pw + 8, l: d };
    case 'east':
      return { cx: pw + d / 2, cz: pl / 2, w: d, l: pl + 8 };
    case 'west':
      return { cx: -d / 2, cz: pl / 2, w: d, l: pl + 8 };
  }
}

export function buildLandscape(plan: PlanData): THREE.Group {
  const g = new THREE.Group();
  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const orient = getPlotOrientation(plan);
  const ground0 = plan.floors[0]?.rooms ?? [];

  const parking = ground0.find((r) => isOutdoorRoom(r) && /park|porch|car/i.test(r.name));
  const parkingRect = parking ? roomToWorld(parking, pl) : null;

  // Road in front of plot
  const road = frontRect(orient, pw, pl, 12);
  box(g, road.w, 0.12, road.l, road.cx, -0.06, road.cz, std(MAT.road, 0.92));

  // Grass plot pad
  box(g, pw + 4, 0.08, pl + 4, pw / 2, -0.04, pl / 2, std(MAT.grass, 0.95));

  // Front lawn strip
  const lawnD = 5;
  switch (orient.frontSide) {
    case 'north':
      box(g, pw, 0.05, lawnD, pw / 2, 0.01, pl + lawnD / 2, std(MAT.grass, 0.9));
      break;
    case 'south':
      box(g, pw, 0.05, lawnD, pw / 2, 0.01, -lawnD / 2, std(MAT.grass, 0.9));
      break;
    case 'east':
      box(g, lawnD, 0.05, pl, pw + lawnD / 2, 0.01, pl / 2, std(MAT.grass, 0.9));
      break;
    case 'west':
      box(g, lawnD, 0.05, pl, -lawnD / 2, 0.01, pl / 2, std(MAT.grass, 0.9));
      break;
  }

  // Compound boundary wall
  const wallH = 2.8;
  const wt = 0.35;
  const wm = std(MAT.boundary, 0.75);
  box(g, pw + 3, wallH, wt, pw / 2, wallH / 2, -1.5, wm);
  box(g, pw + 3, wallH, wt, pw / 2, wallH / 2, pl + 1.5, wm);
  box(g, wt, wallH, pl + 3, -1.5, wallH / 2, pl / 2, wm);
  box(g, wt, wallH, pl + 3, pw + 1.5, wallH / 2, pl / 2, wm);

  // Main gate + pedestrian gate on front wall
  const gateMat = std(MAT.gate, 0.45, 0.25);
  const gateW = 10;
  const gateH = 2.4;
  switch (orient.frontSide) {
    case 'north':
      box(g, gateW, gateH, 0.12, pw / 2, gateH / 2, pl + 1.5, gateMat);
      box(g, 1.2, 2, 0.1, pw / 2 - gateW / 2 - 1.5, 1, pl + 1.5, gateMat);
      break;
    case 'south':
      box(g, gateW, gateH, 0.12, pw / 2, gateH / 2, -1.5, gateMat);
      box(g, 1.2, 2, 0.1, pw / 2 + gateW / 2 + 1.5, 1, -1.5, gateMat);
      break;
    case 'east':
      box(g, 0.12, gateH, gateW, pw + 1.5, gateH / 2, pl / 2, gateMat);
      box(g, 0.1, 2, 1.2, pw + 1.5, 1, pl / 2 + gateW / 2 + 1.5, gateMat);
      break;
    case 'west':
      box(g, 0.12, gateH, gateW, -1.5, gateH / 2, pl / 2, gateMat);
      box(g, 0.1, 2, 1.2, -1.5, 1, pl / 2 - gateW / 2 - 1.5, gateMat);
      break;
  }

  // Driveway from gate to parking
  if (parkingRect) {
    const pcx = (parkingRect.minX + parkingRect.maxX) / 2;
    const pcz = (parkingRect.minZ + parkingRect.maxZ) / 2;
    const pave = std(MAT.driveway, 0.8);
    const pathW = 4;
    switch (orient.frontSide) {
      case 'north':
        box(g, pathW, 0.06, pl + 8 - pcz, pcx, 0.03, (pl + 8 + pcz) / 2, pave);
        break;
      case 'south':
        box(g, pathW, 0.06, pcz + 8, pcx, 0.03, (pcz - 8) / 2, pave);
        break;
      case 'east':
        box(g, pw + 8 - pcx, 0.06, pathW, (pw + 8 + pcx) / 2, 0.03, pcz, pave);
        break;
      case 'west':
        box(g, pcx + 8, 0.06, pathW, (pcx - 8) / 2, 0.03, pcz, pave);
        break;
    }
    // Parking tile markings
    const tile = std(MAT.pavement, 0.7);
    box(g, parkingRect.maxX - parkingRect.minX, 0.04, parkingRect.maxZ - parkingRect.minZ, pcx, 0.06, pcz, tile);
  }

  // Walkway to entrance (center of front)
  const walk = std(MAT.pavement, 0.6);
  const ww = 1.8;
  switch (orient.frontSide) {
    case 'north':
      box(g, ww, 0.05, 6, pw / 2, 0.04, pl + 3, walk);
      break;
    case 'south':
      box(g, ww, 0.05, 6, pw / 2, 0.04, -3, walk);
      break;
    case 'east':
      box(g, 6, 0.05, ww, pw + 3, 0.04, pl / 2, walk);
      break;
    case 'west':
      box(g, 6, 0.05, ww, -3, 0.04, pl / 2, walk);
      break;
  }

  // Trees & plants
  const treeMat = std(MAT.treeTrunk);
  const leafMat = std(MAT.plant, 0.85);
  const plantMat = std(MAT.grassDark, 0.9);
  const treeSpots: [number, number][] = [
    [2, pl + 2],
    [pw - 2, pl + 2],
    [-2, pl / 2],
    [pw + 2, pl / 2],
  ];
  if (orient.frontSide === 'south') {
    treeSpots[0] = [2, -2];
    treeSpots[1] = [pw - 2, -2];
  }
  for (const [tx, tz] of treeSpots) {
    cylinder(g, 0.35, 2.5, tx, 0, tz, treeMat);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), leafMat);
    crown.position.set(tx, 3.8, tz);
    crown.castShadow = true;
    g.add(crown);
  }
  for (let i = 0; i < 6; i++) {
    const px = 4 + i * ((pw - 8) / 5);
    const pz = orient.frontSide === 'north' ? pl + 1.2 : orient.frontSide === 'south' ? -1.2 : pl / 2;
    cylinder(g, 0.15, 0.5, px, 0, pz, plantMat);
  }

  // House number plate at gate
  box(g, 0.8, 0.4, 0.05, pw / 2 + 6, 1.6, orient.frontSide === 'north' ? pl + 1.55 : orient.frontSide === 'south' ? -1.55 : pl / 2, std('#1e293b', 0.4));

  return g;
}
