export type AssetCategory = 'furniture' | 'fixture' | 'vehicle';

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  width: number;
  length: number;
  /** SVG path in a 1×1 unit box (scaled to width×length at render time) */
  svgPath: string;
  color: string;
}

export const ASSET_CATALOG: Record<string, AssetDefinition> = {
  sofa: {
    id: 'sofa',
    name: 'Sofa',
    category: 'furniture',
    width: 6,
    length: 2.5,
    color: '#64748b',
    svgPath: 'M0.05 0.35 H0.95 V0.75 H0.85 V0.95 H0.15 V0.75 H0.05 Z M0.1 0.1 H0.9 V0.35 H0.1 Z',
  },
  dining_table: {
    id: 'dining_table',
    name: 'Dining Table',
    category: 'furniture',
    width: 4,
    length: 3,
    color: '#8b6b4a',
    svgPath: 'M0.1 0.15 H0.9 V0.85 H0.1 Z M0.18 0.22 H0.28 V0.78 H0.18 Z M0.72 0.22 H0.82 V0.78 H0.72 Z',
  },
  car: {
    id: 'car',
    name: 'Car',
    category: 'vehicle',
    width: 6,
    length: 14,
    color: '#6366f1',
    svgPath: 'M0.08 0.35 H0.92 V0.65 H0.82 V0.85 H0.18 V0.65 H0.08 Z M0.25 0.15 H0.75 V0.35 H0.25 Z',
  },
  toilet: {
    id: 'toilet',
    name: 'Toilet',
    category: 'fixture',
    width: 1.5,
    length: 2,
    color: '#e2e8f0',
    svgPath: 'M0.2 0.1 H0.8 V0.45 H0.7 V0.9 H0.3 V0.45 H0.2 Z',
  },
  sink: {
    id: 'sink',
    name: 'Sink',
    category: 'fixture',
    width: 2,
    length: 1.5,
    color: '#cbd5e1',
    svgPath: 'M0.1 0.2 H0.9 V0.8 H0.1 Z M0.35 0.35 A0.2 0.2 0 1 1 0.65 0.35 A0.2 0.2 0 1 1 0.35 0.35',
  },
  bed: {
    id: 'bed',
    name: 'Bed',
    category: 'furniture',
    width: 5,
    length: 6.5,
    color: '#a78bfa',
    svgPath: 'M0.05 0.1 H0.95 V0.9 H0.05 Z M0.1 0.15 H0.9 V0.35 H0.1 Z',
  },
};

export function getAsset(id: string): AssetDefinition | undefined {
  return ASSET_CATALOG[id];
}

export { createAssetMesh } from './meshes3d';
