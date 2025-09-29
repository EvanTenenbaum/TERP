export default function AlertBadge({ count }: { count: number }) {
  return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Alerts: {count}</span>
}
