import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

// Mock data for quotes
const mockQuotes = [
  {
    id: 'Q-2024-001',
    customer: 'Acme Corporation',
    amount: 15750.00,
    status: 'pending',
    date: '2024-01-15',
  },
  {
    id: 'Q-2024-002',
    customer: 'Tech Solutions Inc.',
    amount: 28900.00,
    status: 'approved',
    date: '2024-01-18',
  },
  {
    id: 'Q-2024-003',
    customer: 'Global Enterprises',
    amount: 42300.00,
    status: 'pending',
    date: '2024-01-20',
  },
  {
    id: 'Q-2024-004',
    customer: 'Innovative Systems',
    amount: 19500.00,
    status: 'rejected',
    date: '2024-01-22',
  },
];

export default function Quotes() {
  const [quotes] = useState(mockQuotes);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Quotes</h1>
          <p className="text-muted-foreground mt-1">
            Manage quotes and convert them to orders.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-medium">Quote ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-6 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{quote.id}</td>
                  <td className="px-6 py-4 text-sm">{quote.customer}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${quote.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{quote.date}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

