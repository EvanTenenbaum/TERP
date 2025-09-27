"use client";
import { useState } from "react";

export default function QaToolsPage() {
  const [log, setLog] = useState<string>("");
  const [sysStatus, setSysStatus] = useState<{ postingLocked: boolean; lastReason?: string | null } | null>(null)
  const [reason, setReason] = useState<string>("")
  async function loadStatus() {
    try { const r = await fetch('/api/system/status', { cache: 'no-store' }); if (r.ok) setSysStatus(await r.json()); } catch {}
  }
  async function setLock(pl: boolean) {
    try {
      const r = await fetch('/api/system/status', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postingLocked: pl, reason }) })
      const data = await r.json().catch(() => null)
      if (r.ok) setSysStatus(data)
      setLog((l)=> l + `\n→ PATCH /api/system/status ${r.status}\n` + JSON.stringify(data))
    } catch (e:any) {
      setLog((l)=> l + `\nERROR ${String(e?.message||e)}`)
    }
  }
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

      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">System Status</div>
          <button onClick={loadStatus} className="px-2 py-1 rounded border text-sm">Refresh</button>
        </div>
        <div className="text-sm text-gray-700">Posting Locked: <span className={sysStatus?.postingLocked ? 'text-red-600' : 'text-green-700'}>{String(sysStatus?.postingLocked ?? false)}</span></div>
        <div className="flex gap-2 items-center">
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 rounded border px-2 py-1 text-sm" />
          <button onClick={()=>setLock(true)} className="px-3 py-1.5 rounded bg-amber-600 text-white">Lock</button>
          <button onClick={()=>setLock(false)} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Unlock</button>
        </div>
      </div>
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
