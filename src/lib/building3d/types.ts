import type { Room } from '@/types/plan';

export const WALL_HEIGHT = 10;
export const WALL_THICKNESS = 0.25;
export const SLAB_THICKNESS = 0.2;
export const ROOF_THICKNESS = 0.35;

export type WallAxis = 'x' | 'z';

export interface WorldRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WallEdge {
  key: string;
  axis: WallAxis;
  fixed: number;
  start: number;
  end: number;
  length: number;
  isExterior: boolean;
  roomIds: string[];
  roomTypes: string[];
  roomNames: string[];
}

export interface StairShaft {
  level: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface OpeningSpec {
  offset: number;
  size: number;
  type: 'door' | 'window';
  isMain?: boolean;
}

export interface FloorBuildContext {
  level: number;
  plotWidth: number;
  plotLength: number;
  baseY: number;
  slabTopY: number;
  wallTopY: number;
  rooms: Room[];
  edges: WallEdge[];
  stairShafts: StairShaft[];
  isTopFloor: boolean;
}

export function roomToWorld(room: Room, plotLength: number): WorldRect {
  return {
    minX: room.x,
    maxX: room.x + room.width,
    minZ: plotLength - (room.y + room.length),
    maxZ: plotLength - room.y,
  };
}

export function isStairRoom(room: Room): boolean {
  return /stair/i.test(room.id) || /stair/i.test(room.name);
}

export function isOutdoorRoom(room: Room): boolean {
  return room.type === 'outdoor';
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function edgeKey(axis: WallAxis, fixed: number, start: number, end: number): string {
  const s = round2(Math.min(start, end));
  const e = round2(Math.max(start, end));
  return `${axis}|${round2(fixed)}|${s}|${e}`;
}

export function rectsOverlap(a: WorldRect, b: WorldRect, eps = 0.05): boolean {
  return a.minX < b.maxX - eps && a.maxX > b.minX + eps && a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;
}

export function floorBaseY(level: number): number {
  return level * WALL_HEIGHT;
}

export function floorSlabTopY(level: number): number {
  return floorBaseY(level) + SLAB_THICKNESS;
}

export function floorWallTopY(level: number): number {
  return floorBaseY(level) + WALL_HEIGHT;
}
