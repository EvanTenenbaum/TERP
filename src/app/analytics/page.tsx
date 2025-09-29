import Link from 'next/link'

export default function AnalyticsHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/analytics/reports/new" className="block p-4 border rounded hover:shadow bg-white">Create Report</Link>
        <Link href="/analytics/dashboards" className="block p-4 border rounded hover:shadow bg-white">My Dashboards</Link>
      </div>
    </div>
  )
}
