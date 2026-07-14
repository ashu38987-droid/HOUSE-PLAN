export interface PlacedAsset {
  id: string;
  assetId: string;
  x: number;
  y: number;
  rotation?: number;
}

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  length: number;
  type: string;
  assets?: PlacedAsset[];
}

export interface Opening {
  id: string;
  kind: 'door' | 'window';
  hostRoomId: string;
  edge: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  width: number;
}

export interface Floor {
  level: number;
  label?: string;
  rooms: Room[];
  openings?: Opening[];
}

export interface PlanData {
  plan_id: string;
  meta: {
    title: string;
    plot_width: number;
    plot_length: number;
    facing: string;
    bhk: number;
    floors?: number;
    vastu_score?: number;
  };
  setbacks?: {
    front: number;
    rear: number;
    left: number;
    right: number;
  };
  floors: Floor[];
}

export type FloorSelection = number | 'all';

export function getFloorLabel(level: number): string {
  if (level === 0) return 'Ground';

  let suffix = 'th';
  if (level % 10 === 1 && level % 100 !== 11) {
    suffix = 'st';
  } else if (level % 10 === 2 && level % 100 !== 12) {
    suffix = 'nd';
  } else if (level % 10 === 3 && level % 100 !== 13) {
    suffix = 'rd';
  }

  return `${level}${suffix} Floor`;
}

export function getFloorByLevel(plan: PlanData, level: number): Floor | undefined {
  return plan.floors.find((f) => f.level === level);
}

export function getRoomsForSelection(plan: PlanData, selection: FloorSelection): { floor: Floor; rooms: Room[] }[] {
  if (selection === 'all') {
    return plan.floors.map((floor) => ({ floor, rooms: floor.rooms }));
  }
  const floor = getFloorByLevel(plan, selection);
  return floor ? [{ floor, rooms: floor.rooms }] : [];
}

export function countRooms(plan: PlanData): number {
  return plan.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
}

export function updateRoomPosition(
  plan: PlanData,
  floorLevel: number,
  roomId: string,
  x: number,
  y: number
): PlanData {
  return {
    ...plan,
    floors: plan.floors.map((floor) =>
      floor.level !== floorLevel
        ? floor
        : {
            ...floor,
            rooms: floor.rooms.map((room) =>
              room.id === roomId ? { ...room, x, y } : room
            ),
          }
    ),
  };
}

export function updateAssetPosition(
  plan: PlanData,
  floorLevel: number,
  roomId: string,
  assetId: string,
  x: number,
  y: number
): PlanData {
  return {
    ...plan,
    floors: plan.floors.map((floor) =>
      floor.level !== floorLevel
        ? floor
        : {
            ...floor,
            rooms: floor.rooms.map((room) =>
              room.id !== roomId
                ? room
                : {
                    ...room,
                    assets: (room.assets ?? []).map((asset) =>
                      asset.id === assetId ? { ...asset, x, y } : asset
                    ),
                  }
            ),
          }
    ),
  };
}
