"use client";
import React from "react";

export type WidgetPosition = { order: number; colSpan?: number; rowSpan?: number; vizOverride?: 'auto' | 'table' | 'bar' | 'line' | 'pie' | 'kpi' };
export type DashboardWidget = {
  id: string;
  title?: string | null;
  position?: WidgetPosition | null;
  content: React.ReactNode;
};

export default function DashboardGrid({
  widgets,
  editMode,
  onMove,
  onResize,
  onRemove,
  onRename,
  onVizChange,
}: {
  widgets: DashboardWidget[];
  editMode?: boolean;
  onMove?: (id: string, dir: "up" | "down") => void;
  onResize?: (id: string, pos: WidgetPosition) => void;
  onRemove?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onVizChange?: (id: string, viz: 'auto'|'table'|'bar'|'line'|'pie'|'kpi') => void;
}) {
  const ordered = [...widgets].sort(
    (a, b) => (a.position?.order ?? 0) - (b.position?.order ?? 0)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {ordered.map((w) => {
        const colSpan = clamp(1, 3, w.position?.colSpan ?? 1);
        const rowSpan = clamp(1, 2, w.position?.rowSpan ?? 1);
        return (
          <div
            key={w.id}
            className="border rounded bg-white overflow-hidden flex flex-col"
            style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
          >
            <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
              <div className="font-medium text-sm text-gray-700 truncate">
                {editMode ? (
                  <input
                    defaultValue={w.title || ""}
                    placeholder="Title"
                    className="text-sm border rounded px-2 py-0.5 w-40"
                    onBlur={(e) => onRename?.(w.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onRename?.(w.id, (e.target as HTMLInputElement).value)
                    }}
                  />
                ) : (
                  <span>{w.title || "Widget"}</span>
                )}
              </div>
              {editMode && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMove?.(w.id, "up")}
                    className="px-2 py-0.5 text-xs border rounded"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onMove?.(w.id, "down")}
                    className="px-2 py-0.5 text-xs border rounded"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <select
                    className="text-xs border rounded px-1 py-0.5"
                    value={`${colSpan}x${rowSpan}`}
                    onChange={(e) => {
                      const [c, r] = e.target.value.split("x").map((n) => parseInt(n));
                      onResize?.(w.id, {
                        order: w.position?.order ?? 0,
                        colSpan: clamp(1, 3, c),
                        rowSpan: clamp(1, 2, r),
                      });
                    }}
                    title="Size"
                  >
                    <option value="1x1">1x1</option>
                    <option value="2x1">2x1</option>
                    <option value="1x2">1x2</option>
                    <option value="2x2">2x2</option>
                    <option value="3x1">3x1</option>
                    <option value="3x2">3x2</option>
                  </select>
                  <button
                    onClick={() => onRemove?.(w.id)}
                    className="px-2 py-0.5 text-xs border rounded text-red-600"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="p-3 grow">{w.content}</div>
          </div>
        );
      })}
    </div>
  );
}

function clamp(min: number, max: number, v: number) {
  return Math.max(min, Math.min(max, v));
}
