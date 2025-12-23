/**
 * Unified Sales Portal Page
 * 
 * A unified pipeline view combining sales sheets, quotes, and orders
 * with drag-and-drop stage management and conversion tracking.
 * 
 * USP-002: Frontend Implementation
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  FileCheck,
  ShoppingCart,
  Package,
  Search,
  Filter,
  MoreVertical,
  ArrowRight,
  Trash2,
  RotateCcw,
  Calendar,
  DollarSign,
  User,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'SALES_SHEET', label: 'Sales Sheets', icon: FileText, color: 'bg-blue-500' },
  { id: 'QUOTE', label: 'Quotes', icon: FileCheck, color: 'bg-yellow-500' },
  { id: 'SALE', label: 'Sales', icon: ShoppingCart, color: 'bg-green-500' },
  { id: 'FULFILLED', label: 'Fulfilled', icon: Package, color: 'bg-purple-500' },
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number]['id'];

// Pipeline item type from the backend
interface PipelineItem {
  id: string;
  sourceType: 'SALES_SHEET' | 'QUOTE' | 'SALE';
  sourceId: number;
  stage: PipelineStage;
  clientId: number;
  clientName: string;
  clientTeriCode: string;
  totalValue: number;
  itemCount: number;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string | null;
  convertedFromId: string | null;
  convertedToId: string | null;
  convertedAt: string | null;
  orderNumber?: string;
  orderStatus?: string;
  validUntil?: string | null;
  deletedAt: string | null;
}

// Pipeline item card component
function PipelineItemCard({
  item,
  onConvert,
  onDelete,
  onRestore,
}: {
  item: PipelineItem;
  onConvert: (item: PipelineItem) => void;
  onDelete: (item: PipelineItem) => void;
  onRestore: (item: PipelineItem) => void;
}) {
  const isDeleted = item.deletedAt !== null;
  
  const getStageConfig = (stage: PipelineStage) => {
    return PIPELINE_STAGES.find(s => s.id === stage) || PIPELINE_STAGES[0];
  };

  const stageConfig = getStageConfig(item.stage);
  const StageIcon = stageConfig.icon;

  return (
    <Card className={`mb-3 ${isDeleted ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stageConfig.color} text-white`}>
              <StageIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">{item.clientName}</div>
              <div className="text-sm text-muted-foreground">{item.clientTeriCode}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isDeleted && item.stage === 'SALES_SHEET' && (
                <DropdownMenuItem onClick={() => onConvert(item)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Quote
                </DropdownMenuItem>
              )}
              {!isDeleted && item.stage === 'QUOTE' && (
                <DropdownMenuItem onClick={() => onConvert(item)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Sale
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isDeleted ? (
                <DropdownMenuItem onClick={() => onRestore(item)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>${item.totalValue.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{item.createdByName}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
          </div>
          {item.orderNumber && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{item.orderNumber}</span>
            </div>
          )}
        </div>

        {item.convertedFromId && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Converted from {item.convertedFromId}
            </Badge>
          </div>
        )}

        {isDeleted && (
          <div className="mt-2">
            <Badge variant="destructive" className="text-xs">
              Deleted
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Pipeline column component
function PipelineColumn({
  stage,
  items,
  count,
  onConvert,
  onDelete,
  onRestore,
}: {
  stage: typeof PIPELINE_STAGES[number];
  items: PipelineItem[];
  count: number;
  onConvert: (item: PipelineItem) => void;
  onDelete: (item: PipelineItem) => void;
  onRestore: (item: PipelineItem) => void;
}) {
  const StageIcon = stage.icon;

  return (
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${stage.color} text-white`}>
          <StageIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold">{stage.label}</h3>
          <p className="text-sm text-muted-foreground">{count} items</p>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-350px)]">
        {items.map((item) => (
          <PipelineItemCard
            key={item.id}
            item={item}
            onConvert={onConvert}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No items in this stage
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default function UnifiedSalesPortalPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStages, setSelectedStages] = useState<PipelineStage[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch pipeline data
  const {
    data: pipelineData,
    isLoading,
    refetch,
  } = trpc.unifiedSalesPortal.getPipeline.useQuery({
    stages: selectedStages.length > 0 ? selectedStages : undefined,
    includeDeleted,
    limit: 500,
  });

  // Fetch stats
  const { data: stats } = trpc.unifiedSalesPortal.getStats.useQuery({});

  // Mutations
  const convertToQuoteMutation = trpc.unifiedSalesPortal.convertSalesSheetToQuote.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Conversion Successful",
        description: data.message,
      });
      setConvertDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertToSaleMutation = trpc.unifiedSalesPortal.convertQuoteToSale.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Conversion Successful",
        description: data.message,
      });
      setConvertDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const softDeleteMutation = trpc.unifiedSalesPortal.softDelete.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Item Deleted",
        description: data.message,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreMutation = trpc.unifiedSalesPortal.restore.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Item Restored",
        description: data.message,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!pipelineData?.items) return [];
    if (!searchQuery) return pipelineData.items;

    const query = searchQuery.toLowerCase();
    return pipelineData.items.filter(
      (item) =>
        item.clientName.toLowerCase().includes(query) ||
        item.clientTeriCode.toLowerCase().includes(query) ||
        item.orderNumber?.toLowerCase().includes(query) ||
        item.createdByName.toLowerCase().includes(query)
    );
  }, [pipelineData?.items, searchQuery]);

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const grouped: Record<PipelineStage, PipelineItem[]> = {
      SALES_SHEET: [],
      QUOTE: [],
      SALE: [],
      FULFILLED: [],
    };

    for (const item of filteredItems) {
      if (grouped[item.stage]) {
        grouped[item.stage].push(item);
      }
    }

    return grouped;
  }, [filteredItems]);

  // Handle convert action
  const handleConvert = (item: PipelineItem) => {
    setSelectedItem(item);
    setValidUntil("");
    setNotes("");
    setConvertDialogOpen(true);
  };

  // Handle delete action
  const handleDelete = (item: PipelineItem) => {
    softDeleteMutation.mutate({ itemId: item.id });
  };

  // Handle restore action
  const handleRestore = (item: PipelineItem) => {
    restoreMutation.mutate({ itemId: item.id });
  };

  // Handle conversion submit
  const handleConversionSubmit = () => {
    if (!selectedItem) return;

    if (selectedItem.stage === 'SALES_SHEET') {
      convertToQuoteMutation.mutate({
        salesSheetId: selectedItem.sourceId,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
      });
    } else if (selectedItem.stage === 'QUOTE') {
      convertToSaleMutation.mutate({
        orderId: selectedItem.sourceId,
        notes: notes || undefined,
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Portal</h1>
          <p className="text-muted-foreground">
            Unified view of your sales pipeline
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const StageIcon = stage.icon;
          const count = pipelineData?.stages?.[stage.id] || 0;
          let value = 0;
          if (stats) {
            if (stage.id === 'SALES_SHEET') value = stats.salesSheets.totalValue;
            else if (stage.id === 'QUOTE') value = stats.quotes.totalValue;
            else if (stage.id === 'SALE' || stage.id === 'FULFILLED') value = stats.sales.totalValue;
          }

          return (
            <Card key={stage.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stage.color} text-white`}>
                    <StageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stage.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">
                      ${value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Show deleted</Label>
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline View */}
      {isLoading ? (
        <div className="flex gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="flex-1 min-w-[300px]">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              items={itemsByStage[stage.id]}
              count={pipelineData?.stages?.[stage.id] || 0}
              onConvert={handleConvert}
              onDelete={handleDelete}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      {/* Conversion Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.stage === 'SALES_SHEET'
                ? 'Convert to Quote'
                : 'Convert to Sale'}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.stage === 'SALES_SHEET'
                ? 'Create a quote from this sales sheet. The original sales sheet will be linked to the new quote.'
                : 'Convert this quote to a sale. The quote will be updated to a sale order.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedItem?.stage === 'SALES_SHEET' && (
              <div className="space-y-2">
                <Label>Valid Until (Optional)</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
              />
            </div>

            {selectedItem && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Converting:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.clientName} - ${selectedItem.totalValue.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConversionSubmit}
              disabled={
                convertToQuoteMutation.isPending || convertToSaleMutation.isPending
              }
            >
              {convertToQuoteMutation.isPending || convertToSaleMutation.isPending
                ? 'Converting...'
                : 'Convert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
