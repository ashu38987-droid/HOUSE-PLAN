"use client";

import React, { useMemo, useState } from 'react';
import { TOOLBOX_CATEGORIES, type ToolboxCategory, type ToolboxItem } from '@/data/roomCatalog';

export const TOOLBOX_DND_MIME = 'application/x-gharplan-room';

const TYPE_DOT: Record<string, string> = {
  bedroom: '#6366f1',
  living: '#22c55e',
  service: '#ef4444',
  outdoor: '#d97706',
  other: '#64748b',
};

interface ToolboxProps {
  onDragItem?: (item: ToolboxItem) => void;
  onExit?: () => void;
}

export default function Toolbox({ onDragItem, onExit }: ToolboxProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLBOX_CATEGORIES;
    return TOOLBOX_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.name.toLowerCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const handleDragStart = (e: React.DragEvent, item: ToolboxItem) => {
    e.dataTransfer.setData(TOOLBOX_DND_MIME, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    onDragItem?.(item);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Toolbox</p>
        <div className="relative mt-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
          />
          <svg
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Drag a component onto the plan to add it.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((cat) => {
          const isCollapsed = collapsed[cat.id];
          return (
            <div key={cat.id} className="border-b border-slate-100">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>{cat.icon}</span>
                  {cat.label}
                  <span className="text-[10px] font-medium text-slate-400">({cat.items.length})</span>
                </span>
                <svg
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-2.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      title={`${item.name} · ${item.width}' × ${item.length}'`}
                      className="flex cursor-grab select-none flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/60 active:cursor-grabbing"
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: TYPE_DOT[item.type] ?? TYPE_DOT.other }}
                        />
                        <span className="truncate text-[11px] font-semibold text-slate-700">{item.name}</span>
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {item.width}&apos; × {item.length}&apos;
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No components match &ldquo;{query}&rdquo;</p>}
      </div>
      <div className="shrink-0 border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          ✓ Done Editing
        </button>
      </div>
    </aside>
  );
}