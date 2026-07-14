"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { exportPlanToGlb } from '@/lib/export';
import FloorSwitcher from '@/components/FloorSwitcher';
import PlanViewer2D from '@/components/PlanViewer2D';
import PlanViewer3D from '@/components/PlanViewer3D';
import type { PlanViewerRef } from '@/components/PlanViewer2D';
import Toolbox from '@/components/Toolbox';
import { clonePlan, findPlan } from '@/data/plans';
import type { Floor, FloorSelection, PlanData } from '@/types/plan';
import { countRooms, getFloorLabel } from '@/types/plan';

const defaultPlotOptions = [
  { label: '30 × 40', sub: '1200 sq ft · 2 BHK · 3 floors', val: '30x40', bhk: 2 },
  { label: '20 × 30', sub: '600 sq ft · 2 BHK duplex', val: '20x30', bhk: 2 },
  { label: '40 × 60', sub: '2400 sq ft · 4 BHK triplex', val: '40x60', bhk: 4 },
];

const LOCAL_STORAGE_KEY = 'gharplan_active_project';

export default function Home() {
  const [plotOptions, setPlotOptions] = useState(defaultPlotOptions);
  const [selectedSize, setSelectedSize] = useState('30x40');
  const [selectedBhk, setSelectedBhk] = useState(2);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [floorSelection, setFloorSelection] = useState<FloorSelection>(0);
  const [editMode, setEditMode] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanData | null>(null);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isCustomPlotModalOpen, setIsCustomPlotModalOpen] = useState(false);
  const [customPlotSize, setCustomPlotSize] = useState({ width: '', length: '' });
  const isInitialMount = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planViewerRef = useRef<PlanViewerRef>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // On initial mount, try to load from local storage
    try {
      const savedPlanJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPlanJSON) {
        const savedPlan = JSON.parse(savedPlanJSON);
        const savedSize = `${savedPlan.meta.plot_width}x${savedPlan.meta.plot_length}`;
        if (!defaultPlotOptions.some((p) => p.val === savedSize)) {
          setPlotOptions((prev) => [
            {
              label: `${savedPlan.meta.plot_width} × ${savedPlan.meta.plot_length}`,
              sub: `${savedPlan.meta.plot_width * savedPlan.meta.plot_length} sq ft · Custom`,
              val: savedSize,
              bhk: savedPlan.meta.bhk,
            },
            ...prev,
          ]);
        }
        setActivePlan(savedPlan);
        setSelectedSize(savedSize);
        setSelectedBhk(savedPlan.meta.bhk);
      } else {
        // If nothing is saved, load the default plan
        const defaultPlan = findPlan(selectedSize, selectedBhk);
        if (defaultPlan) {
          setActivePlan(clonePlan(defaultPlan));
        } else {
          console.error(`Default plan for size ${selectedSize} and BHK ${selectedBhk} not found. Creating a blank plan as a fallback.`);
          const [width, length] = selectedSize.split('x').map(Number);
          setActivePlan({
            plan_id: `blank_${width}x${length}_${Date.now()}`,
            meta: { title: `Blank ${width}×${length} Plan`, plot_width: width, plot_length: length, facing: 'North', bhk: 0, floors: 1 },
            setbacks: { front: 0, rear: 0, left: 0, right: 0 },
            floors: [{ level: 0, label: 'Ground Floor', rooms: [], openings: [] }],
          });
        }
      }
    } catch (error) {
      console.error('Failed to load plan from local storage, loading default.', error);
      // Fallback to default plan. If this also fails, the app might still show a white screen.
      const defaultPlan = findPlan(selectedSize, selectedBhk);
      if (defaultPlan) setActivePlan(clonePlan(defaultPlan));
    }
  }, []); // Run only once on mount

  useEffect(() => {
    // Auto-save any changes to the active plan to local storage
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activePlan) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activePlan));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activePlan]);

  const loadNewPlan = (size: string, bhk: number) => {
    setSelectedSize(size);
    setSelectedBhk(bhk);
    // If bhk is not 0, it's a pre-defined plan. Otherwise, it's a custom/blank plan.
    const foundPlan = bhk !== 0 ? findPlan(size, bhk) : null;
    if (foundPlan) { // This will only be true for pre-defined plans
      setActivePlan(clonePlan(foundPlan));
    } else {
      const [width, length] = size.split('x').map(Number);
      const newPlan: PlanData = {
        plan_id: `custom_${width}x${length}_${Date.now()}`,
        meta: {
          title: `Custom ${width}×${length} Plan`,
          plot_width: width,
          plot_length: length,
          facing: 'North',
          bhk: 0,
          floors: 1,
        },
        setbacks: { front: 0, rear: 0, left: 0, right: 0 },
        floors: [{ level: 0, label: 'Ground Floor', rooms: [], openings: [] }],
      };
      setActivePlan(newPlan);
    }
    setFloorSelection(0);
    setEditMode(false);
  };

  const handleAddCustomPlot = useCallback(() => {
    setIsCustomPlotModalOpen(true);
  }, []);

  const handleCreateCustomPlot = useCallback(() => {
    const width = parseInt(customPlotSize.width, 10);
    const length = parseInt(customPlotSize.length, 10);
    if (isNaN(width) || isNaN(length) || width <= 5 || length <= 5) {
      alert('Please enter valid dimensions (at least 5x5).');
      return;
    }

    const newPlan: PlanData = {
      plan_id: `custom_${width}x${length}_${Date.now()}`,
      meta: {
        title: `Custom ${width}×${length} Plan`,
        plot_width: width,
        plot_length: length,
        facing: 'North',
        bhk: 0,
        floors: 1,
      },
      setbacks: { front: 0, rear: 0, left: 0, right: 0 },
      floors: [{ level: 0, label: 'Ground Floor', rooms: [], openings: [] }],
    };

    const newSizeVal = `${width}x${length}`;
    setPlotOptions((prev) => {
      if (prev.some((p) => p.val === newSizeVal)) {
        return prev;
      }
      return [
        { label: `${width} × ${length}`, sub: `${width * length} sq ft · Custom`, val: newSizeVal, bhk: 0 },
        ...prev,
      ];
    });

    setActivePlan(newPlan);
    setSelectedSize(newSizeVal);
    setSelectedBhk(0);
    setFloorSelection(0);
    setEditMode(false);
    setIsCustomPlotModalOpen(false);
    setCustomPlotSize({ width: '', length: '' });
  }, [customPlotSize]);

  const handleSaveProject = useCallback(() => {
    if (!activePlan) return;
    const planJSON = JSON.stringify(activePlan, null, 2);
    const blob = new Blob([planJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = activePlan.meta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeTitle || 'gharplan_project'}.gplan`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activePlan]);

  const handleOpenProjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('File is not readable');
        const loadedPlan = JSON.parse(text);
        if (loadedPlan.plan_id && loadedPlan.meta && loadedPlan.floors) {
          setActivePlan(loadedPlan);
          setSelectedSize(`${loadedPlan.meta.plot_width}x${loadedPlan.meta.plot_length}`);
          setSelectedBhk(loadedPlan.meta.bhk);
          setFloorSelection(0);
          setEditMode(false);
        } else {
          alert('Invalid project file.');
        }
      } catch (error) {
        console.error('Failed to open project file:', error);
        alert('Failed to open project file. It may be corrupted.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const handleExportPNG = () => {
    planViewerRef.current?.exportPNG();
    setDownloadOpen(false);
  };

  const handleExportPDF = () => {
    planViewerRef.current?.exportPDF();
    setDownloadOpen(false);
  };

  const handleExportGLB = () => {
    if (activePlan) exportPlanToGlb(activePlan, floorSelection);
    setDownloadOpen(false);
  };

  const handleAddFloor = () => {
    if (!activePlan) return;

    const newLevel = activePlan.floors.length > 0 ? Math.max(...activePlan.floors.map((f) => f.level)) + 1 : 0;
    const newFloor: Floor = {
      level: newLevel,
      label: getFloorLabel(newLevel),
      rooms: [],
      openings: [],
    };

    const newPlan = { ...activePlan };
    newPlan.floors = [...newPlan.floors, newFloor];
    newPlan.meta.floors = newPlan.floors.length;
    setActivePlan(newPlan);
    setFloorSelection(newLevel);
  };

  if (!activePlan) {
    // Render a loading state or null while the plan is being loaded from local storage
    return null;
  }

  const sqFt = activePlan.meta.plot_width * activePlan.meta.plot_length;
  const floorLevels = activePlan.floors.map((f) => f.level);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {isCustomPlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Add Custom Plot Size</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="plot-width" className="block text-sm font-medium text-slate-700">
                  Plot Width (ft)
                </label>
                <input
                  type="number"
                  id="plot-width"
                  value={customPlotSize.width}
                  onChange={(e) => setCustomPlotSize((s) => ({ ...s, width: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="plot-length" className="block text-sm font-medium text-slate-700">
                  Plot Length (ft)
                </label>
                <input
                  type="number"
                  id="plot-length"
                  value={customPlotSize.length}
                  onChange={(e) => setCustomPlotSize((s) => ({ ...s, length: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCustomPlotModalOpen(false)} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleCreateCustomPlot} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
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
          {showSaveMessage && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition-opacity duration-300">
              ✅ Project Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".gplan,application/json"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleOpenProjectClick}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            Open Project
          </button>
          <button
            type="button"
            onClick={handleSaveProject}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Save Project
          </button>
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setDownloadOpen((v) => !v)}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Download
              <svg className="-mr-1 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {downloadOpen && (
              <div
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
              >
                <a href="#" onClick={handleExportPNG} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Export as PNG</a>
                <a href="#" onClick={handleExportPDF} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Export as PDF</a>
                <a href="#" onClick={handleExportGLB} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Export as GLB (3D)</a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {editMode ? (
          <Toolbox onExit={() => setEditMode(false)} />
        ) : (
          <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Plot Size</p>
            </div>
            <div className="flex flex-col gap-1.5 p-3">
              {plotOptions.map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => loadNewPlan(item.val, item.bhk)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                    selectedSize === item.val
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={`block text-[11px] ${selectedSize === item.val ? 'text-indigo-100' : 'text-slate-400'}`}
                  >
                    {item.sub}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleAddCustomPlot}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-center text-xs font-semibold text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
              >
                + Add Custom Plot
              </button>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Floor</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                2D filters blueprint · 3D shows selected level with context below
              </p>
            </div>
            <FloorSwitcher
              floorLevels={floorLevels}
              selection={floorSelection}
              onChange={setFloorSelection}
              onAddFloor={handleAddFloor}
              disabled={editMode}
            />

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
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {activePlan.meta.bhk} BHK
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {activePlan.meta.facing} facing
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {activePlan.floors.length} floor{activePlan.floors.length > 1 ? 's' : ''}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {countRooms(activePlan)} rooms
                </span>
              </div>
            </div>
          </aside>
        )}

        <main className="min-h-0 min-w-0 flex-1 p-4">
          {viewMode === '2d' ? (
            <PlanViewer2D
              ref={planViewerRef}
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