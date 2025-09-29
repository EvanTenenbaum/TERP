export default function ReportRenderer({ data }: { data: any }) {
  return (
    <div className="border rounded p-3 bg-white">
      <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
