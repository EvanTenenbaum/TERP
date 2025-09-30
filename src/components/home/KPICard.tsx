import React from 'react'
import Link from 'next/link'

export default function KPICard({ title, value, subtext, href }: { title: string; value: string | number; subtext?: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow transition">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-gray-500">{subtext}</div> : null}
    </div>
  )
  if (href) return <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">{inner}</Link>
  return inner
}
