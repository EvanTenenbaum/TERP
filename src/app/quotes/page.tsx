import { Suspense } from 'react';
import Link from 'next/link';
import { getQuotes } from '@/actions/quotes';
import { ClientLink } from '@/components/client/ClientLink';

export default async function QuotesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Sheets</h1>
          <p className="text-gray-600">
            Create, send, and track sales sheets
          </p>
        </div>
        <Link
          href="/quotes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Sales Sheet
        </Link>
      </div>

      <Suspense fallback={<QuotesSkeleton />}>
        <QuotesList />
      </Suspense>
    </div>
  );
}

async function QuotesList() {
  const quotesResponse = await getQuotes();
  const quotes = quotesResponse.success && quotesResponse.quotes ? quotesResponse.quotes : [];

  if (!quotes || quotes.length === 0) {
    const EmptyState = (await import('@/components/ui/EmptyState')).default
    return (
      <EmptyState title="No sales sheets" description="Get started by creating a new sales sheet." actionHref="/quotes/new" actionLabel="Create Sales Sheet" />
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
                        Sales Sheet #{quote.quoteNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.customer ? (
                          <ClientLink partyId={quote.customer.partyId || undefined} fallbackHref="/clients">
                            {quote.customer.companyName}
                          </ClientLink>
                        ) : 'No customer assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${(quote.totalAmount / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.quoteItems.length} item{quote.quoteItems.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        quote.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        quote.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
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
                    {quote.expirationDate && (
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Valid until {new Date(quote.expirationDate).toLocaleDateString()}
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
