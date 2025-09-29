export default function DrilldownTable({ rows }: { rows: any[] }) {
  return (
    <table className="min-w-full text-sm">
      <tbody>
        {rows.map((r,i)=> <tr key={i}><td className="border px-2 py-1"><pre className="text-xs">{JSON.stringify(r)}</pre></td></tr>)}
      </tbody>
    </table>
  )
}
