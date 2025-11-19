import { trpc } from "@/lib/trpc";

export default function OrdersDebug() {
  const { data: confirmedOrders, isLoading } = trpc.orders.getAll.useQuery({
    isDraft: false,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Orders Debug Page</h1>

      <div className="mb-4">
        <p>
          <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Orders count:</strong> {confirmedOrders?.length || 0}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Orders:</h2>
        {confirmedOrders?.map(order => (
          <div key={order.id} className="border p-4 rounded">
            <p>
              <strong>ID:</strong> {order.id}
            </p>
            <p>
              <strong>Order Number:</strong> {order.orderNumber}
            </p>
            <p>
              <strong>Client ID:</strong> {order.clientId}
            </p>
            <p>
              <strong>isDraft:</strong> {String(order.isDraft)}
            </p>
            <p>
              <strong>Status:</strong> {order.fulfillmentStatus}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
