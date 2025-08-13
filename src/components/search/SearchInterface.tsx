'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchProducts, SearchFilters as SearchFiltersType, SearchResult } from '@/actions/search';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import { useCart } from '@/hooks/useCart';

interface FilterOptions {
  categories: string[];
  locations: string[];
  vendors: {
    id: string;
    vendorCode: string;
    displayName: string;
  }[];
}

interface SearchInterfaceProps {
  filterOptions: FilterOptions;
}

export default function SearchInterface({ filterOptions }: SearchInterfaceProps) {
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  const performSearch = useCallback(async (searchFilters: SearchFiltersType) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await searchProducts(searchFilters);
      setResults(searchResults);
    } catch (err) {
      setError('Failed to search products. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial search on component mount
  useEffect(() => {
    performSearch({});
  }, [performSearch]);

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    performSearch(newFilters);
  };

  const handleAddToCart = (product: SearchResult, quantity: number) => {
    if (!product.batch || !product.inventoryLot) {
      alert('This product is not available for purchase');
      return;
    }

    addToCart({
      productId: product.id,
      batchId: product.batch.id,
      inventoryLotId: product.inventoryLot.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      price: product.displayPrice,
      quantity,
      vendorCode: product.batch.vendorCode,
      location: product.inventoryLot.location,
      maxQuantity: product.inventoryLot.qtyAvailable
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <SearchFilters
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          loading={loading}
        />
      </div>

      {/* Results Area */}
      <div className="lg:col-span-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Search Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <SearchResults
          results={results}
          loading={loading}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}

