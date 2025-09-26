'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchProducts, SearchFilters as SearchFiltersType, SearchResult } from '@/actions/search';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import { useCart } from '@/hooks/useCart';

interface FilterOptions {
  categories: string[];
  locations: (string | null)[];
  vendors: {
    code: string;
    name: string;
  }[];
}

interface SearchInterfaceProps {
  filterOptions: FilterOptions;
}

export default function SearchInterface({ filterOptions }: SearchInterfaceProps) {
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();

  const performSearch = useCallback(async (searchFilters: SearchFiltersType) => {
    setLoading(true);
    try {
      const searchResults = await searchProducts(searchFilters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch({});
  }, [performSearch]);

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    performSearch(newFilters);
  };

  const handleAddToCart = (product: SearchResult, quantity: number) => {
    if (!product.batchId) {
      alert('This product is not available for purchase');
      return;
    }

    addToCart({
      productId: product.id,
      batchId: product.batchId,
      inventoryLotId: '',
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      price: product.currentPrice,
      quantity,
      vendorCode: product.vendorCode,
      location: product.location || '',
      maxQuantity: product.quantityAvailable
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <SearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          filterOptions={filterOptions}
          loading={loading}
        />
      </div>

      {/* Results */}
      <div className="lg:col-span-3">
        <SearchResults
          results={results}
          loading={loading}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}
