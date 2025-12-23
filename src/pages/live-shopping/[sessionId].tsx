import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { trpc } from "../../utils/trpc";
import { useLiveSessionSSE } from "../../hooks/useLiveSessionSSE";
import { format } from "date-fns";
import Head from "next/head";

// Types
interface CartItemDisplay {
  id: number;
  batchId: number;
  productName: string;
  batchCode: string;
  quantity: string | number;
  unitPrice: string;
  subtotal: string;
  isHighlighted: boolean;
}

const LiveSessionConsole = () => {
  const router = useRouter();
  const sessionId = router.query.sessionId ? parseInt(router.query.sessionId as string) : null;
  
  // Queries & Mutations
  const { data: initialSession, isLoading: isSessionLoading } = trpc.liveShopping.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  
  const updateStatusMutation = trpc.liveShopping.updateSessionStatus.useMutation();
  const endSessionMutation = trpc.liveShopping.endSession.useMutation();
  const searchMutation = trpc.liveShopping.searchProducts.useQuery; // We'll use this dynamically

  // State
  const [searchTerm, setSearchTerm] = useState("");
  // Use SSE Hook for real-time state
  const { cart, sessionStatus, connectionStatus } = useLiveSessionSSE(sessionId!);

  if (!sessionId || isSessionLoading || !initialSession) {
    return <div className="p-10 text-center">Loading Session Console...</div>;
  }

  // Use local status if provided by SSE, otherwise initial
  const currentStatus = sessionStatus || initialSession.status;

  const handleStart = () => updateStatusMutation.mutate({ sessionId, status: "ACTIVE" });
  const handlePause = () => updateStatusMutation.mutate({ sessionId, status: "PAUSED" });
  const handleEnd = () => {
    if(confirm("End session and convert to Order?")) {
        endSessionMutation.mutate({ sessionId, convertToOrder: true }, {
            onSuccess: (data) => {
                if(data.orderId) alert(`Order #${data.orderId} created!`);
                router.push("/live-shopping");
            }
        });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 flex-col">
      <Head>
        <title>Live: {initialSession.client.name}</title>
      </Head>

      {/* HEADER */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">{initialSession.client.name}</h1>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                currentStatus === "ACTIVE" ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-700"
            }`}>
                ● {currentStatus}
            </span>
            <div className="text-xs text-gray-400">SSE: {connectionStatus}</div>
        </div>

        <div className="flex gap-2">
            {currentStatus === "SCHEDULED" || currentStatus === "PAUSED" ? (
                <button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium">
                    {currentStatus === "PAUSED" ? "Resume Session" : "Start Session"}
                </button>
            ) : currentStatus === "ACTIVE" ? (
                <button onClick={handlePause} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow-sm text-sm font-medium">
                    Pause
                </button>
            ) : null}
            
            {(currentStatus === "ACTIVE" || currentStatus === "PAUSED") && (
                <button onClick={handleEnd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium">
                    End & Convert
                </button>
            )}
        </div>
      </header>

      {/* MAIN CONTENT SPLIT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: PRODUCT SEARCH & CATALOG */}
        <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200 bg-white">
            <h2 className="text-lg font-semibold mb-4">Product Catalog</h2>
            <div className="mb-4">
                <input 
                    type="text"
                    placeholder="Search products or batch codes..."
                    className="w-full border border-gray-300 rounded-md p-3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <ProductSearchResults sessionId={sessionId} searchTerm={searchTerm} />
        </div>

        {/* RIGHT: LIVE CART */}
        <div className="w-1/2 p-6 overflow-y-auto bg-gray-50 flex flex-col">
            <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-semibold">Session Cart</h2>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Total Value</div>
                    <div className="text-2xl font-bold text-gray-900">${cart?.totalValue || "0.00"}</div>
                </div>
            </div>

            <div className="flex-1 space-y-3">
                {cart && cart.items.length > 0 ? (
                    cart.items.map((item: any) => (
                        <CartItemRow key={item.id} item={item} sessionId={sessionId} />
                    ))
                ) : (
                    <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        Cart is empty. Add products from the left.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const ProductSearchResults = ({ sessionId, searchTerm }: { sessionId: number, searchTerm: string }) => {
    // Only search if term length > 2
    const { data: products, isLoading } = trpc.liveShopping.searchProducts.useQuery(
        { query: searchTerm }, 
        { enabled: searchTerm.length > 2 }
    );
    
    const addToCartMutation = trpc.liveShopping.addToCart.useMutation();

    if (searchTerm.length <= 2) return <div className="text-gray-400 text-sm">Type to search...</div>;
    if (isLoading) return <div className="text-gray-400">Searching...</div>;

    return (
        <div className="space-y-4">
            {products?.map(p => (
                <div key={p.batchId} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                        <div className="font-medium text-gray-900">{p.productName}</div>
                        <div className="text-xs text-gray-500 font-mono">Batch: {p.batchCode}</div>
                        <div className="text-xs text-gray-500 mt-1">
                            Avail: <span className="font-bold">{p.onHand}</span> | Cost: ${p.unitCost}
                        </div>
                    </div>
                    <button 
                        onClick={() => addToCartMutation.mutate({ sessionId, batchId: p.batchId, quantity: 1 })}
                        disabled={addToCartMutation.isLoading}
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-100 text-sm"
                    >
                        Add +1
                    </button>
                </div>
            ))}
            {products?.length === 0 && <div>No products found.</div>}
        </div>
    );
};

const CartItemRow = ({ item, sessionId }: { item: any, sessionId: number }) => {
    const updateQtyMutation = trpc.liveShopping.updateCartQuantity.useMutation();
    const removeMutation = trpc.liveShopping.removeFromCart.useMutation();
    const highlightMutation = trpc.liveShopping.highlightProduct.useMutation();
    const overridePriceMutation = trpc.liveShopping.setOverridePrice.useMutation();

    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [priceInput, setPriceInput] = useState(item.unitPrice);

    const handlePriceSubmit = () => {
        overridePriceMutation.mutate({
            sessionId,
            productId: item.productId, // Note: item usually has productId denormalized
            price: parseFloat(priceInput)
        });
        setIsEditingPrice(false);
    };

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${item.isHighlighted ? "border-indigo-500 ring-2 ring-indigo-200" : "border-transparent"}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium text-gray-900">{item.productName}</h3>
                    <p className="text-xs text-gray-500 font-mono">{item.batchCode}</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                         onClick={() => highlightMutation.mutate({ sessionId, batchId: item.batchId, isHighlighted: !item.isHighlighted })}
                         className={`text-xs px-2 py-1 rounded ${item.isHighlighted ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {item.isHighlighted ? "★ Featured" : "☆ Feature"}
                    </button>
                    <button 
                        onClick={() => removeMutation.mutate({ sessionId, cartItemId: item.id })}
                        className="text-gray-400 hover:text-red-500"
                    >
                        ×
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center space-x-2">
                    <button 
                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                        onClick={() => updateQtyMutation.mutate({ sessionId, cartItemId: item.id, quantity: parseFloat(item.quantity) - 1 })}
                    >
                        -
                    </button>
                    <span className="font-mono w-12 text-center">{parseFloat(item.quantity).toFixed(0)}</span>
                    <button 
                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                        onClick={() => updateQtyMutation.mutate({ sessionId, cartItemId: item.id, quantity: parseFloat(item.quantity) + 1 })}
                    >
                        +
                    </button>
                </div>

                <div className="text-right">
                    <div className="text-sm font-medium">
                        {isEditingPrice ? (
                            <div className="flex items-center space-x-1">
                                <span className="text-gray-500">$</span>
                                <input 
                                    className="w-20 border rounded px-1 py-0.5 text-right"
                                    value={priceInput}
                                    onChange={e => setPriceInput(e.target.value)}
                                    onBlur={handlePriceSubmit}
                                    onKeyDown={e => e.key === 'Enter' && handlePriceSubmit()}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div 
                                className="cursor-pointer hover:text-indigo-600 flex items-center justify-end gap-1"
                                onClick={() => setIsEditingPrice(true)}
                                title="Click to override price"
                            >
                                ${parseFloat(item.unitPrice).toFixed(2)}
                                <span className="text-xs text-gray-400">✎</span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">
                        Subtotal: ${parseFloat(item.subtotal).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveSessionConsole;
