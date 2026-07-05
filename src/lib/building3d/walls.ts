import type { Floor, PlanData, Room } from '@/types/plan';
import { getPlotOrientation, isFrontExteriorEdge } from './orientation';
import {
  WALL_THICKNESS,
  edgeKey,
  floorBaseY,
  floorSlabTopY,
  floorWallTopY,
  isStairRoom,
  isOutdoorRoom,
  roomToWorld,
  round2,
  type FloorBuildContext,
  type OpeningSpec,
  type StairShaft,
  type WallEdge,
  type WorldRect,
} from './types';

const EPS = 0.08;

function onPlotExterior(rect: WorldRect, plotWidth: number, plotLength: number, side: 'west' | 'east' | 'south' | 'north'): boolean {
  switch (side) {
    case 'west':
      return rect.minX <= EPS;
    case 'east':
      return rect.maxX >= plotWidth - EPS;
    case 'south':
      return rect.minZ <= EPS;
    case 'north':
      return rect.maxZ >= plotLength - EPS;
  }
}

function addEdge(
  map: Map<string, WallEdge>,
  axis: 'x' | 'z',
  fixed: number,
  start: number,
  end: number,
  room: Room,
  isExterior: boolean
) {
  if (end - start < 0.4) return;
  if (isStairRoom(room)) return;

  const key = edgeKey(axis, fixed, start, end);
  const existing = map.get(key);
  if (existing) {
    if (!existing.roomIds.includes(room.id)) {
      existing.roomIds.push(room.id);
      existing.roomTypes.push(room.type);
      existing.roomNames.push(room.name);
    }
    existing.isExterior = existing.isExterior || isExterior;
    return;
  }

  map.set(key, {
    key,
    axis,
    fixed: round2(fixed),
    start: round2(Math.min(start, end)),
    end: round2(Math.max(start, end)),
    length: round2(Math.abs(end - start)),
    isExterior,
    roomIds: [room.id],
    roomTypes: [room.type],
    roomNames: [room.name],
  });
}

export function extractWallEdges(
  rooms: Room[],
  plotWidth: number,
  plotLength: number
): WallEdge[] {
  const map = new Map<string, WallEdge>();

  for (const room of rooms) {
    const r = roomToWorld(room, plotLength);

    addEdge(map, 'x', r.minZ, r.minX, r.maxX, room, onPlotExterior(r, plotWidth, plotLength, 'south'));
    addEdge(map, 'x', r.maxZ, r.minX, r.maxX, room, onPlotExterior(r, plotWidth, plotLength, 'north'));
    addEdge(map, 'z', r.minX, r.minZ, r.maxZ, room, onPlotExterior(r, plotWidth, plotLength, 'west'));
    addEdge(map, 'z', r.maxX, r.minZ, r.maxZ, room, onPlotExterior(r, plotWidth, plotLength, 'east'));
  }

  return [...map.values()];
}

export function findStairShafts(plan: PlanData): StairShaft[] {
  const shafts: StairShaft[] = [];
  const sorted = [...plan.floors].sort((a, b) => a.level - b.level);

  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1];
    const lowerStairs = lower.rooms.filter(isStairRoom);
    const upperStairs = upper.rooms.filter(isStairRoom);

    for (const ls of lowerStairs) {
      const lr = roomToWorld(ls, plan.meta.plot_length);
      for (const us of upperStairs) {
        const ur = roomToWorld(us, plan.meta.plot_length);
        if (!rectsOverlapSimple(lr, ur)) continue;
        shafts.push({
          level: lower.level,
          minX: Math.max(lr.minX, ur.minX),
          maxX: Math.min(lr.maxX, ur.maxX),
          minZ: Math.max(lr.minZ, ur.minZ),
          maxZ: Math.min(lr.maxZ, ur.maxZ),
        });
      }
    }
  }

  return shafts;
}

function rectsOverlapSimple(a: WorldRect, b: WorldRect): boolean {
  return a.minX < b.maxX - EPS && a.maxX > b.minX + EPS && a.minZ < b.maxZ - EPS && a.maxZ > b.minZ + EPS;
}

function roomById(rooms: Room[], id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

function prefersWindow(type: string): boolean {
  return type === 'living' || type === 'bedroom';
}


/** Plan-driven openings: main door on front facade; windows only on living/bedroom exterior edges. */
export function resolveOpening(
  edge: WallEdge,
  rooms: Room[],
  plan: PlanData
): OpeningSpec | undefined {
  if (edge.length < 2.5) return undefined;

  const linked = edge.roomIds
    .map((id) => roomById(rooms, id))
    .filter((r): r is Room => !!r && !isStairRoom(r));

  if (linked.length === 0) return undefined;

  const orient = getPlotOrientation(plan);
  const pw = plan.meta.plot_width;
  const pl = plan.meta.plot_length;
  const isFront = edge.isExterior && isFrontExteriorEdge(edge, orient, pw, pl);

  if (isFront) {
    const hasLiving = linked.some((r) => r.type === 'living');
    const hasEntry = linked.some((r) => isOutdoorRoom(r) || /entry|porch|stair/i.test(r.name));
    if (hasLiving || hasEntry) {
      return { offset: (edge.length - Math.min(4.2, edge.length * 0.35)) / 2, size: Math.min(4.2, edge.length * 0.35), type: 'door', isMain: true };
    }
    const windowRoom = linked.find((r) => prefersWindow(r.type));
    if (windowRoom && edge.length >= 4) {
      const size = Math.min(4, edge.length * 0.32);
      return { offset: (edge.length - size) / 2, size, type: 'window' };
    }
    return undefined;
  }

  if (edge.isExterior) {
    const windowRoom = linked.find((r) => prefersWindow(r.type));
    if (!windowRoom || edge.length < 4.5) return undefined;
    const size = Math.min(3.8, edge.length * 0.3);
    return { offset: (edge.length - size) / 2, size, type: 'window' };
  }

  const hasLiving = linked.some((r) => r.type === 'living');
  const hasBedroom = linked.some((r) => r.type === 'bedroom');
  const hasService = linked.some((r) => r.type === 'service');

  if (hasLiving && (hasBedroom || hasService)) {
    const size = Math.min(3, edge.length * 0.38);
    return { offset: (edge.length - size) / 2, size, type: 'door', isMain: false };
  }

  if (hasBedroom && hasService) {
    const size = Math.min(2.6, edge.length * 0.34);
    return { offset: edge.length * 0.18, size, type: 'door', isMain: false };
  }

  return undefined;
}

export function buildFloorContexts(plan: PlanData): FloorBuildContext[] {
  const sorted = [...plan.floors].sort((a, b) => a.level - b.level);
  const shafts = findStairShafts(plan);
  const maxLevel = sorted[sorted.length - 1]?.level ?? 0;

  return sorted.map((floor) => ({
    level: floor.level,
    plotWidth: plan.meta.plot_width,
    plotLength: plan.meta.plot_length,
    baseY: floorBaseY(floor.level),
    slabTopY: floorSlabTopY(floor.level),
    wallTopY: floorWallTopY(floor.level),
    rooms: floor.rooms,
    edges: extractWallEdges(floor.rooms, plan.meta.plot_width, plan.meta.plot_length),
    stairShafts: shafts.filter((s) => s.level === floor.level),
    isTopFloor: floor.level === maxLevel,
  }));
}

export function getBuiltFootprint(rooms: Room[], plotLength: number): WorldRect {
  const indoor = rooms.filter((r) => !isStairRoom(r));
  if (indoor.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const room of indoor) {
    const r = roomToWorld(room, plotLength);
    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minZ = Math.min(minZ, r.minZ);
    maxZ = Math.max(maxZ, r.maxZ);
  }
  return { minX, maxX, minZ, maxZ };
}

export function pointInShaft(x: number, z: number, shaft: StairShaft): boolean {
  return x >= shaft.minX + EPS && x <= shaft.maxX - EPS && z >= shaft.minZ + EPS && z <= shaft.maxZ - EPS;
}

export function edgeCrossesShaft(edge: WallEdge, shaft: StairShaft): boolean {
  if (edge.axis === 'x') {
    return edge.fixed >= shaft.minZ - EPS && edge.fixed <= shaft.maxZ + EPS && edge.start < shaft.maxX - EPS && edge.end > shaft.minX + EPS;
  }
  return edge.fixed >= shaft.minX - EPS && edge.fixed <= shaft.maxX + EPS && edge.start < shaft.maxZ - EPS && edge.end > shaft.minZ + EPS;
}

/** Skip walls entirely inside a stair shaft opening (upper floor void). */
export function shouldSkipWallForShaft(edge: WallEdge, ctx: FloorBuildContext): boolean {
  for (const shaft of ctx.stairShafts) {
    if (edgeCrossesShaft(edge, shaft)) {
      const midX = edge.axis === 'z' ? edge.fixed : (edge.start + edge.end) / 2;
      const midZ = edge.axis === 'x' ? edge.fixed : (edge.start + edge.end) / 2;
      if (pointInShaft(midX, midZ, shaft)) return true;
    }
  }
  return false;
}

export { type Floor };
