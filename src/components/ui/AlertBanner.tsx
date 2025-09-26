interface AlertBannerProps {
  type?: 'success' | 'error' | 'info'
  message: string
}

export default function AlertBanner({ type = 'info', message }: AlertBannerProps) {
  const styles = type === 'success'
    ? 'bg-green-50 text-green-800 border-green-200'
    : type === 'error'
    ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-blue-50 text-blue-800 border-blue-200'
  return (
    <div role="status" className={`border rounded px-3 py-2 text-sm ${styles}`}>{message}</div>
  )
}
