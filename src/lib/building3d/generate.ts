import * as THREE from 'three';
import type { FloorSelection, PlanData } from '@/types/plan';
import { buildFrontElevation } from './elevation';
import { buildLandscape } from './landscape';
import { getFrontCameraPreset } from './orientation';
import { MAT, faded, glass, std } from './materials';
import { buildLShapeStairs, buildShaftOpening } from './stairs';
import {
  ROOF_THICKNESS,
  SLAB_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  floorBaseY,
  isOutdoorRoom,
  isStairRoom,
  roomToWorld,
  type FloorBuildContext,
  type OpeningSpec,
} from './types';
import { buildFloorContexts, resolveOpening, shouldSkipWallForShaft } from './walls';

const FLOOR_COLORS: Record<string, string> = {
  bedroom: '#ede7dc',
  living: '#f1ece0',
  service: '#e9e4d8',
  outdoor: '#c7cad0',
};

function floorColor(type: string) {
  return FLOOR_COLORS[type] ?? '#e8e6df';
}

function opacityForLevel(level: number, selection: FloorSelection): number {
  if (selection === 'all') return 1;
  if (level === selection) return 1;
  if (level < selection) return 0.3;
  return 0.08;
}

function addBox(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

function buildWallMesh(
  edge: { axis: 'x' | 'z'; fixed: number; start: number; end: number; length: number },
  wallBaseY: number,
  wallHeight: number,
  mat: THREE.Material,
  opening?: OpeningSpec
) {
  const group = new THREE.Group();
  const t = WALL_THICKNESS;
  const length = edge.length;
  const centerAlong = edge.start + length / 2;
  const centerY = wallBaseY + wallHeight / 2;

  const place = (w: number, h: number, d: number, px: number, py: number, pz: number, m: THREE.Material) => {
    addBox(group, w, h, d, px, py, pz, m);
  };

  if (!opening || opening.size <= 0.2 || opening.size >= length - 0.4) {
    if (edge.axis === 'x') place(length, wallHeight, t, centerAlong, centerY, edge.fixed, mat);
    else place(t, wallHeight, length, edge.fixed, centerY, centerAlong, mat);
    return group;
  }

  const { offset, size, type, isMain } = opening;
  const oStart = edge.start + offset;
  const oEnd = oStart + size;
  const sillH = type === 'window' ? 2.2 : 0;
  const openH = type === 'window' ? 4 : isMain ? 7.2 : 6.5;
  const openTop = Math.min(sillH + openH, wallHeight - 0.2);

  const segments: { s: number; e: number }[] = [];
  if (oStart - edge.start > 0.05) segments.push({ s: edge.start, e: oStart });
  if (edge.end - oEnd > 0.05) segments.push({ s: oEnd, e: edge.end });

  for (const seg of segments) {
    const segLen = seg.e - seg.s;
    const segCenter = seg.s + segLen / 2;
    if (edge.axis === 'x') place(segLen, wallHeight, t, segCenter, centerY, edge.fixed, mat);
    else place(t, wallHeight, segLen, edge.fixed, centerY, segCenter, mat);
  }

  const lintelH = wallHeight - openTop;
  const frame = std('#ffffff', 0.4);
  const lintelCenter = oStart + size / 2;
  if (lintelH > 0.05) {
    if (edge.axis === 'x') place(size, lintelH, t, lintelCenter, wallBaseY + openTop + lintelH / 2, edge.fixed, mat);
    else place(t, lintelH, size, edge.fixed, wallBaseY + openTop + lintelH / 2, lintelCenter, mat);
  }
  if (sillH > 0.05) {
    if (edge.axis === 'x') place(size, sillH, t, lintelCenter, wallBaseY + sillH / 2, edge.fixed, frame);
    else place(t, sillH, size, edge.fixed, wallBaseY + sillH / 2, lintelCenter, frame);
  }

  if (type === 'window') {
    const g = glass();
    if (edge.axis === 'x') addBox(group, size * 0.88, openH * 0.82, t * 0.28, lintelCenter, wallBaseY + sillH + openH / 2, edge.fixed, g);
    else addBox(group, t * 0.28, openH * 0.82, size * 0.88, edge.fixed, wallBaseY + sillH + openH / 2, lintelCenter, g);
    if (edge.axis === 'x') place(size * 0.92, 0.12, t * 0.32, lintelCenter, wallBaseY + sillH + openH / 2, edge.fixed, frame);
    else place(t * 0.32, 0.12, size * 0.92, edge.fixed, wallBaseY + sillH + openH / 2, lintelCenter, frame);
  } else {
    const doorColor = isMain ? MAT.doorMain : MAT.doorInner;
    const doorH = openH * 0.96;
    const doorW = size * (isMain ? 0.92 : 0.86);
    const doorMat = std(doorColor, 0.55);
    if (edge.axis === 'x') place(doorW, doorH, t * 0.22, lintelCenter, wallBaseY + doorH / 2, edge.fixed, doorMat);
    else place(t * 0.22, doorH, doorW, edge.fixed, wallBaseY + doorH / 2, lintelCenter, doorMat);
  }

  return group;
}

function buildFloorSlab(ctx: FloorBuildContext, opacity: number, g: THREE.Group) {
  const { plotWidth, plotLength, baseY, rooms } = ctx;
  const slabMat = faded(std(MAT.concrete, 0.8), opacity);

  if (ctx.level === 0) {
    addBox(g, plotWidth + 0.5, 0.25, plotLength + 0.5, plotWidth / 2, baseY - 0.125, plotLength / 2, faded(std(MAT.concrete, 0.9), opacity));
  }

  addBox(g, plotWidth, SLAB_THICKNESS, plotLength, plotWidth / 2, baseY + SLAB_THICKNESS / 2, plotLength / 2, slabMat);

  for (const room of rooms) {
    if (isStairRoom(room)) continue;
    const r = roomToWorld(room, plotLength);
    addBox(g, room.width, 0.04, room.length, (r.minX + r.maxX) / 2, ctx.slabTopY + 0.02, (r.minZ + r.maxZ) / 2, faded(std(floorColor(room.type), 0.72), opacity));
  }
}

function buildRoofAndParapet(ctx: FloorBuildContext, opacity: number, g: THREE.Group, plan: PlanData) {
  if (!ctx.isTopFloor) return;
  const pw = ctx.plotWidth;
  const pl = ctx.plotLength;
  const y = ctx.wallTopY;

  addBox(g, pw + 0.8, ROOF_THICKNESS, pl + 0.8, pw / 2, y + ROOF_THICKNESS / 2, pl / 2, faded(std(MAT.roof, 0.75), opacity));

  const parapetH = 1.4;
  const pt = 0.2;
  const pm = faded(std(MAT.parapet, 0.6), opacity);
  addBox(g, pw + 0.6, parapetH, pt, pw / 2, y + ROOF_THICKNESS + parapetH / 2, pt / 2, pm);
  addBox(g, pw + 0.6, parapetH, pt, pw / 2, y + ROOF_THICKNESS + parapetH / 2, pl - pt / 2, pm);
  addBox(g, pt, parapetH, pl + 0.6, pt / 2, y + ROOF_THICKNESS + parapetH / 2, pl / 2, pm);
  addBox(g, pt, parapetH, pl + 0.6, pw - pt / 2, y + ROOF_THICKNESS + parapetH / 2, pl / 2, pm);

  const terrace = plan.floors[ctx.level]?.rooms.find((r) => /terrace/i.test(r.name));
  if (terrace) {
    const tr = roomToWorld(terrace, pl);
    addBox(g, tr.maxX - tr.minX, 0.06, tr.maxZ - tr.minZ, (tr.minX + tr.maxX) / 2, y + ROOF_THICKNESS + 0.03, (tr.minZ + tr.maxZ) / 2, faded(std(MAT.tile, 0.65), opacity));
  }

  // Water tank on roof
  addBox(g, 2.2, 1.6, 2.2, pw - 3, y + ROOF_THICKNESS + 1.6, pl - 3, faded(std(MAT.waterTank, 0.4, 0.2), opacity));
}

function buildFloorLevel(ctx: FloorBuildContext, opacity: number, plan: PlanData): THREE.Group {
  const g = new THREE.Group();
  g.userData.level = ctx.level;
  if (opacity < 0.05) return g;

  buildFloorSlab(ctx, opacity, g);

  const wallMat = faded(std(MAT.wall, 0.62), opacity);
  const wallBaseY = ctx.slabTopY;
  const wallHeight = ctx.wallTopY - ctx.slabTopY;

  for (const edge of ctx.edges) {
    if (shouldSkipWallForShaft(edge, ctx)) continue;
    const opening = resolveOpening(edge, ctx.rooms, plan);
    g.add(buildWallMesh(edge, wallBaseY, wallHeight, wallMat, opening));
  }

  if (!ctx.isTopFloor) {
    addBox(g, ctx.plotWidth, 0.08, ctx.plotLength, ctx.plotWidth / 2, ctx.wallTopY - 0.04, ctx.plotLength / 2, faded(std(MAT.wallAccent, 0.7), opacity * 0.85));
  }

  buildRoofAndParapet(ctx, opacity, g, plan);

  for (const shaft of ctx.stairShafts) {
    buildShaftOpening(ctx, shaft, opacity, g);
    buildLShapeStairs(shaft, ctx, opacity, g);
  }

  return g;
}

export function buildBuilding(plan: PlanData, floorSelection: FloorSelection): THREE.Group {
  const root = new THREE.Group();
  const contexts = buildFloorContexts(plan);

  root.add(buildLandscape(plan));

  const levelsToRender =
    floorSelection === 'all'
      ? contexts.map((c) => c.level)
      : contexts.filter((c) => c.level <= floorSelection).map((c) => c.level);

  for (const ctx of contexts) {
    if (!levelsToRender.includes(ctx.level)) continue;
    root.add(buildFloorLevel(ctx, opacityForLevel(ctx.level, floorSelection), plan));
  }

  const ground = contexts.find((c) => c.level === 0);
  if (ground) {
    root.add(buildFrontElevation(plan, ground, floorSelection === 'all' || floorSelection === 0 ? 1 : 0.35));
  }

  return root;
}

export function getCameraFocus(plan: PlanData, floorSelection: FloorSelection) {
  const preset = getFrontCameraPreset(plan, floorSelection);
  const maxLevel = Math.max(...plan.floors.map((f) => f.level), 0);
  return {
    position: preset.position,
    target: preset.target,
    stackHeight: (maxLevel + 1) * WALL_HEIGHT,
  };
}

export function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}
