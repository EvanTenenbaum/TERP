"use client";
import React from "react";
import type { SeriesPoint } from "./BarChart";

export default function LineChart({
  data,
  height = 220,
  onClick,
  currency = false,
}: {
  data: SeriesPoint[];
  height?: number;
  onClick?: (p: SeriesPoint) => void;
  currency?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = Math.max(320, data.length * 40);
  const chartH = height - 40;
  const chartW = width - 40;

  const fmt = (n: number) =>
    currency ? `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}` : n.toLocaleString();

  const points = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * chartW;
    const y = chartH - (d.value / max) * chartH;
    return { x, y };
  });
  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        <g transform={`translate(32,8)`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <g key={i} transform={`translate(0, ${chartH - chartH * t})`}>
              <line x1={0} x2={chartW} y1={0} y2={0} stroke="#e5e7eb" />
              <text x={-6} y={4} textAnchor="end" fontSize={10} fill="#6b7280">
                {fmt(Math.round(max * t))}
              </text>
            </g>
          ))}

          <path d={path} fill="none" stroke="#ef4444" strokeWidth={2} />
          {points.map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y})`}>
              <circle
                r={3}
                fill="#ef4444"
                className="cursor-pointer"
                onClick={() => onClick?.(data[i])}
              />
              <text x={0} y={chartH - p.y + 12} fontSize={10} textAnchor="middle" fill="#374151">
                {truncate(data[i].label, 10)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)) + "…";
}
