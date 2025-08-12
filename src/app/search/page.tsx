import { Suspense } from 'react';
import SearchInterface from '@/components/search/SearchInterface';
import { getSearchFilterOptions } from '@/actions/search';

export default async function SearchPage() {
  const filterOptions = await getSearchFilterOptions();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Search</h1>
        <p className="text-gray-600">
          Search and filter products to add to your quote
        </p>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <SearchInterface filterOptions={filterOptions} />
      </Suspense>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters skeleton */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Results skeleton */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-100 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

