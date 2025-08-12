'use client';

import { useState } from 'react';
import { SearchFilters as SearchFiltersType } from '@/actions/search';

interface FilterOptions {
  categories: string[];
  locations: string[];
  vendors: {
    id: string;
    vendorCode: string;
    displayName: string;
  }[];
}

interface SearchFiltersProps {
  filterOptions: FilterOptions;
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  loading: boolean;
}

export default function SearchFilters({
  filterOptions,
  filters,
  onFiltersChange,
  loading
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);

  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SearchFiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key as keyof SearchFiltersType] !== undefined && 
    localFilters[key as keyof SearchFiltersType] !== ''
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Keyword Search */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            id="keyword"
            placeholder="SKU, name, or description..."
            value={localFilters.keyword || ''}
            onChange={(e) => updateFilter('keyword', e.target.value || undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={localFilters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value || undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Availability Filter */}
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
            Availability
          </label>
          <select
            id="availability"
            value={localFilters.availability || ''}
            onChange={(e) => updateFilter('availability', e.target.value || undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">All Items</option>
            <option value="available">Available</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <select
            id="location"
            value={localFilters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value || undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">All Locations</option>
            {filterOptions.locations.map(location => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor Filter */}
        <div>
          <label htmlFor="vendorCode" className="block text-sm font-medium text-gray-700 mb-2">
            Vendor
          </label>
          <select
            id="vendorCode"
            value={localFilters.vendorCode || ''}
            onChange={(e) => updateFilter('vendorCode', e.target.value || undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">All Vendors</option>
            {filterOptions.vendors.map(vendor => (
              <option key={vendor.id} value={vendor.vendorCode}>
                {vendor.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                placeholder="Min"
                value={localFilters.priceMin || ''}
                onChange={(e) => updateFilter('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max"
                value={localFilters.priceMax || ''}
                onChange={(e) => updateFilter('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      )}
    </div>
  );
}

