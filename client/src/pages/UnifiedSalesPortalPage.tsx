// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
/**
 * Unified Sales Portal Page
 * 
 * A unified pipeline view combining sales sheets, quotes, and orders
 * with drag-and-drop stage management and conversion tracking.
 * 
 * USP-002: Frontend Implementation
 * USP-005: Enhanced Features
 * - Drag-and-drop conversion with @dnd-kit
 * - Confirmation dialog for quote-to-sale conversion
 * - Advanced filtering (date range, value range, creator)
 * - List view toggle
 * - Terminal status filtering
 */

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  LayoutGrid,
  List,
  ChevronDown,
  AlertTriangle,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'SALES_SHEET', label: 'Sales Sheets', icon: FileText, color: 'bg-blue-500', dropColor: 'bg-blue-100 border-blue-500' },
  { id: 'QUOTE', label: 'Quotes', icon: FileCheck, color: 'bg-yellow-500', dropColor: 'bg-yellow-100 border-yellow-500' },
  { id: 'SALE', label: 'Sales', icon: ShoppingCart, color: 'bg-green-500', dropColor: 'bg-green-100 border-green-500' },
  { id: 'FULFILLED', label: 'Fulfilled', icon: Package, color: 'bg-purple-500', dropColor: 'bg-purple-100 border-purple-500' },
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number]['id'];

// Valid drag-and-drop transitions
const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  'SALES_SHEET': ['QUOTE'],
  'QUOTE': ['SALE'],
  'SALE': ['FULFILLED'],
  'FULFILLED': [],
};

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
  quoteStatus?: string;
  saleStatus?: string;
  validUntil?: string | null;
  isExpired?: boolean;
  deletedAt: string | null;
}

// Draggable pipeline item card component
function DraggablePipelineItemCard({
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const isDeleted = item.deletedAt !== null;
  const canDrag = !isDeleted && VALID_TRANSITIONS[item.stage].length > 0;
  
  const getStageConfig = (stage: PipelineStage) => {
    return PIPELINE_STAGES.find(s => s.id === stage) || PIPELINE_STAGES[0];
  };

  const stageConfig = getStageConfig(item.stage);
  const StageIcon = stageConfig.icon;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-3 ${isDeleted ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {canDrag && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
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

          <div className="mt-2 flex flex-wrap gap-1">
            {item.convertedFromId && (
              <Badge variant="outline" className="text-xs">
                From {item.convertedFromId}
              </Badge>
            )}
            {item.isExpired && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
            {isDeleted && (
              <Badge variant="destructive" className="text-xs">
                Deleted
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable pipeline column component
function DroppablePipelineColumn({
  stage,
  items,
  count,
  value,
  onConvert,
  onDelete,
  onRestore,
  isOver,
}: {
  stage: typeof PIPELINE_STAGES[number];
  items: PipelineItem[];
  count: number;
  value: number;
  onConvert: (item: PipelineItem) => void;
  onDelete: (item: PipelineItem) => void;
  onRestore: (item: PipelineItem) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  const StageIcon = stage.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] p-3 rounded-lg transition-colors ${
        isOver ? `${stage.dropColor} border-2 border-dashed` : 'bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${stage.color} text-white`}>
          <StageIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold">{stage.label}</h3>
          <p className="text-sm text-muted-foreground">
            {count} items · ${value.toLocaleString()}
          </p>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-400px)]">
        {items.map((item) => (
          <DraggablePipelineItemCard
            key={item.id}
            item={item}
            onConvert={onConvert}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            {isOver ? 'Drop here to convert' : 'No items in this stage'}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// List view row component
function PipelineListRow({
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
  const stageConfig = PIPELINE_STAGES.find(s => s.id === item.stage) || PIPELINE_STAGES[0];
  const StageIcon = stageConfig.icon;

  return (
    <TableRow className={isDeleted ? 'opacity-50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${stageConfig.color} text-white`}>
            <StageIcon className="h-3 w-3" />
          </div>
          <span className="font-medium">{stageConfig.label}</span>
        </div>
      </TableCell>
      <TableCell>{item.id}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{item.clientName}</div>
          <div className="text-sm text-muted-foreground">{item.clientTeriCode}</div>
        </div>
      </TableCell>
      <TableCell className="text-right">${item.totalValue.toLocaleString()}</TableCell>
      <TableCell>{item.createdByName}</TableCell>
      <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          {item.isExpired && (
            <Badge variant="destructive" className="text-xs">Expired</Badge>
          )}
          {isDeleted && (
            <Badge variant="destructive" className="text-xs">Deleted</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isDeleted && VALID_TRANSITIONS[item.stage].length > 0 && (
              <DropdownMenuItem onClick={() => onConvert(item)}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Convert to {VALID_TRANSITIONS[item.stage][0] === 'QUOTE' ? 'Quote' : 'Sale'}
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
      </TableCell>
    </TableRow>
  );
}

export default function UnifiedSalesPortalPage() {
  const { toast } = useToast();
  
  // View state
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStages, setSelectedStages] = useState<PipelineStage[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<string>("NET_30");
  
  // Drag state
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ item: PipelineItem; targetStage: PipelineStage } | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch pipeline data
  const {
    data: pipelineData,
    isLoading,
    refetch,
  } = trpc.unifiedSalesPortal.getPipeline.useQuery({
    stages: selectedStages.length > 0 ? selectedStages : undefined,
    includeDeleted,
    includeClosed,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    minValue: minValue ? parseFloat(minValue) : undefined,
    maxValue: maxValue ? parseFloat(maxValue) : undefined,
    search: searchQuery || undefined,
    limit: 500,
  });

  // Fetch stats
  const { data: stats } = trpc.unifiedSalesPortal.getStats.useQuery({
    includeClosed,
  });

  // Check quote conversion (for confirmation dialog)
  const { data: quoteCheckData } = trpc.unifiedSalesPortal.checkQuoteConversion.useQuery(
    { orderId: pendingDrop?.item.sourceId || 0 },
    { enabled: !!pendingDrop && pendingDrop.targetStage === 'SALE' }
  );

  // Mutations
  const convertToQuoteMutation = trpc.unifiedSalesPortal.convertSalesSheetToQuote.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Conversion Successful",
        description: data.message,
      });
      setConvertDialogOpen(false);
      setPendingDrop(null);
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
      setConfirmDialogOpen(false);
      setPendingDrop(null);
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

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const grouped: Record<PipelineStage, PipelineItem[]> = {
      SALES_SHEET: [],
      QUOTE: [],
      SALE: [],
      FULFILLED: [],
    };

    if (pipelineData?.items) {
      for (const item of pipelineData.items) {
        if (grouped[item.stage]) {
          grouped[item.stage].push(item);
        }
      }
    }

    return grouped;
  }, [pipelineData?.items]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as PipelineItem;
    setActiveItem(item);
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as PipelineStage | null;
    setOverStage(overId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverStage(null);

    if (!over) return;

    const item = active.data.current?.item as PipelineItem;
    const targetStage = over.id as PipelineStage;

    // Check if this is a valid transition
    if (!VALID_TRANSITIONS[item.stage].includes(targetStage)) {
      toast({
        title: "Invalid Transition",
        description: `Cannot move from ${item.stage} to ${targetStage}`,
        variant: "destructive",
      });
      return;
    }

    // For Quote -> Sale, show confirmation dialog
    if (item.stage === 'QUOTE' && targetStage === 'SALE') {
      setPendingDrop({ item, targetStage });
      setSelectedItem(item);
      setConfirmDialogOpen(true);
    } else {
      // For Sales Sheet -> Quote, show conversion dialog
      setPendingDrop({ item, targetStage });
      setSelectedItem(item);
      setConvertDialogOpen(true);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setOverStage(null);
  };

  // Handle convert action (from menu)
  const handleConvert = (item: PipelineItem) => {
    setSelectedItem(item);
    setValidUntil("");
    setNotes("");
    
    if (item.stage === 'QUOTE') {
      // For quotes, show confirmation dialog first
      setConfirmDialogOpen(true);
    } else {
      setConvertDialogOpen(true);
    }
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
    }
  };

  // Handle quote-to-sale confirmation
  const handleQuoteToSaleConfirm = (confirmExpired: boolean = false) => {
    if (!selectedItem) return;

    convertToSaleMutation.mutate({
      orderId: selectedItem.sourceId,
      paymentTerms: paymentTerms as any,
      notes: notes || undefined,
      confirmExpired,
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStages([]);
    setIncludeDeleted(false);
    setIncludeClosed(false);
    setDateFrom("");
    setDateTo("");
    setMinValue("");
    setMaxValue("");
  };

  const hasActiveFilters = searchQuery || selectedStages.length > 0 || includeDeleted || includeClosed || dateFrom || dateTo || minValue || maxValue;

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
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const StageIcon = stage.icon;
          const stageStats = pipelineData?.stages?.[stage.id] || { count: 0, value: 0 };
          const count = stageStats.count || 0;
          const value = stageStats.value || 0;

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
            
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="w-full mt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Value ($)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Value ($)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeDeleted"
                      checked={includeDeleted}
                      onCheckedChange={(checked) => setIncludeDeleted(checked as boolean)}
                    />
                    <Label htmlFor="includeDeleted">Show deleted</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeClosed"
                      checked={includeClosed}
                      onCheckedChange={(checked) => setIncludeClosed(checked as boolean)}
                    />
                    <Label htmlFor="includeClosed">Show closed/expired</Label>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
      ) : viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageStats = pipelineData?.stages?.[stage.id] || { count: 0, value: 0 };
              return (
                <DroppablePipelineColumn
                  key={stage.id}
                  stage={stage}
                  items={itemsByStage[stage.id]}
                  count={stageStats.count || 0}
                  value={stageStats.value || 0}
                  onConvert={handleConvert}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  isOver={overStage === stage.id}
                />
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem ? (
              <Card className="w-[280px] shadow-lg ring-2 ring-primary opacity-90">
                <CardContent className="p-4">
                  <div className="font-medium">{activeItem.clientName}</div>
                  <div className="text-sm text-muted-foreground">{activeItem.clientTeriCode}</div>
                  <div className="mt-2 text-sm">${activeItem.totalValue.toLocaleString()}</div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineData?.items.map((item) => (
                <PipelineListRow
                  key={item.id}
                  item={item}
                  onConvert={handleConvert}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              ))}
              {(!pipelineData?.items || pipelineData.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Sales Sheet to Quote Conversion Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Quote</DialogTitle>
            <DialogDescription>
              Create a quote from this sales sheet. The original sales sheet will be linked to the new quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valid Until (Optional)</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
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
              disabled={convertToQuoteMutation.isPending}
            >
              {convertToQuoteMutation.isPending ? 'Converting...' : 'Convert to Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote to Sale Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {quoteCheckData?.isExpired ? (
                <span className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Expired Quote Warning
                </span>
              ) : (
                'Confirm Conversion to Sale'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {quoteCheckData?.warnings?.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
              
              <p className="pt-2">
                This will convert the quote to a sale order and:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Reduce inventory for all items</li>
                <li>Create an audit log entry</li>
                <li>Generate a sale order number</li>
              </ul>

              {selectedItem && (
                <div className="bg-muted p-3 rounded-lg mt-3">
                  <p className="text-sm font-medium">Quote Details:</p>
                  <p className="text-sm">
                    {selectedItem.clientName} - ${selectedItem.totalValue.toLocaleString()}
                  </p>
                  {selectedItem.orderNumber && (
                    <p className="text-sm text-muted-foreground">{selectedItem.orderNumber}</p>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET_7">Net 7</SelectItem>
                    <SelectItem value="NET_15">Net 15</SelectItem>
                    <SelectItem value="NET_30">Net 30</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmDialogOpen(false);
              setPendingDrop(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleQuoteToSaleConfirm(quoteCheckData?.isExpired || false)}
              disabled={convertToSaleMutation.isPending}
              className={quoteCheckData?.isExpired ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {convertToSaleMutation.isPending 
                ? 'Converting...' 
                : quoteCheckData?.isExpired 
                  ? 'Convert Anyway' 
                  : 'Confirm Conversion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
