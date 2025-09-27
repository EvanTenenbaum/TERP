"use client";
import { useState } from "react";

export default function QaToolsPage() {
  const [log, setLog] = useState<string>("");
  async function hit(path: string) {
    setLog((l) => l + `\n→ GET ${path}`);
    try {
      const res = await fetch(path, { method: "GET" });
      const text = await res.text();
      setLog((l) => l + `\n${res.status} ${res.statusText}\n${text}\n`);
    } catch (e: any) {
      setLog((l) => l + `\nERROR ${String(e?.message || e)}\n`);
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">QA Tools</h1>
      <p className="text-sm text-gray-600">Run QA cron endpoints manually. Requires ENABLE_QA_CRONS=true.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => hit("/api/qa/self-heal")} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Self-heal</button>
        <button onClick={() => hit("/api/qa/reservations-expiry")} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Reservations expiry</button>
        <button onClick={() => hit("/api/qa/profitability-nightly")} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Profitability nightly</button>
        <button onClick={() => hit("/api/alerts/evaluate-nightly")} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Alerts evaluate nightly</button>
        <button onClick={() => hit("/api/alerts/replenishment/nightly")} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Replenishment nightly</button>
      </div>
      <pre className="whitespace-pre-wrap text-xs bg-gray-50 border rounded p-3 max-h-[60vh] overflow-auto">{log || "No output yet."}</pre>
    </div>
  );
}
