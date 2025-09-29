"use client";
import React from "react";

export type SeriesPoint = { label: string; value: number; raw?: any };

export default function BarChart({
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
  const barW = Math.max(12, Math.floor(600 / Math.max(1, data.length)));
  const gap = 8;
  const width = data.length * (barW + gap) + 40;
  const chartH = height - 40;

  const fmt = (n: number) =>
    currency ? `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}` : n.toLocaleString();

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        <g transform={`translate(32,8)`}>
          {/* y-axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <g key={i} transform={`translate(0, ${chartH - chartH * t})`}>
              <line x1={0} x2={width} y1={0} y2={0} stroke="#e5e7eb" />
              <text x={-6} y={4} textAnchor="end" fontSize={10} fill="#6b7280">
                {fmt(Math.round(max * t))}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const h = Math.max(1, (d.value / max) * chartH);
            const x = i * (barW + gap);
            const y = chartH - h;
            return (
              <g key={i} transform={`translate(${x},${y})`}>
                <rect
                  width={barW}
                  height={h}
                  rx={3}
                  fill="#4f46e5"
                  className="cursor-pointer"
                  onClick={() => onClick?.(d)}
                />
                <text
                  x={barW / 2}
                  y={h + 12}
                  fontSize={10}
                  textAnchor="middle"
                  fill="#374151"
                >
                  {truncate(d.label, Math.floor((barW + gap) / 6))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)) + "…";
}
