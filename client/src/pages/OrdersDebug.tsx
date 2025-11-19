import { trpc } from "@/lib/trpc";

export default function OrdersDebug() {
  // Test 1: Debug raw query
  const { data: rawData, isLoading: rawLoading } = trpc.orders.debugGetRaw.useQuery();
  
  // Test 2: Get all orders (no filter)
  const { data: allOrders, isLoading: allLoading } = trpc.orders.getAll.useQuery({});
  
  // Test 3: Get confirmed orders (isDraft: false)
  const { data: confirmedOrders, isLoading: confirmedLoading } = trpc.orders.getAll.useQuery({
    isDraft: false,
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Orders API Debug Page</h1>
        <p className="text-gray-600">Diagnosing BUG-001: List views showing zero results</p>
      </div>

      {/* Test 1: Raw Data */}
      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-2xl font-semibold mb-4">Test 1: Raw Database Query</h2>
        {rawLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-semibold mb-1">Database Connection:</p>
              <p className="text-xs"><strong>Host:</strong> {rawData?.dbInfo?.host}</p>
              <p className="text-xs"><strong>Database:</strong> {rawData?.dbInfo?.database}</p>
              <p className="text-xs"><strong>Has DATABASE_URL:</strong> {rawData?.dbInfo?.hasDbUrl ? 'Yes' : 'No'}</p>
            </div>
            <p className="text-lg"><strong>Total orders in DB:</strong> <span className="text-blue-600 font-mono">{rawData?.total}</span></p>
            <p className="text-lg"><strong>Confirmed (isDraft = false or 0):</strong> <span className="text-green-600 font-mono">{rawData?.confirmed}</span></p>
            <p className="text-lg"><strong>Draft (isDraft = true or 1):</strong> <span className="text-orange-600 font-mono">{rawData?.draft}</span></p>
            <div className="mt-4">
              <strong className="text-lg">Sample orders:</strong>
              <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto text-sm">
                {JSON.stringify(rawData?.sample, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Test 2: All Orders */}
      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-2xl font-semibold mb-4">Test 2: getAllOrders (no filter)</h2>
        {allLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-lg"><strong>Count:</strong> <span className="text-blue-600 font-mono">{allOrders?.length || 0}</span></p>
            <div className="mt-4">
              <strong className="text-lg">First 3 orders:</strong>
              <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto text-sm">
                {JSON.stringify(
                  allOrders?.slice(0, 3).map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    isDraft: o.isDraft,
                    isDraftType: typeof o.isDraft,
                    orderType: o.orderType,
                  })),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Test 3: Confirmed Orders */}
      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-2xl font-semibold mb-4">Test 3: getAllOrders (isDraft: false)</h2>
        <p className="text-sm text-gray-600 mb-4">This is the query that's failing on the Orders page</p>
        {confirmedLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-lg">
              <strong>Count:</strong> 
              <span className={`font-mono ml-2 ${(confirmedOrders?.length || 0) === 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                {confirmedOrders?.length || 0}
              </span>
              {(confirmedOrders?.length || 0) === 0 && (
                <span className="ml-2 text-red-600 font-bold">← THIS IS THE BUG!</span>
              )}
            </p>
            <div className="mt-4">
              <strong className="text-lg">First 3 orders:</strong>
              <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto text-sm">
                {JSON.stringify(
                  confirmedOrders?.slice(0, 3).map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    isDraft: o.isDraft,
                    isDraftType: typeof o.isDraft,
                    orderType: o.orderType,
                  })),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Diagnosis */}
      <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
        <h2 className="text-2xl font-semibold mb-4 text-blue-900">Diagnosis</h2>
        <div className="space-y-2 text-sm">
          <p><strong>If Test 1 shows orders but Test 3 shows 0:</strong></p>
          <p className="ml-4">→ The issue is in the <code className="bg-white px-2 py-1 rounded">getAllOrders</code> function when filtering by <code className="bg-white px-2 py-1 rounded">isDraft: false</code></p>
          
          <p className="mt-4"><strong>If Test 1 shows 0 orders:</strong></p>
          <p className="ml-4">→ The database is empty (but we know it's not from direct MySQL queries)</p>
          
          <p className="mt-4"><strong>If all tests show correct counts:</strong></p>
          <p className="ml-4">→ The issue is in the frontend Orders.tsx component</p>
        </div>
      </div>
    </div>
  );
}
