import { Suspense } from 'react';
import Link from 'next/link';
import { getQuotes } from '@/actions/quotes';

export default async function QuotesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Quotes</h1>
          <p className="text-gray-600">
            Manage and track your sales quotes
          </p>
        </div>
        <Link
          href="/quotes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Quote
        </Link>
      </div>

      <Suspense fallback={<QuotesSkeleton />}>
        <QuotesList />
      </Suspense>
    </div>
  );
}

async function QuotesList() {
  const quotes = await getQuotes();

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new sales quote.
        </p>
        <div className="mt-6">
          <Link
            href="/quotes/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Quote
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {quotes.map((quote) => (
          <li key={quote.id}>
            <Link href={`/quotes/${quote.id}`} className="block hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-600 truncate">
                        Quote #{quote.quoteNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.customer?.companyName || 'No customer assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${(quote.totalAmount / 100).toFixed(0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Created {new Date(quote.createdAt).toLocaleDateString()}
                    </p>
                    {quote.validUntil && (
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Valid until {new Date(quote.validUntil).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuotesSkeleton() {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {[1, 2, 3, 4, 5].map(i => (
          <li key={i} className="px-4 py-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-32"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-12"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

