'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { SearchResult } from '@/actions/search';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  onAddToCart: (product: SearchResult, quantity: number) => void;
}

export default function SearchResults({ results, loading, onAddToCart }: SearchResultsProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const updateQuantity = (productId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleAddToCart = (product: SearchResult) => {
    const quantity = quantities[product.id] || 1;
    onAddToCart(product, quantity);
    // Reset quantity after adding
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const getAvailabilityBadge = (availability: string) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800'
    };

    const labels = {
      available: 'Available',
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[availability as keyof typeof badges]}`}>
        {labels[availability as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-100 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search criteria or filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {results.length} product{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            {/* Product Image */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
              {product.photos.length > 0 ? (
                <NextImage
                  src={product.photos[0]}
                  alt={product.name}
                  width={400}
                  height={225}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-100">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Product Info */}
              <div className="mb-4">
                   <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {product.name}
                    </h3>
                    {getAvailabilityBadge(product.availability)}
                  </div>
                
                <p className="text-sm text-gray-600 mb-1">SKU: {product.sku}</p>
                <p className="text-sm text-gray-600 mb-1">Unit: {product.unit}</p>
                <p className="text-sm text-gray-600 mb-1">Location: {product.location || 'N/A'}</p>
                <p className="text-sm text-gray-600 mb-1">Vendor: {product.vendorCode}</p>
              </div>

              {/* Pricing and Stock */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(product.currentPrice)}
                  </span>
                  <span className="text-sm text-gray-500">
                    per {product.unit}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600">
                  {product.quantityAvailable} {product.unit}s available
                </p>
              </div>

              {/* Add to Cart */}
              {product.availability !== 'out_of_stock' ? (
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label htmlFor={`qty-${product.id}`} className="sr-only">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id={`qty-${product.id}`}
                      min="1"
                      max={product.quantityAvailable}
                      value={quantities[product.id] || 1}
                      onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-shrink-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
