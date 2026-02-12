import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { trpc } from "../../utils/trpc";
import { useLiveSessionClient } from "../../hooks/useLiveSessionClient";
import Image from "next/image";

// Layout Component Mock (Replace with actual VIP Portal Layout)
const VipLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">{children}</div>
);

// Helper for currency formatting
const formatCurrency = (val: string | number) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

export default function VipLiveSessionPage() {
  const router = useRouter();
  const { roomCode } = router.query;
  
  // State for session auth logic (retrieving token from storage)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // State for highlighted product details
  const [highlightedProduct, setHighlightedProduct] = useState<any>(null);
  
  // State for quantity inputs
  const [buyQty, setBuyQty] = useState<number>(1);
  const [checkoutRequested, setCheckoutRequested] = useState(false);

  // Initialize Auth
  useEffect(() => {
    // In a real app, this might come from a robust auth context
    const token = localStorage.getItem("vipSessionToken");
    if (!token) {
      router.push("/vip/login");
    } else {
      setSessionToken(token);
    }
  }, [router]);

  // 1. Join Session (Initial Data Fetch)
  const joinMutation = trpc.vipPortalLiveShopping.joinSession.useMutation();
  const hasJoined =  joinMutation.isSuccess;

  // 2. Fetch Highlighted Item Details
  const batchDetailsQuery = trpc.vipPortalLiveShopping.getBatchDetails.useQuery(
    { 
      batchId: highlightedProduct?.batchId!, 
      sessionId: joinMutation.data?.session.id! 
    },
    { enabled: !!highlightedProduct?.batchId && !!joinMutation.data?.session.id }
  );

  // 3. Actions
  const addToCartMutation = trpc.vipPortalLiveShopping.addToCart.useMutation();
  const updateQtyMutation = trpc.vipPortalLiveShopping.updateQuantity.useMutation();
  const removeMutation = trpc.vipPortalLiveShopping.removeItem.useMutation();
  const requestCheckoutMutation = trpc.vipPortalLiveShopping.requestCheckout.useMutation();

  // 4. SSE Hook
  const { 
    cart, 
    sessionStatus, 
    highlightedBatchId, 
    connectionStatus 
  } = useLiveSessionClient(
    (typeof roomCode === "string" && hasJoined) ? roomCode : "", 
    sessionToken || ""
  );

  // Effect: Join Session on Mount
  useEffect(() => {
    if (roomCode && sessionToken && !hasJoined && !joinMutation.isLoading) {
      joinMutation.mutate({ roomCode: roomCode as string });
    }
  }, [roomCode, sessionToken, hasJoined]);

  // Effect: Sync highlighted ID to local state to fetch details
  useEffect(() => {
    if (highlightedBatchId) {
      setHighlightedProduct({ batchId: highlightedBatchId });
      setBuyQty(1); // Reset qty picker
    }
  }, [highlightedBatchId]);

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!joinMutation.data?.session.id || !highlightedBatchId) return;
    
    try {
      await addToCartMutation.mutateAsync({
        sessionId: joinMutation.data.session.id,
        batchId: highlightedBatchId,
        quantity: buyQty,
      });
      // Success feedback (optional)
    } catch (err) {
      console.error("Failed to add to cart", err);
      alert("Failed to add to cart. Please try again.");
    }
  };

  // Handle Checkout Request
  const handleRequestCheckout = async () => {
    if (!joinMutation.data?.session.id) return;
    if (!confirm("Are you finished shopping? This will notify the host.")) return;

    try {
      await requestCheckoutMutation.mutateAsync({
        sessionId: joinMutation.data.session.id
      });
      setCheckoutRequested(true);
    } catch (err) {
      alert("Could not notify host.");
    }
  };

  // Loading State
  if (joinMutation.isLoading || !sessionToken) {
    return (
      <VipLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-lg font-semibold text-gray-600">
            Joining Live Session...
          </div>
        </div>
      </VipLayout>
    );
  }

  // Error State
  if (joinMutation.isError) {
    return (
      <VipLayout>
        <div className="flex flex-col items-center justify-center h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">{joinMutation.error.message}</p>
          <button 
            onClick={() => router.push("/vip/dashboard")}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </VipLayout>
    );
  }

  const session = joinMutation.data?.session;
  const activeProduct = batchDetailsQuery.data;

  // Determine effective cart from SSE or initial fetch
  const effectiveCart = cart || joinMutation.data?.cart;

  return (
    <VipLayout>
      <Head>
        <title>{session?.title} | Live Shopping</title>
      </Head>

      {/* Main Container */}
      <div className="flex flex-col h-screen max-w-7xl mx-auto md:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: Stage / Highlighted Product */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {/* Header */}
          <header className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{session?.title}</h1>
              <p className="text-sm text-gray-500">
                Host: {session?.hostName} 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  connectionStatus === "CONNECTED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {connectionStatus === "CONNECTED" ? "LIVE" : "CONNECTING..."}
                </span>
              </p>
            </div>
          </header>

          {/* Main Stage */}
          <main className="flex-1 p-6 flex flex-col items-center justify-center">
            {sessionStatus === "ENDED" ? (
               <div className="text-center">
                 <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Ended</h2>
                 <p className="text-gray-600">Thank you for shopping with us!</p>
               </div>
            ) : highlightedBatchId && activeProduct ? (
              <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Product Image */}
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 relative h-64 w-full">
                  {activeProduct.imageUrl ? (
                     <img 
                       src={activeProduct.imageUrl} 
                       alt={activeProduct.productName} 
                       className="object-contain w-full h-full"
                     />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No Image Available
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {activeProduct.productName}
                      </h2>
                      <p className="text-sm text-gray-500 font-mono mt-1">
                        Batch: {activeProduct.code}
                      </p>
                    </div>
                    {/* Price - note: actual price might vary in cart due to session pricing logic */}
                    <div className="text-2xl font-bold text-indigo-600">
                      ~${activeProduct.price}
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6 line-clamp-3">
                    {activeProduct.description || "No description available."}
                  </p>

                  {/* Add to Cart Controls */}
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center border rounded-lg">
                      <button 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                        onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        className="w-16 text-center border-x py-2 focus:outline-none"
                        value={buyQty}
                        onChange={(e) => setBuyQty(parseFloat(e.target.value) || 1)}
                      />
                      <button 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                        onClick={() => setBuyQty(buyQty + 1)}
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      onClick={handleAddToCart}
                      disabled={addToCartMutation.isLoading || sessionStatus !== "ACTIVE"}
                      className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {addToCartMutation.isLoading ? "Adding..." : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Waiting for Host...</h3>
                <p>The host hasn't highlighted a product yet.</p>
              </div>
            )}
          </main>
        </div>

        {/* RIGHT COLUMN: Cart */}
        <div className="w-full md:w-96 bg-gray-50 border-l border-gray-200 flex flex-col h-[50vh] md:h-screen">
          <div className="p-4 bg-white border-b shadow-sm">
            <h2 className="font-bold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Your Cart ({effectiveCart?.itemCount || 0})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!effectiveCart?.items || effectiveCart.items.length === 0 ? (
              <p className="text-center text-gray-500 py-10">Your cart is empty.</p>
            ) : (
              effectiveCart.items.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white p-3 rounded-lg shadow-sm border ${item.isHighlighted ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.productName}</h4>
                      <p className="text-xs text-gray-500">Batch: {item.batchCode}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-sm">{formatCurrency(item.subtotal)}</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice)} / unit
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                     <div className="flex items-center text-sm border rounded">
                       <button 
                         className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                         disabled={sessionStatus !== "ACTIVE"}
                         onClick={() => {
                           if (!session) return;
                           updateQtyMutation.mutate({
                             sessionId: session.id,
                             cartItemId: item.id,
                             quantity: parseFloat(item.quantity.toString()) - 1
                           });
                         }}
                       >
                         -
                       </button>
                       <span className="px-2 font-mono">{parseFloat(item.quantity.toString())}</span>
                       <button 
                         className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                         disabled={sessionStatus !== "ACTIVE"}
                         onClick={() => {
                           if (!session) return;
                           updateQtyMutation.mutate({
                             sessionId: session.id,
                             cartItemId: item.id,
                             quantity: parseFloat(item.quantity.toString()) + 1
                           });
                         }}
                       >
                         +
                       </button>
                     </div>
                     
                     <button 
                        className="text-xs text-red-500 hover:text-red-700 underline"
                        disabled={sessionStatus !== "ACTIVE"}
                        onClick={() => {
                          if (!session) return;
                          removeMutation.mutate({
                            sessionId: session.id,
                            cartItemId: item.id
                          });
                        }}
                     >
                       Remove
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t space-y-3">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(effectiveCart?.totalValue || 0)}</span>
            </div>
            
            <button 
              onClick={handleRequestCheckout}
              disabled={!effectiveCart?.items.length || checkoutRequested || sessionStatus !== "ACTIVE"}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow transition-colors ${
                checkoutRequested 
                  ? "bg-green-600 cursor-default" 
                  : "bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400"
              }`}
            >
              {checkoutRequested ? "Checkout Requested" : "Request Checkout"}
            </button>
            {checkoutRequested && (
              <p className="text-xs text-center text-green-600 mt-1">
                The host has been notified.
              </p>
            )}
          </div>
        </div>
      </div>
    </VipLayout>
  );
}
