"use client";

import BarChart from "./BarChart";
import LineChart from "./LineChart";
import PieChart from "./PieChart";

export default function ReportRenderer({
  data,
  onDrill,
}: {
  data: { rows: any[]; meta?: any } | null;
  onDrill?: (point: any) => void;
}) {
  if (!data) return <div className="border rounded p-3 bg-white text-sm text-gray-500">No data</div>;
  const meta = data.meta || {};

  // KPI quick-path
  if ((meta.viz === "kpi" || meta.recommendedViz === "kpi") && data.rows?.length) {
    const first = data.rows[0];
    const val = first.amountCents ?? first.turns ?? 0;
    const formatted =
      typeof val === "number" &&
      (first.amountCents !== undefined ? `$${(val / 100).toFixed(2)}` : String(val));
    return (
      <div className="border rounded p-6 bg-white">
        <div className="text-sm text-gray-500">{first.label || "KPI"}</div>
        <div className="text-4xl font-semibold">{formatted}</div>
      </div>
    );
  }

  const rows = data.rows || [];
  const viz: string = meta.viz || meta.recommendedViz || "table";

  if ((viz === "bar" || viz === "line" || viz === "pie") && rows.length) {
    const { series, currency } = toSeries(rows);
    if (viz === "bar") {
      return (
        <div className="border rounded p-3 bg-white">
          <BarChart data={series} currency={currency} onClick={(p) => onDrill?.(p.raw ?? p)} />
        </div>
      );
    }
    if (viz === "line") {
      return (
        <div className="border rounded p-3 bg-white">
          <LineChart data={series} currency={currency} onClick={(p) => onDrill?.(p.raw ?? p)} />
        </div>
      );
    }
    if (viz === "pie") {
      return (
        <div className="border rounded p-3 bg-white">
          <PieChart data={series} currency={currency} onClick={(p) => onDrill?.(p.raw ?? p)} />
        </div>
      );
    }
  }

  // Fallback table view
  const headers = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r)))).filter(
    (h) => !["customerId", "productId", "invoiceId", "batchId"].includes(h)
  );
  return (
    <div className="border rounded p-3 bg-white overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-2 py-1 border-b bg-gray-50 capitalize">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 cursor-pointer" onDoubleClick={() => onDrill?.(r)}>
              {headers.map((h) => (
                <td key={h} className="px-2 py-1 border-b">
                  {formatCell(h, (r as any)[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(key: string, v: any) {
  if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("cents"))
    return typeof v === "number" ? `$${((v || 0) / 100).toFixed(2)}` : v;
  return String(v ?? "");
}

function toSeries(rows: any[]) {
  const labelKey = inferLabelKey(rows);
  const valueKey = inferValueKey(rows);
  const currency = /amount|cents/i.test(valueKey);
  const series = rows.map((r) => ({ label: String(r[labelKey] ?? ""), value: Number(r[valueKey] ?? 0), raw: r }));
  return { series, currency };
}

function inferLabelKey(rows: any[]): string {
  const keys = Object.keys(rows[0] || {});
  const preferred = ["label", "bucket", "customer", "product", "category", "name", "date", "day", "month"];
  for (const k of preferred) if (keys.includes(k)) return k;
  const candidates = keys.filter((k) => !/id$/i.test(k) && typeof rows[0][k] !== "number");
  return candidates[0] || keys[0] || "label";
}

function inferValueKey(rows: any[]): string {
  const keys = Object.keys(rows[0] || {});
  const preferred = ["amountCents", "amount", "value", "quantity", "turns"];
  for (const k of preferred) if (keys.includes(k)) return k;
  const nums = keys.filter((k) => typeof rows[0][k] === "number");
  return nums[0] || keys[0] || "value";
}
