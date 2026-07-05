"use client";

import React, { useCallback, useEffect, useState } from 'react';
import FloorSwitcher from '@/components/FloorSwitcher';
import PlanViewer2D from '@/components/PlanViewer2D';
import PlanViewer3D from '@/components/PlanViewer3D';
import { clonePlan, findPlan } from '@/data/plans';
import type { FloorSelection, PlanData } from '@/types/plan';
import { countRooms } from '@/types/plan';

const plotOptions = [
  { label: '30 × 40', sub: '1200 sq ft · 2 BHK · 3 floors', val: '30x40', bhk: 2 },
  { label: '20 × 30', sub: '600 sq ft · 2 BHK duplex', val: '20x30', bhk: 2 },
  { label: '40 × 60', sub: '2400 sq ft · 4 BHK triplex', val: '40x60', bhk: 4 },
];

export default function Home() {
  const [selectedSize, setSelectedSize] = useState('30x40');
  const [selectedBhk, setSelectedBhk] = useState(2);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [floorSelection, setFloorSelection] = useState<FloorSelection>(0);
  const [editMode, setEditMode] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanData>(() => clonePlan(findPlan('30x40', 2)));

  const loadPlan = useCallback((size: string, bhk: number) => {
    setActivePlan(clonePlan(findPlan(size, bhk)));
    setFloorSelection(0);
    setEditMode(false);
  }, []);

  useEffect(() => {
    loadPlan(selectedSize, selectedBhk);
  }, [selectedSize, selectedBhk, loadPlan]);

  const sqFt = activePlan.meta.plot_width * activePlan.meta.plot_length;
  const floorLevels = activePlan.floors.map((f) => f.level);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            GP
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">GharPlan AI</h1>
            <p className="text-[11px] text-slate-500">Multi-floor plan builder</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
            {sqFt.toLocaleString()} sq ft
          </span>
          {activePlan.meta.vastu_score && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
              Vastu {activePlan.meta.vastu_score}%
            </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Plot Size</p>
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {plotOptions.map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  setSelectedSize(item.val);
                  setSelectedBhk(item.bhk);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                  selectedSize === item.val
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={`block text-[11px] ${selectedSize === item.val ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {item.sub}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Floor</p>
            <p className="mt-0.5 text-[10px] text-slate-400">2D filters blueprint · 3D shows selected level with context below</p>
          </div>
          <FloorSwitcher floorLevels={floorLevels} selection={floorSelection} onChange={setFloorSelection} />

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">View Mode</p>
          </div>
          <div className="px-3 pb-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                className={`rounded-md py-2 text-xs font-semibold transition-all ${
                  viewMode === '2d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2D Blueprint
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`rounded-md py-2 text-xs font-semibold transition-all ${
                  viewMode === '3d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                3D Model
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Builder</p>
          </div>
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                editMode
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {editMode ? '✓ Edit Mode On' : 'Edit Mode Off'}
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Drag rooms on a single floor. Positions snap to 0.5 ft grid and sync to 3D instantly.
            </p>
          </div>

          <div className="mt-auto border-t border-slate-100 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Plan</p>
            <p className="mt-1 text-xs font-medium text-slate-800">{activePlan.meta.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{activePlan.meta.bhk} BHK</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{activePlan.meta.facing} facing</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {activePlan.floors.length} floor{activePlan.floors.length > 1 ? 's' : ''}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{countRooms(activePlan)} rooms</span>
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 p-4">
          {viewMode === '2d' ? (
            <PlanViewer2D
              plan={activePlan}
              floorSelection={floorSelection}
              editMode={editMode}
              onPlanChange={setActivePlan}
            />
          ) : (
            <PlanViewer3D plan={activePlan} floorSelection={floorSelection} />
          )}
        </main>
      </div>
    </div>
  );
}