/**
 * Sprint 4 Track B - 4.B.6: MEET-021 - Client Wants/Needs Tracking
 *
 * UI component for managing client wants:
 * - Add/edit/delete wants
 * - View matches to inventory
 * - Wants list on client profile
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ClientWantsSectionProps {
  clientId: number;
}

// Type for want data from API
interface ClientWant {
  id: number;
  client_id: number;
  product_id: number | null;
  category_id: number | null;
  strain_name: string | null;
  product_keywords: string | null;
  min_quantity: string | null;
  max_quantity: string | null;
  max_price_per_unit: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "ACTIVE" | "MATCHED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  notes: string | null;
  internal_notes: string | null;
  notify_on_match: boolean;
  notify_email: boolean;
  needed_by_date: string | null;
  expires_at: string | null;
  match_count: number;
  last_matched_at: string | null;
  created_at: string;
  product_name?: string | null;
  category_name?: string | null;
  created_by_name?: string | null;
}

/**
 * ClientWantsSection - Manages client wants/needs on profile page
 */
export function ClientWantsSection({ clientId }: ClientWantsSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [matchesDialogOpen, setMatchesDialogOpen] = useState(false);
  const [selectedWant, setSelectedWant] = useState<ClientWant | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  
  // BUG-007: State for delete confirmation dialog (replaces window.confirm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wantToDelete, setWantToDelete] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch client wants
  const { data, isLoading, error } = trpc.clientWants.getByClient.useQuery({
    clientId,
    status:
      statusFilter !== "all"
        ? (statusFilter as
            | "ACTIVE"
            | "MATCHED"
            | "FULFILLED"
            | "EXPIRED"
            | "CANCELLED")
        : undefined,
  });

  // Fetch matches for selected want
  const { data: matchesData, isLoading: matchesLoading } =
    trpc.clientWants.findMatches.useQuery(
      { wantId: selectedWant?.id || 0 },
      { enabled: matchesDialogOpen && !!selectedWant }
    );

  // Mutations
  const createMutation = trpc.clientWants.create.useMutation({
    onSuccess: () => {
      toast.success("Want created successfully");
      setAddDialogOpen(false);
      utils.clientWants.getByClient.invalidate({ clientId });
    },
    onError: error => {
      toast.error(error.message || "Failed to create want");
    },
  });

  const updateMutation = trpc.clientWants.update.useMutation({
    onSuccess: () => {
      toast.success("Want updated successfully");
      setEditDialogOpen(false);
      utils.clientWants.getByClient.invalidate({ clientId });
    },
    onError: error => {
      toast.error(error.message || "Failed to update want");
    },
  });

  const fulfillMutation = trpc.clientWants.fulfill.useMutation({
    onSuccess: () => {
      toast.success("Want marked as fulfilled");
      utils.clientWants.getByClient.invalidate({ clientId });
    },
  });

  const cancelMutation = trpc.clientWants.cancel.useMutation({
    onSuccess: () => {
      toast.success("Want cancelled");
      utils.clientWants.getByClient.invalidate({ clientId });
    },
  });

  const deleteMutation = trpc.clientWants.delete.useMutation({
    onSuccess: () => {
      toast.success("Want deleted");
      utils.clientWants.getByClient.invalidate({ clientId });
    },
  });

  // Priority badge colors
  const getPriorityBadge = (priority: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  // Status badge colors
  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      ACTIVE: "default",
      MATCHED: "secondary",
      FULFILLED: "outline",
      EXPIRED: "destructive",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load client wants</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wants = (data?.wants || []) as ClientWant[];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Wants
              </CardTitle>
              <CardDescription>
                Track products this client wants to purchase
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Want
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="MATCHED">Matched</SelectItem>
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wants Table */}
          {wants.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product/Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Needed By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wants.map(want => (
                    <TableRow key={want.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {want.product_name ||
                              want.strain_name ||
                              want.product_keywords ||
                              "Any product"}
                          </p>
                          {want.category_name && (
                            <p className="text-sm text-muted-foreground">
                              Category: {want.category_name}
                            </p>
                          )}
                          {want.max_price_per_unit && (
                            <p className="text-sm text-muted-foreground">
                              Max: {formatCurrency(want.max_price_per_unit)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(want.priority)}</TableCell>
                      <TableCell>{getStatusBadge(want.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => {
                            setSelectedWant(want);
                            setMatchesDialogOpen(true);
                          }}
                        >
                          {want.match_count || 0} matches
                        </Button>
                      </TableCell>
                      <TableCell>{formatDate(want.needed_by_date)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWant(want);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWant(want);
                                setMatchesDialogOpen(true);
                              }}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Find Matches
                            </DropdownMenuItem>
                            {want.status === "ACTIVE" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    fulfillMutation.mutate({ id: want.id })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Fulfilled
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    cancelMutation.mutate({ id: want.id })
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                // BUG-007: Show confirm dialog instead of window.confirm
                                setWantToDelete(want.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No product wants found</p>
              <p className="text-sm mt-1">
                Add a want to track what products this client is looking for
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Want Dialog */}
      <WantFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clientId={clientId}
        onSubmit={data => createMutation.mutate({ ...data, clientId })}
        isSubmitting={createMutation.isPending}
        title="Add Product Want"
      />

      {/* Edit Want Dialog */}
      {selectedWant && (
        <WantFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          clientId={clientId}
          initialData={selectedWant}
          onSubmit={data =>
            updateMutation.mutate({ id: selectedWant.id, ...data })
          }
          isSubmitting={updateMutation.isPending}
          title="Edit Product Want"
        />
      )}

      {/* Matches Dialog */}
      <Dialog open={matchesDialogOpen} onOpenChange={setMatchesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Matching Inventory</DialogTitle>
            <DialogDescription>
              {selectedWant?.product_name ||
                selectedWant?.strain_name ||
                "Products"}{" "}
              matching this want
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {matchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : matchesData?.matches && matchesData.matches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Match Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchesData.matches.map(match => (
                    <TableRow key={match.inventoryId}>
                      <TableCell className="font-medium">
                        {match.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(String(match.quantity || "0")).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            match.matchScore >= 80
                              ? "default"
                              : match.matchScore >= 50
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {match.matchScore}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No matching inventory found</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMatchesDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* BUG-007: Delete Confirmation Dialog (replaces window.confirm) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Want?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this want? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWantToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (wantToDelete !== null) {
                  deleteMutation.mutate({ id: wantToDelete });
                  setWantToDelete(null);
                }
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Want Form Dialog Component
interface WantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  initialData?: ClientWant;
  onSubmit: (data: {
    strainName?: string;
    productKeywords?: string;
    minQuantity?: number;
    maxQuantity?: number;
    maxPricePerUnit?: number;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    notes?: string;
    neededByDate?: string;
  }) => void;
  isSubmitting: boolean;
  title: string;
}

function WantFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
  title,
}: WantFormDialogProps) {
  const [strainName, setStrainName] = useState(initialData?.strain_name || "");
  const [productKeywords, setProductKeywords] = useState(
    initialData?.product_keywords || ""
  );
  const [minQuantity, setMinQuantity] = useState(
    initialData?.min_quantity || ""
  );
  const [maxQuantity, setMaxQuantity] = useState(
    initialData?.max_quantity || ""
  );
  const [maxPricePerUnit, setMaxPricePerUnit] = useState(
    initialData?.max_price_per_unit || ""
  );
  const [priority, setPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >(initialData?.priority || "MEDIUM");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [neededByDate, setNeededByDate] = useState(
    initialData?.needed_by_date
      ? new Date(initialData.needed_by_date).toISOString().split("T")[0]
      : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      strainName: strainName || undefined,
      productKeywords: productKeywords || undefined,
      minQuantity: minQuantity ? parseFloat(minQuantity) : undefined,
      maxQuantity: maxQuantity ? parseFloat(maxQuantity) : undefined,
      maxPricePerUnit: maxPricePerUnit
        ? parseFloat(maxPricePerUnit)
        : undefined,
      priority,
      notes: notes || undefined,
      neededByDate: neededByDate || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Specify what product this client is looking for
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strainName">Product/Strain Name</Label>
            <Input
              id="strainName"
              placeholder="e.g., OG Kush, Blue Dream"
              value={strainName}
              onChange={e => setStrainName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productKeywords">Keywords (comma-separated)</Label>
            <Input
              id="productKeywords"
              placeholder="e.g., indica, premium, outdoor"
              value={productKeywords}
              onChange={e => setProductKeywords(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minQuantity">Min Quantity</Label>
              <Input
                id="minQuantity"
                type="number"
                step="0.01"
                placeholder="0"
                value={minQuantity}
                onChange={e => setMinQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxQuantity">Max Quantity</Label>
              <Input
                id="maxQuantity"
                type="number"
                step="0.01"
                placeholder="No limit"
                value={maxQuantity}
                onChange={e => setMaxQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPricePerUnit">Max Price/Unit</Label>
              <Input
                id="maxPricePerUnit"
                type="number"
                step="0.01"
                placeholder="No limit"
                value={maxPricePerUnit}
                onChange={e => setMaxPricePerUnit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={v => setPriority(v as typeof priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="neededByDate">Needed By Date</Label>
            <Input
              id="neededByDate"
              type="date"
              value={neededByDate}
              onChange={e => setNeededByDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about what the client is looking for..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ClientWantsSection;
