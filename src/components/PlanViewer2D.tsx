"use client";

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { nanoid } from 'nanoid';
import { clampRoomPosition } from '@/lib/grid';
import { TOOLBOX_DND_MIME } from '@/components/Toolbox';
import type { ToolboxItem } from '@/data/roomCatalog';
import type { Floor, FloorSelection, Opening, PlanData, Room } from '@/types/plan';
import { getFloorLabel, getRoomsForSelection, updateRoomPosition } from '@/types/plan';

interface PlanViewer2DProps {
  plan: PlanData;
  floorSelection: FloorSelection;
  editMode: boolean;
  onPlanChange: (plan: PlanData) => void;
}

type EditableRoom = Room & { locked?: boolean };

export type PlanViewerRef = {
  exportPNG: () => void;
  exportPDF: () => void;
};

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

// Anything whose toolbox id/name mentions "door" or "window" is an opening,
// not a freestanding room. Adjust this matcher if your catalog uses explicit
// type flags instead (e.g. item.type === 'door' / 'window').
function isOpeningItem(item: ToolboxItem): 'door' | 'window' | null {
  const probe = `${item.id} ${item.name}`.toLowerCase();
  if (probe.includes('door')) return 'door';
  if (probe.includes('window')) return 'window';
  return null;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type DragTarget =
  | { kind: 'room'; floorLevel: number; roomId: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; floorLevel: number; roomId: string; handle: ResizeHandle };

function svgToPlan(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

const PlanViewer2D = forwardRef<PlanViewerRef, PlanViewer2DProps>(({ plan, floorSelection, editMode, onPlanChange }, ref) => {
  const { plot_width, plot_length, facing, title } = plan.meta;
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

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const svg = svgRef.current;
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const svgW = parseFloat(svg.getAttribute('viewBox')?.split(' ')[2] || '0');
        const svgH = parseFloat(svg.getAttribute('viewBox')?.split(' ')[3] || '0');
        const aspectRatio = svgW / svgH;

        // For 4K-ish quality
        const pngWidth = 3840;
        const pngHeight = pngWidth / aspectRatio;

        canvas.width = pngWidth;
        canvas.height = pngHeight;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'floorplan'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      img.src = url;
    },
    exportPDF: () => {
      const svg = svgRef.current;
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const svgW = parseFloat(svg.getAttribute('viewBox')?.split(' ')[2] || '0');
        const svgH = parseFloat(svg.getAttribute('viewBox')?.split(' ')[3] || '0');
        const aspectRatio = svgW / svgH;

        const canvasWidth = 2000;
        canvas.width = canvasWidth;
        canvas.height = canvasWidth / aspectRatio;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const imgWidth = pdfWidth - margin * 2;
        const imgHeight = imgWidth / aspectRatio;

        pdf.setFontSize(16);
        pdf.text(title, margin, margin + 5);
        pdf.setFontSize(10);
        pdf.text(`Plot Size: ${plot_width}' × ${plot_length}'`, margin, margin + 12);
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, pdfWidth - margin, margin + 12, { align: 'right' });
        pdf.addImage(imgData, 'PNG', margin, margin + 20, imgWidth, imgHeight);
        pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'floorplan'}.pdf`);
      };

      img.src = url;
    },
  }));

  const handleDeleteRoom = useCallback(
    (floorLevel: number, roomId: string) => {
      if (window.confirm('Delete this room?')) {
        const newPlan = { ...plan };
        const newFloors = newPlan.floors.map((f) => {
          if (f.level === floorLevel) {
            return {
              ...f,
              rooms: f.rooms.filter((r) => r.id !== roomId),
            };
          }
          return f;
        });
        onPlanChange({ ...newPlan, floors: newFloors });
        setSelectedId(null);
      }
    },
    [plan, onPlanChange]
  );

  const handleDeleteOpening = useCallback(
    (floorLevel: number, openingId: string) => {
      if (window.confirm('Delete this opening?')) {
        const newPlan = { ...plan };
        const newFloors = newPlan.floors.map((f) => {
          if (f.level === floorLevel) {
            return {
              ...f,
              openings: (f.openings ?? []).filter((o) => o.id !== openingId),
            };
          }
          return f;
        });
        onPlanChange({ ...newPlan, floors: newFloors });
        setSelectedId(null);
      }
    },
    [plan, onPlanChange]
  );

  const handleRoomPointerDown = useCallback(
    (e: React.PointerEvent, floor: Floor, room: Room) => {
      if (!editMode || !singleFloor || floor.level !== activeFloorLevel || (room as EditableRoom).locked) return;
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

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, floorLevel: number, roomId: string, handle: ResizeHandle) => {
      if (!editMode || !singleFloor) return;
      e.stopPropagation();
      setSelectedId(roomId);
      setDragTarget({
        kind: 'resize',
        floorLevel,
        roomId,
        handle,
      });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [editMode, singleFloor]
  );

  const handleToggleLock = useCallback(
    (floorLevel: number, roomId: string) => {
      const newPlan = { ...plan };
      const floorIndex = newPlan.floors.findIndex((f) => f.level === floorLevel);
      if (floorIndex > -1) {
        const roomIndex = newPlan.floors[floorIndex].rooms.findIndex((r) => r.id === roomId);
        if (roomIndex > -1) {
          const newFloors = [...newPlan.floors];
          const newRooms = [...newFloors[floorIndex].rooms];
          const room = { ...newRooms[roomIndex] } as EditableRoom;
          room.locked = !room.locked;
          newRooms[roomIndex] = room;
          newFloors[floorIndex] = { ...newFloors[floorIndex], rooms: newRooms };
          onPlanChange({ ...newPlan, floors: newFloors });
        }
      }
    },
    [plan, onPlanChange]
  );

  const handleRotateRoom = useCallback(
    (floorLevel: number, roomId: string) => {
      const newPlan = { ...plan };
      const floorIndex = newPlan.floors.findIndex((f) => f.level === floorLevel);
      if (floorIndex > -1) {
        const roomIndex = newPlan.floors[floorIndex].rooms.findIndex((r) => r.id === roomId);
        if (roomIndex > -1) {
          const room = newPlan.floors[floorIndex].rooms[roomIndex];
          if ((room as EditableRoom).locked) return;

          const centerX = room.x + room.width / 2;
          const centerY = room.y + room.length / 2;

          const newWidth = room.length;
          const newLength = room.width;

          const newRawX = centerX - newWidth / 2;
          const newRawY = centerY - newLength / 2;

          const { x, y } = clampRoomPosition(newRawX, newRawY, newWidth, newLength, plot_width, plot_length);

          const newFloors = [...newPlan.floors];
          const newRooms = [...newFloors[floorIndex].rooms];
          newRooms[roomIndex] = { ...room, width: newWidth, length: newLength, x, y };
          newFloors[floorIndex] = { ...newFloors[floorIndex], rooms: newRooms };
          onPlanChange({ ...newPlan, floors: newFloors });
        }
      }
    },
    [plan, onPlanChange, plot_width, plot_length]
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
      } else if (dragTarget.kind === 'resize') {
        const floor = plan.floors.find((f) => f.level === dragTarget.floorLevel);
        const room = floor?.rooms.find((r) => r.id === dragTarget.roomId);
        if (!room) return;

        const GRID_SNAP = 0.5;
        const MIN_DIM = 2;

        const rX = room.x;
        const rW = room.width;
        const rH = room.length;
        const rY = plot_length - room.y - rH;

        const snappedX = Math.round(pt.x / GRID_SNAP) * GRID_SNAP;
        const snappedY = Math.round(pt.y / GRID_SNAP) * GRID_SNAP;

        let newX = rX;
        let newY = rY;
        let newW = rW;
        let newH = rH;

        switch (dragTarget.handle) {
          case 'se':
            newW = Math.max(MIN_DIM, snappedX - rX);
            newH = Math.max(MIN_DIM, snappedY - rY);
            break;
          case 'nw': {
            const right = rX + rW;
            const bottom = rY + rH;
            newX = Math.min(snappedX, right - MIN_DIM);
            newY = Math.min(snappedY, bottom - MIN_DIM);
            newW = right - newX;
            newH = bottom - newY;
            break;
          }
          case 'ne': {
            const bottom = rY + rH;
            newY = Math.min(snappedY, bottom - MIN_DIM);
            newW = Math.max(MIN_DIM, snappedX - rX);
            newH = bottom - newY;
            break;
          }
          case 'sw': {
            const right = rX + rW;
            newX = Math.min(snappedX, right - MIN_DIM);
            newW = right - newX;
            newH = Math.max(MIN_DIM, snappedY - rY);
            break;
          }
        }

        const finalWidth = newW;
        const finalLength = newH;
        const finalX = newX;
        const finalY = plot_length - newY - newH;

        const { x: clampedX, y: clampedY } = clampRoomPosition(finalX, finalY, finalWidth, finalLength, plot_width, plot_length);

        const newPlan = { ...plan };
        const floorIndex = newPlan.floors.findIndex((f) => f.level === dragTarget.floorLevel);
        if (floorIndex > -1) {
          const roomIndex = newPlan.floors[floorIndex].rooms.findIndex((r) => r.id === dragTarget.roomId);
          if (roomIndex > -1) {
            const newFloors = [...newPlan.floors];
            const newRooms = [...newFloors[floorIndex].rooms];
            newRooms[roomIndex] = {
              ...newRooms[roomIndex],
              width: finalWidth,
              length: finalLength,
              x: clampedX,
              y: clampedY,
            };
            newFloors[floorIndex] = { ...newFloors[floorIndex], rooms: newRooms };
            onPlanChange({ ...newPlan, floors: newFloors });
          }
        }
      }
    },
    [dragTarget, plan, plot_length, plot_width, onPlanChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!editMode || !singleFloor || !svgRef.current || activeFloorLevel === null) return;

      const itemJSON = e.dataTransfer.getData(TOOLBOX_DND_MIME);
      if (!itemJSON) return;

      const item: ToolboxItem = JSON.parse(itemJSON);
      const pt = svgToPlan(svgRef.current, e.clientX, e.clientY);
      const floorLevel = activeFloorLevel;
      const floor = plan.floors.find((f) => f.level === floorLevel);
      if (!floor) return;

      const openingKind = isOpeningItem(item);

      if (openingKind) {
        // Door/window: don't create a room. Attach it as an opening on the
        // nearest room edge (i.e. the nearest wall) instead.
        const dropX = pt.x;
        const dropY = plot_length - pt.y;

        let best:
          | { room: Room; edge: 'top' | 'bottom' | 'left' | 'right'; dist: number; offset: number }
          | null = null;

        for (const room of floor.rooms) {
          const candidates: { edge: 'top' | 'bottom' | 'left' | 'right'; dist: number; offset: number }[] = [
            { edge: 'bottom', dist: Math.abs(dropY - room.y), offset: dropX - room.x },
            { edge: 'top', dist: Math.abs(dropY - (room.y + room.length)), offset: dropX - room.x },
            { edge: 'left', dist: Math.abs(dropX - room.x), offset: dropY - room.y },
            { edge: 'right', dist: Math.abs(dropX - (room.x + room.width)), offset: dropY - room.y },
          ];
          for (const c of candidates) {
            const withinSpan =
              c.edge === 'top' || c.edge === 'bottom'
                ? c.offset >= -1 && c.offset <= room.width + 1
                : c.offset >= -1 && c.offset <= room.length + 1;
            if (!withinSpan) continue;
            if (!best || c.dist < best.dist) best = { room, edge: c.edge, dist: c.dist, offset: c.offset };
          }
        }

        if (!best || best.dist > 3) {
          window.alert('Drop doors/windows onto a wall edge — closer to a room boundary.');
          return;
        }

        // Clamp so the opening doesn't hang off the end of the wall
        const span = best.edge === 'top' || best.edge === 'bottom' ? best.room.width : best.room.length;
        const clampedOffset = Math.min(Math.max(0, best.offset - item.width / 2), Math.max(0, span - item.width));

        const newOpening: Opening = {
          id: `${item.id}_${nanoid(5)}`,
          kind: openingKind,
          hostRoomId: best.room.id,
          edge: best.edge,
          offset: clampedOffset,
          width: item.width,
        };

        const newPlan = { ...plan };
        const floorIndex = newPlan.floors.findIndex((f) => f.level === floorLevel);
        if (floorIndex > -1) {
          const newFloors = [...newPlan.floors];
          const existingOpenings = newFloors[floorIndex].openings ?? [];
          newFloors[floorIndex] = { ...newFloors[floorIndex], openings: [...existingOpenings, newOpening] };
          onPlanChange({ ...newPlan, floors: newFloors });
          setSelectedId(newOpening.id);
        }
        return;
      }

      // Regular room/fixture drop (unchanged behavior)
      const newRoom: Room = {
        id: `${item.id}_${nanoid(5)}`,
        name: item.name,
        type: item.type,
        width: item.width,
        length: item.length,
        x: pt.x - item.width / 2,
        y: plot_length - pt.y - item.length / 2,
      };

      const { x, y } = clampRoomPosition(newRoom.x, newRoom.y, newRoom.width, newRoom.length, plot_width, plot_length);
      newRoom.x = x;
      newRoom.y = y;

      const newPlan = { ...plan };
      const floorIndex = newPlan.floors.findIndex((f) => f.level === floorLevel);
      if (floorIndex > -1) {
        const newFloors = [...newPlan.floors];
        const newRooms = [...newFloors[floorIndex].rooms, newRoom];
        newFloors[floorIndex] = { ...newFloors[floorIndex], rooms: newRooms };
        onPlanChange({ ...newPlan, floors: newFloors });
        setSelectedId(newRoom.id);
      }
    },
    [editMode, singleFloor, activeFloorLevel, onPlanChange, plan, plot_length, plot_width]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (editMode && singleFloor) {
        e.dataTransfer.dropEffect = 'copy';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [editMode, singleFloor]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editMode && singleFloor) {
        const floor = plan.floors.find((f) => f.rooms.some((r) => r.id === selectedId));
        if (floor) {
          handleDeleteRoom(floor.level, selectedId);
          return;
        }
        const openingFloor = plan.floors.find((f) =>
          (f.openings ?? []).some((o) => o.id === selectedId)
        );
        if (openingFloor) {
          handleDeleteOpening(openingFloor.level, selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, editMode, singleFloor, plan.floors, handleDeleteRoom, handleDeleteOpening]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <p className="text-xs text-slate-500">
          {floorSelection === 'all' ? 'All floors overlay' : `${getFloorLabel(floorSelection)} plan`}
          {editMode && singleFloor ? ' · Edit mode — drag to move, click ❌ to delete' : ''}
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
          onDrop={handleDrop}
          onDragOver={handleDragOver}
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
                  const isLocked = canDrag && !!(room as EditableRoom).locked;

                  return (
                    <g key={`${floor.level}-${room.id}`} opacity={isLocked ? 0.6 : 1}>
                      <rect
                        x={rX}
                        y={rY}
                        width={room.width}
                        height={room.length}
                        fill={style.fill}
                        stroke={isSelected ? '#4f46e5' : style.stroke}
                        strokeWidth={isSelected ? strokeThin * 2.5 : strokeThin}
                        strokeDasharray={floorSelection === 'all' && floor.level > 0 ? overlay.strokeDash : undefined}
                        className={canDrag && !isLocked ? 'cursor-grab active:cursor-grabbing' : ''}
                        onPointerDown={canDrag && !isLocked ? (e) => handleRoomPointerDown(e, floor, room) : undefined}
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

                {/* Doors & windows: rendered as a gap cut into the host wall,
                    plus a swing arc (door) or double-line (window) symbol —
                    never a filled box. */}
                {(floor.openings ?? []).map((op) => {
                  const room = rooms.find((r) => r.id === op.hostRoomId);
                  if (!room) return null;
                  const rY = plot_length - room.y - room.length;

                  let x1 = 0,
                    y1 = 0,
                    x2 = 0,
                    y2 = 0;

                  if (op.edge === 'bottom') {
                    x1 = room.x + op.offset;
                    y1 = rY + room.length;
                    x2 = x1 + op.width;
                    y2 = y1;
                  } else if (op.edge === 'top') {
                    x1 = room.x + op.offset;
                    y1 = rY;
                    x2 = x1 + op.width;
                    y2 = y1;
                  } else if (op.edge === 'left') {
                    x1 = room.x;
                    y1 = rY + room.length - op.offset;
                    x2 = x1;
                    y2 = y1 - op.width;
                  } else {
                    x1 = room.x + room.width;
                    y1 = rY + room.length - op.offset;
                    x2 = x1;
                    y2 = y1 - op.width;
                  }

                  const isSelected = selectedId === op.id;
                  const canDrag = editMode && singleFloor && floor.level === activeFloorLevel;

                  return (
                    <g
                      key={op.id}
                      className={canDrag ? 'cursor-pointer' : ''}
                      onClick={(e) => {
                        if (!canDrag) return;
                        e.stopPropagation();
                        setSelectedId(op.id);
                      }}
                    >
                      {/* erase the wall line underneath so it reads as an opening */}
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={strokeMain * 1.8} />

                      {op.kind === 'door' ? (
                        <>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={isSelected ? '#4f46e5' : '#0f172a'}
                            strokeWidth={strokeThin}
                          />
                          <path
                            d={`M ${x1} ${y1} A ${op.width} ${op.width} 0 0 1 ${x1 + (x2 === x1 ? 0 : op.width)} ${
                              y2 === y1 ? y1 - op.width : y1
                            }`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeDasharray={strokeThin * 0.6 + ' ' + strokeThin * 0.6}
                            strokeWidth={strokeThin * 0.5}
                          />
                        </>
                      ) : (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isSelected ? '#4f46e5' : '#38bdf8'}
                          strokeWidth={strokeThin * 1.6}
                        />
                      )}

                      {canDrag && isSelected && (
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOpening(floor.level, op.id);
                          }}
                        >
                          <circle
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r={fontSize * 0.5}
                            fill="#ef4444"
                            stroke="white"
                            strokeWidth={strokeThin * 0.5}
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 + fontSize * 0.05}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={fontSize * 0.8}
                            fontWeight="bold"
                            fill="white"
                            pointerEvents="none"
                          >
                            ×
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {rooms.map((room) => {
                  const rX = room.x;
                  const rY = plot_length - room.y - room.length;
                  const canDrag = editMode && singleFloor && floor.level === activeFloorLevel;
                  if (!canDrag) return null;
                  const isLocked = !!(room as EditableRoom).locked;
                  const isSelected = selectedId === room.id;

                  return (
                    <React.Fragment key={`${floor.level}-${room.id}-controls`}>
                      {/* Delete Button (Top-Right) */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(floor.level, room.id);
                        }}
                        className="cursor-pointer"
                      >
                        <circle cx={rX + room.width} cy={rY} r={fontSize * 0.6} fill="#ef4444" stroke="white" strokeWidth={strokeThin * 0.5} />
                        <text x={rX + room.width} y={rY + fontSize * 0.05} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize * 0.9} fontWeight="bold" fill="white" pointerEvents="none">
                          ×
                        </text>
                      </g>

                      {/* Lock Button (Top-Left) */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(floor.level, room.id);
                        }}
                        className="cursor-pointer"
                      >
                        <circle cx={rX} cy={rY} r={fontSize * 0.6} fill={isLocked ? '#64748b' : '#3b82f6'} stroke="white" strokeWidth={strokeThin * 0.5} />
                        <text x={rX} y={rY + fontSize * 0.05} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize * 0.6} fontWeight="bold" fill="white" pointerEvents="none">
                          {isLocked ? '🔒' : '🔓'}
                        </text>
                      </g>

                      {/* Rotate Button (Bottom-Right) */}
                      {!isLocked && (
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRotateRoom(floor.level, room.id);
                          }}
                          className="cursor-pointer"
                        >
                          <circle cx={rX + room.width} cy={rY + room.length} r={fontSize * 0.6} fill="#14b8a6" stroke="white" strokeWidth={strokeThin * 0.5} />
                          <text x={rX + room.width} y={rY + room.length + fontSize * 0.05} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize * 0.7} fontWeight="bold" fill="white" pointerEvents="none">
                            ↻
                          </text>
                        </g>
                      )}
                      {/* Resize Handles */}
                      {isSelected && !isLocked && (
                        <g>
                          <circle
                            cx={rX}
                            cy={rY}
                            r={fontSize * 0.4}
                            fill="#4f46e5"
                            stroke="white"
                            strokeWidth={strokeThin * 0.5}
                            className="cursor-nwse-resize"
                            onPointerDown={(e) => handleResizePointerDown(e, floor.level, room.id, 'nw')}
                          />
                          <circle
                            cx={rX + room.width}
                            cy={rY}
                            r={fontSize * 0.4}
                            fill="#4f46e5"
                            stroke="white"
                            strokeWidth={strokeThin * 0.5}
                            className="cursor-nesw-resize"
                            onPointerDown={(e) => handleResizePointerDown(e, floor.level, room.id, 'ne')}
                          />
                          <circle
                            cx={rX}
                            cy={rY + room.length}
                            r={fontSize * 0.4}
                            fill="#4f46e5"
                            stroke="white"
                            strokeWidth={strokeThin * 0.5}
                            className="cursor-nesw-resize"
                            onPointerDown={(e) => handleResizePointerDown(e, floor.level, room.id, 'sw')}
                          />
                          <circle
                            cx={rX + room.width}
                            cy={rY + room.length}
                            r={fontSize * 0.4}
                            fill="#4f46e5"
                            stroke="white"
                            strokeWidth={strokeThin * 0.5}
                            className="cursor-nwse-resize"
                            onPointerDown={(e) => handleResizePointerDown(e, floor.level, room.id, 'se')}
                          />
                        </g>
                      )}
                    </React.Fragment>
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
);

PlanViewer2D.displayName = 'PlanViewer2D';

export default PlanViewer2D;