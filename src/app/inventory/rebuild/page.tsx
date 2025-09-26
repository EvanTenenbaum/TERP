export default async function RebuildInventoryPage() {
  async function runSelfHealAction() {
    'use server'
    const { runSelfHeal } = await import('@/lib/selfHeal')
    await runSelfHeal()
  }
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Inventory Rebuild</h1>
      <form action={runSelfHealAction}>
        <button type="submit" className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Run Rebuild & Self-Heal</button>
      </form>
      <p className="mt-3 text-sm text-gray-600">Runs nightly automatically; this triggers now and locks posting if &gt;10 unresolved errors.</p>
    </div>
  )
}
