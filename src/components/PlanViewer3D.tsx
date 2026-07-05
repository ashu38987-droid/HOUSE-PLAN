"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildBuilding, disposeGroup, getCameraFocus } from '@/lib/building3d';
import { getPlotOrientation } from '@/lib/building3d/orientation';
import type { FloorSelection, PlanData } from '@/types/plan';
import { getFloorLabel } from '@/types/plan';

interface PlanViewer3DProps {
  plan: PlanData;
  floorSelection: FloorSelection;
}

function lerpVec(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number) {
  out.lerpVectors(a, b, t);
  return out;
}

export default function PlanViewer3D({ plan, floorSelection }: PlanViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCamera = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c8dce8');
    scene.fog = new THREE.Fog('#c8dce8', 80, 220);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight('#87ceeb', '#8b9a6b', 0.42));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
    const orient = getPlotOrientation(plan);
    switch (orient.frontSide) {
      case 'north':
        sun.position.set(plan.meta.plot_width / 2, 60, plan.meta.plot_length + 40);
        break;
      case 'south':
        sun.position.set(plan.meta.plot_width / 2, 60, -40);
        break;
      case 'east':
        sun.position.set(plan.meta.plot_width + 40, 60, plan.meta.plot_length / 2);
        break;
      case 'west':
        sun.position.set(-40, 60, plan.meta.plot_length / 2);
        break;
    }
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0002;
    scene.add(sun);

    const building = buildBuilding(plan, floorSelection);
    scene.add(building);

    const { position: targetPos, target: targetLook } = getCameraFocus(plan, floorSelection);
    const desiredPos = targetPos.clone();
    const desiredTarget = targetLook.clone();

    const currentPos = lastCamera.current?.pos.clone() ?? desiredPos.clone();
    const currentTarget = lastCamera.current?.target.clone() ?? desiredTarget.clone();

    if (!lastCamera.current) {
      camera.position.copy(desiredPos);
      controls.target.copy(desiredTarget);
    } else {
      camera.position.copy(currentPos);
      controls.target.copy(currentTarget);
    }

    let animT = lastCamera.current ? 0 : 1;
    const animDuration = 0.85;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 400;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const tick = (time: number) => {
      animationFrameId = requestAnimationFrame(tick);

      if (animT < 1) {
        animT = Math.min(1, animT + 1 / (60 * animDuration));
        const ease = 1 - Math.pow(1 - animT, 3);
        lerpVec(camera.position, currentPos, desiredPos, ease);
        lerpVec(controls.target, currentTarget, desiredTarget, ease);
      } else {
        lastCamera.current = {
          pos: camera.position.clone(),
          target: controls.target.clone(),
        };
      }

      controls.update();
      renderer.render(scene, camera);
    };
    tick(0);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      disposeGroup(building);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [plan, floorSelection]);

  const label =
    floorSelection === 'all'
      ? 'All floors'
      : getFloorLabel(typeof floorSelection === 'number' ? floorSelection : 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="shrink-0 border-b border-slate-100 px-4 py-2">
        <p className="text-xs text-slate-500">
          {label} · {plan.meta.facing} facing · front elevation view · gate, garden & driveway visible
        </p>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 bg-slate-50" />
    </div>
  );
}
