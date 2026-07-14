import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { exportBuilding } from './building3d/generate';
import type { FloorSelection, PlanData } from '@/types/plan';

function save(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  document.body.removeChild(link);
}

function saveArrayBuffer(buffer: ArrayBuffer, filename: string) {
  save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

export function exportPlanToGlb(plan: PlanData, floorSelection: FloorSelection) {
  const exporter = new GLTFExporter();
  // Build the 3D model for the selected floor(s) for export
  const scene = exportBuilding(plan, floorSelection);
  const safeTitle = plan.meta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const selectionSuffix = floorSelection === 'all' ? '' : `_floor_${floorSelection}`;

  exporter.parse(
    scene,
    (gltf) => {
      saveArrayBuffer(gltf as ArrayBuffer, `${safeTitle || 'gharplan_model'}${selectionSuffix}.glb`);
    },
    (error) => {
      console.error('An error happened during GLTF exportation:', error);
      alert('Could not export 3D model.');
    },
    { binary: true } // This option ensures the output is a GLB file.
  );
}