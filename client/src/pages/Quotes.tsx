import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Clock,
  Eye,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { DataCardSection } from '@/components/data-cards';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function Quotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  // Fetch clients for name lookup - handle paginated response
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
  
  // Helper to get client name
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  // Fetch all QUOTE orders - handle paginated response
  const { data: quotesData, isLoading, refetch } = trpc.orders.getAll.useQuery({
    orderType: 'QUOTE',
    quoteStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  });
  const quotes = Array.isArray(quotesData) ? quotesData : (quotesData?.items ?? []);
  
  // Apply URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, []);
  
  // Handle URL selection parameter (from search results)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedId = params.get('selected');
    if (selectedId && quotes) {
      const quote = quotes?.find(q => q.id === parseInt(selectedId, 10));
      if (quote) {
        setSelectedQuote(quote);
      } else {
        toast.error(`Quote #${selectedId} not found`);
      }
    }
  }, [quotes]);

  // Convert quote to sale mutation
  const convertToSale = trpc.orders.convertQuoteToSale.useMutation();

  // Filter quotes by search query
  const filteredQuotes = quotes.filter((quote: any) => {
    const searchLower = searchQuery.toLowerCase();
    const clientName = getClientName(quote.clientId);
    return (
      quote.orderNumber.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  });
  
  // Calculate statistics
  const stats = {
    draft: quotes.filter((q: any) => q.quoteStatus === 'DRAFT').length,
    sent: quotes.filter((q: any) => q.quoteStatus === 'SENT').length,
    accepted: quotes.filter((q: any) => q.quoteStatus === 'ACCEPTED').length,
    total: quotes.length,
  };

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
  };

  const [convertQuoteId, setConvertQuoteId] = useState<number | null>(null);

  const handleConvertToSale = async (quoteId: number) => {
    setConvertQuoteId(quoteId);
  };

  const confirmConvertToSale = async () => {
    if (!convertQuoteId) return;
    
    try {
      await convertToSale.mutateAsync({ quoteId: convertQuoteId });
      toast.success('Quote converted to sale successfully');
      refetch();
      setSelectedQuote(null);
      setConvertQuoteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert quote');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-300', icon: FileText },
      SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      EXPIRED: { label: 'Expired', className: 'bg-orange-100 text-orange-800 border-orange-300', icon: Clock },
    };

    const { label, className, icon: Icon } = config[status] || config.DRAFT;

    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading quotes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Quotes</h1>
          <p className="text-muted-foreground mt-1">
            Manage quotes and convert them to orders
          </p>
        </div>
        <Button onClick={() => setLocation('/orders/create')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Statistics Cards */}
      <DataCardSection moduleId="quotes" />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-muted-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card>
        <CardContent className="p-0">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No quotes found
            </div>
          ) : (
            <div className="divide-y">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewQuote(quote)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{quote.orderNumber}</h3>
                        {getStatusBadge(quote.quoteStatus || 'DRAFT')}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Client: {getClientName(quote.clientId || 0)}</div>
                        <div>
                          Created: {quote.createdAt ? format(new Date(quote.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                        </div>
                        {quote.validUntil && (
                          <div>
                            Valid until: {quote.validUntil ? format(new Date(quote.validUntil), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${parseFloat(quote.total).toFixed(2)}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewQuote(quote);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Detail Sheet */}
      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedQuote && (
            <>
              <SheetHeader>
                <SheetTitle>Quote {selectedQuote.orderNumber}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Status Section */}
                <div>
                  <h3 className="font-semibold mb-3">Quote Status</h3>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(selectedQuote.quoteStatus)}
                    {selectedQuote.quoteStatus === 'ACCEPTED' && (
                      <Button onClick={() => handleConvertToSale(selectedQuote.id)}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Convert to Sale
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Quote Details */}
                <div>
                  <h3 className="font-semibold mb-3">Quote Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{getClientName(selectedQuote.clientId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{selectedQuote.createdAt ? format(new Date(selectedQuote.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                    </div>
                    {selectedQuote.validUntil && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span>{format(new Date(selectedQuote.validUntil as string), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="space-y-2">
                    {(selectedQuote.items as any[])?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                        <div>
                          <div className="font-medium">{item.displayName}</div>
                          <div className="text-muted-foreground">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${parseFloat(item.price).toFixed(2)}</div>
                          <div className="text-muted-foreground text-xs">
                            Total: ${(item.quantity * parseFloat(item.price)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>${parseFloat(selectedQuote.subtotal).toFixed(2)}</span>
                    </div>
                    {parseFloat(selectedQuote.tax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>${parseFloat(selectedQuote.tax).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(selectedQuote.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span>-${parseFloat(selectedQuote.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${parseFloat(selectedQuote.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert to Sale Confirmation Dialog */}
      <ConfirmDialog
        open={!!convertQuoteId}
        onOpenChange={(open) => !open && setConvertQuoteId(null)}
        title="Convert Quote to Sale"
        description="Convert this quote to a sale order? This will create a new sales order and mark the quote as ACCEPTED."
        confirmLabel="Convert to Sale"
        variant="default"
        onConfirm={confirmConvertToSale}
        isLoading={convertToSale.isPending}
      />
    </div>
  );
}

