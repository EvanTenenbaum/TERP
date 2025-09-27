'use client'
import React, { useEffect, useState } from 'react'

type Status = { postingLocked: boolean; lastReason?: string | null } | null

export function SystemBanner() {
  const [status, setStatus] = useState<Status>(null)
  useEffect(() => {
    let alive = true
    function fetchStatus() {
      fetch('/api/system/status', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (alive) setStatus(data) })
        .catch(() => {})
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!status?.postingLocked) return null
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200">
      <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-amber-900">
        <strong>Posting Locked:</strong> {status.lastReason || 'System maintenance'} — Some actions are temporarily disabled.
      </div>
    </div>
  )
}
