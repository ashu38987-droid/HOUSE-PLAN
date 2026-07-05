export const GRID_SNAP = 0.5;

export function snapToGrid(value: number, grid = GRID_SNAP): number {
  return Math.round(value / grid) * grid;
}

export function clampRoomPosition(
  x: number,
  y: number,
  width: number,
  length: number,
  plotWidth: number,
  plotLength: number
): { x: number; y: number } {
  return {
    x: snapToGrid(Math.max(0, Math.min(x, plotWidth - width))),
    y: snapToGrid(Math.max(0, Math.min(y, plotLength - length))),
  };
}

export function clampAssetPosition(
  x: number,
  y: number,
  assetWidth: number,
  assetLength: number,
  roomWidth: number,
  roomLength: number
): { x: number; y: number } {
  return {
    x: snapToGrid(Math.max(0, Math.min(x, roomWidth - assetWidth))),
    y: snapToGrid(Math.max(0, Math.min(y, roomLength - assetLength))),
  };
}
