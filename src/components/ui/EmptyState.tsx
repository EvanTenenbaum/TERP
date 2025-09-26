import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
}

export default function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border">
      <svg className="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="mt-3 text-sm font-medium text-gray-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      {actionHref && actionLabel ? (
        <div className="mt-6">
          <Link href={actionHref} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
