"use client";

import React, { useCallback, useRef, useState } from 'react';
import { clampRoomPosition } from '@/lib/grid';
import type { Floor, FloorSelection, PlanData, Room } from '@/types/plan';
import { getFloorLabel, getRoomsForSelection, updateRoomPosition } from '@/types/plan';

interface PlanViewer2DProps {
  plan: PlanData;
  floorSelection: FloorSelection;
  editMode: boolean;
  onPlanChange: (plan: PlanData) => void;
}

const ROOM_STYLES: Record<string, { fill: string; stroke: string; label: string }> = {
  bedroom: { fill: '#f5f3ff', stroke: '#6366f1', label: 'Bedrooms' },
  living: { fill: '#f0fdf4', stroke: '#22c55e', label: 'Living/Hall' },
  service: { fill: '#fff5f5', stroke: '#ef4444', label: 'Kitchen/Toilet' },
  outdoor: { fill: '#fffbeb', stroke: '#d97706', label: 'Parking/Utility' },
};

const DEFAULT_STYLE = { fill: '#f8fafc', stroke: '#64748b', label: 'Other Spaces' };

const FLOOR_OVERLAY: Record<number, { fillOpacity: number; strokeDash: string }> = {
  0: { fillOpacity: 1, strokeDash: 'none' },
  1: { fillOpacity: 0.72, strokeDash: '0.6 0.4' },
  2: { fillOpacity: 0.55, strokeDash: '0.4 0.4' },
};

function getRoomStyle(type: string) {
  return ROOM_STYLES[type] ?? DEFAULT_STYLE;
}

type DragTarget = { kind: 'room'; floorLevel: number; roomId: string; offsetX: number; offsetY: number };

function svgToPlan(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export default function PlanViewer2D({ plan, floorSelection, editMode, onPlanChange }: PlanViewer2DProps) {
  const { plot_width, plot_length, facing } = plan.meta;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pad = Math.max(plot_width, plot_length) * 0.12;
  const viewW = plot_width + pad * 2;
  const viewH = plot_length + pad * 2;
  const fontSize = Math.max(plot_width, plot_length) * 0.028;
  const smallFont = fontSize * 0.75;
  const strokeMain = Math.max(plot_width, plot_length) * 0.008;
  const strokeThin = strokeMain * 0.5;

  const floorLayers = getRoomsForSelection(plan, floorSelection);
  const singleFloor = floorSelection !== 'all';
  const activeFloorLevel = singleFloor ? floorSelection : null;

  const handleRoomPointerDown = useCallback(
    (e: React.PointerEvent, floor: Floor, room: Room) => {
      if (!editMode || !singleFloor || floor.level !== activeFloorLevel) return;
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svgToPlan(svg, e.clientX, e.clientY);
      setSelectedId(room.id);
      setDragTarget({
        kind: 'room',
        floorLevel: floor.level,
        roomId: room.id,
        offsetX: pt.x - room.x,
        offsetY: plot_length - pt.y - room.y,
      });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [editMode, singleFloor, activeFloorLevel, plot_length]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragTarget || !svgRef.current) return;
      const pt = svgToPlan(svgRef.current, e.clientX, e.clientY);

      if (dragTarget.kind === 'room') {
        const room = plan.floors
          .find((f) => f.level === dragTarget.floorLevel)
          ?.rooms.find((r) => r.id === dragTarget.roomId);
        if (!room) return;
        const rawX = pt.x - dragTarget.offsetX;
        const rawY = plot_length - pt.y - dragTarget.offsetY;
        const { x, y } = clampRoomPosition(rawX, rawY, room.width, room.length, plot_width, plot_length);
        onPlanChange(updateRoomPosition(plan, dragTarget.floorLevel, dragTarget.roomId, x, y));
      }
    },
    [dragTarget, plan, plot_length, plot_width, onPlanChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <p className="text-xs text-slate-500">
          {floorSelection === 'all' ? 'All floors overlay' : `${getFloorLabel(floorSelection)} plan`}
          {editMode && singleFloor ? ' · Edit mode — drag rooms to layout' : ''}
        </p>
        {editMode && !singleFloor && (
          <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Select a single floor to edit
          </span>
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-50/50 p-3">
        <svg
          ref={svgRef}
          viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="grid" width={editMode ? 0.5 : 2} height={editMode ? 0.5 : 2} patternUnits="userSpaceOnUse">
              <path
                d={editMode ? 'M 0.5 0 L 0 0 0 0.5' : 'M 2 0 L 0 0 0 2'}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={editMode ? 0.03 : 0.08}
              />
            </pattern>
          </defs>

          <rect x={0} y={0} width={plot_width} height={plot_length} fill="#ffffff" />
          <rect x={0} y={0} width={plot_width} height={plot_length} fill="url(#grid)" />

          {floorLayers.map(({ floor, rooms }) => {
            const overlay = FLOOR_OVERLAY[floor.level] ?? { fillOpacity: 0.5, strokeDash: '0.3 0.3' };

            return (
              <g key={floor.level} opacity={floorSelection === 'all' && floor.level > 0 ? overlay.fillOpacity : 1}>
                {floorSelection === 'all' && (
                  <text x={plot_width - 1} y={2 + floor.level * 2.5} textAnchor="end" fontSize={smallFont} fill="#6366f1" fontWeight="700">
                    {getFloorLabel(floor.level)}
                  </text>
                )}

                {rooms.map((room) => {
                  const style = getRoomStyle(room.type);
                  const rX = room.x;
                  const rY = plot_length - room.y - room.length;
                  const isSelected = selectedId === room.id;
                  const canDrag = editMode && singleFloor && floor.level === activeFloorLevel;

                  return (
                    <g key={`${floor.level}-${room.id}`}>
                      <rect
                        x={rX}
                        y={rY}
                        width={room.width}
                        height={room.length}
                        fill={style.fill}
                        stroke={isSelected ? '#4f46e5' : style.stroke}
                        strokeWidth={isSelected ? strokeThin * 2.5 : strokeThin}
                        strokeDasharray={floorSelection === 'all' && floor.level > 0 ? overlay.strokeDash : undefined}
                        className={canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                        onPointerDown={canDrag ? (e) => handleRoomPointerDown(e, floor, room) : undefined}
                      />
                      <text
                        x={rX + room.width / 2}
                        y={rY + room.length / 2 - smallFont * 0.4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fill="#0f172a"
                        pointerEvents="none"
                      >
                        {room.name}
                      </text>
                      <text
                        x={rX + room.width / 2}
                        y={rY + room.length / 2 + fontSize * 0.8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={smallFont}
                        fontWeight="600"
                        fill="#64748b"
                        pointerEvents="none"
                      >
                        {room.width}&apos; × {room.length}&apos;
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <rect x={0} y={0} width={plot_width} height={plot_length} fill="none" stroke="#0f172a" strokeWidth={strokeMain} pointerEvents="none" />

          <text x={plot_width / 2} y={-pad * 0.35} textAnchor="middle" fontSize={fontSize} fill="#1e293b" fontWeight="800">
            {plot_width} FT
          </text>
          <text
            x={-pad * 0.45}
            y={plot_length / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="#1e293b"
            fontWeight="800"
            transform={`rotate(-90, ${-pad * 0.45}, ${plot_length / 2})`}
          >
            {plot_length} FT
          </text>
          <text x={plot_width / 2} y={plot_length + pad * 0.45} textAnchor="middle" fontSize={fontSize} fill="#4f46e5" fontWeight="bold" pointerEvents="none">
            ↑ MAIN ROAD ({facing} FACING)
          </text>
        </svg>
      </div>

      <div className="flex shrink-0 flex-wrap justify-center gap-4 border-t border-slate-100 bg-white px-4 py-2">
        {Object.entries(ROOM_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-block h-3 w-3 rounded border shadow-sm" style={{ backgroundColor: style.fill, borderColor: style.stroke }} />
            {style.label}
          </div>
        ))}
      </div>
    </div>
  );
}