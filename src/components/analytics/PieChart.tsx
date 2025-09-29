"use client";
import React from "react";
import type { SeriesPoint } from "./BarChart";

export default function PieChart({
  data,
  size = 220,
  onClick,
  currency = false,
}: {
  data: SeriesPoint[];
  size?: number;
  onClick?: (p: SeriesPoint) => void;
  currency?: boolean;
}) {
  const total = data.reduce((a, d) => a + Math.max(0, d.value), 0) || 1;
  const r = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let start = 0;

  const fmt = (n: number) =>
    currency ? `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}` : n.toLocaleString();

  const colors = [
    "#6366f1",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#06b6d4",
    "#84cc16",
    "#a855f7",
    "#f97316",
  ];

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="block">
        {data.map((d, i) => {
          const angle = (d.value / total) * Math.PI * 2;
          const end = start + angle;
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end);
          const y2 = cy + r * Math.sin(end);
          const large = angle > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          const fill = colors[i % colors.length];
          start = end;
          return (
            <path
              key={i}
              d={path}
              fill={fill}
              className="cursor-pointer"
              onClick={() => onClick?.(d)}
            />
          );
        })}
      </svg>
      <div className="text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="text-gray-700">{d.label}</span>
            <span className="text-gray-500">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
