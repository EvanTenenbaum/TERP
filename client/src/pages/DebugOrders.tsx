/**
 * Debug Orders Page
 * Tests the orders API to diagnose BUG-001
 */

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugOrders() {
  // Test 1: Debug raw query
  const { data: rawData, isLoading: rawLoading } = trpc.orders.debugGetRaw.useQuery();
  
  // Test 2: Get all orders (no filter)
  const { data: allOrders, isLoading: allLoading } = trpc.orders.getAll.useQuery({});
  
  // Test 3: Get confirmed orders (isDraft: false)
  const { data: confirmedOrders, isLoading: confirmedLoading } = trpc.orders.getAll.useQuery({
    isDraft: false,
  });
  
  // Test 4: Get draft orders (isDraft: true)
  const { data: draftOrders, isLoading: draftLoading } = trpc.orders.getAll.useQuery({
    isDraft: true,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Orders API Debug Page</h1>
      <p className="text-muted-foreground">
        Diagnosing BUG-001: List views showing zero results
      </p>

      {/* Test 1: Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Test 1: Raw Database Query</CardTitle>
        </CardHeader>
        <CardContent>
          {rawLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p><strong>Total orders in DB:</strong> {rawData?.total}</p>
              <p><strong>Confirmed (isDraft = false or 0):</strong> {rawData?.confirmed}</p>
              <p><strong>Draft (isDraft = true or 1):</strong> {rawData?.draft}</p>
              <div className="mt-4">
                <strong>Sample orders:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto">
                  {JSON.stringify(rawData?.sample, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test 2: All Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Test 2: getAllOrders (no filter)</CardTitle>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p><strong>Count:</strong> {allOrders?.length || 0}</p>
              <div className="mt-4">
                <strong>First 3 orders:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto">
                  {JSON.stringify(
                    allOrders?.slice(0, 3).map(o => ({
                      id: o.id,
                      orderNumber: o.orderNumber,
                      isDraft: o.isDraft,
                      orderType: o.orderType,
                    })),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test 3: Confirmed Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Test 3: getAllOrders (isDraft: false)</CardTitle>
        </CardHeader>
        <CardContent>
          {confirmedLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p><strong>Count:</strong> {confirmedOrders?.length || 0}</p>
              <div className="mt-4">
                <strong>First 3 orders:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto">
                  {JSON.stringify(
                    confirmedOrders?.slice(0, 3).map(o => ({
                      id: o.id,
                      orderNumber: o.orderNumber,
                      isDraft: o.isDraft,
                      orderType: o.orderType,
                    })),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test 4: Draft Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Test 4: getAllOrders (isDraft: true)</CardTitle>
        </CardHeader>
        <CardContent>
          {draftLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p><strong>Count:</strong> {draftOrders?.length || 0}</p>
              <div className="mt-4">
                <strong>First 3 orders:</strong>
                <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto">
                  {JSON.stringify(
                    draftOrders?.slice(0, 3).map(o => ({
                      id: o.id,
                      orderNumber: o.orderNumber,
                      isDraft: o.isDraft,
                      orderType: o.orderType,
                    })),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
