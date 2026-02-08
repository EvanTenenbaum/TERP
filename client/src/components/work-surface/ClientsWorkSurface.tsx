/**
 * ClientsWorkSurface - Work Surface implementation for Clients
 * UXS-203: Aligns Clients page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract (Cmd+K search, arrow navigation, Enter to open)
 * - Save state indicator (Saved/Saving/Error)
 * - Inspector panel for client detail editing
 * - "Reward Early, Punish Late" validation
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Label used in form fields - import available if needed
import { Badge } from "@/components/ui/badge";
import { AddClientWizard } from "@/components/clients/AddClientWizard"; // TERP-0003
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Checkbox available for bulk selection features
import { Textarea } from "@/components/ui/textarea";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useValidationTiming } from "@/hooks/work-surface/useValidationTiming";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Edit,
  Archive,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

interface Client {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isBuyer?: boolean;
  isSeller?: boolean;
  isBrand?: boolean;
  isReferee?: boolean;
  isContractor?: boolean;
  creditLimit?: string | number | null;
  currentDebt?: string | number | null;
  lifetimeValue?: string | number | null;
  orderCount?: number;
  lastOrderDate?: string | null;
  teriCode?: string | null;
  version?: number;
  createdAt?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLIENT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "buyer", label: "Buyers" },
  { value: "seller", label: "Suppliers" },
  { value: "brand", label: "Brands" },
  { value: "referee", label: "Referees" },
  { value: "contractor", label: "Contractors" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num || 0);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "-";
  }
};

// ============================================================================
// CLIENT TYPE BADGES
// ============================================================================

function ClientTypeBadges({ client }: { client: Client }) {
  const badges: { label: string; className: string }[] = [];
  if (client.isBuyer) badges.push({ label: "Buyer", className: "bg-blue-100 text-blue-800" });
  if (client.isSeller) badges.push({ label: "Supplier", className: "bg-green-100 text-green-800" });
  if (client.isBrand) badges.push({ label: "Brand", className: "bg-purple-100 text-purple-800" });
  if (client.isReferee) badges.push({ label: "Referee", className: "bg-yellow-100 text-yellow-800" });
  if (client.isContractor) badges.push({ label: "Contractor", className: "bg-gray-100 text-gray-800" });

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map((badge) => (
        <Badge key={badge.label} variant="outline" className={cn("text-xs", badge.className)}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

// ============================================================================
// CLIENT INSPECTOR CONTENT
// ============================================================================

interface ClientInspectorProps {
  client: Client | null;
  onUpdate: (updates: Partial<Client>) => void;
  onNavigate: (clientId: number) => void;
  onArchive: (clientId: number) => void;
}

function ClientInspectorContent({ client, onUpdate, onNavigate, onArchive }: ClientInspectorProps) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", notes: "" });

  // Validation
  const validation = useValidationTiming({
    schema: clientSchema,
    initialValues: client ? { name: client.name, email: client.email ?? undefined, phone: client.phone ?? undefined, notes: client.notes ?? undefined } : undefined,
  });

  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        notes: client.notes || "",
      });
    }
  }, [client]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a client to view details</p>
      </div>
    );
  }

  const handleSave = () => {
    const result = validation.validateAll();
    if (result.isValid) {
      onUpdate({ ...editForm, id: client.id, version: client.version });
      setEditMode(false);
    }
  };

  return (
    <div className="space-y-6">
      <InspectorSection title="Contact Information" defaultOpen>
        {editMode ? (
          <>
            <InspectorField label="Name" required>
              <Input
                value={editForm.name}
                onChange={(e) => {
                  setEditForm({ ...editForm, name: e.target.value });
                  validation.handleChange("name", e.target.value);
                }}
                onBlur={() => validation.handleBlur("name")}
                className={cn(validation.getFieldState("name").showError && "border-red-500")}
              />
              {validation.getFieldState("name").showError && (
                <p className="text-xs text-red-500 mt-1">{validation.getFieldState("name").error}</p>
              )}
            </InspectorField>

            <InspectorField label="Email">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => {
                  setEditForm({ ...editForm, email: e.target.value });
                  validation.handleChange("email", e.target.value);
                }}
                onBlur={() => validation.handleBlur("email")}
                className={cn(validation.getFieldState("email").showError && "border-red-500")}
              />
              {validation.getFieldState("email").showError && (
                <p className="text-xs text-red-500 mt-1">{validation.getFieldState("email").error}</p>
              )}
            </InspectorField>

            <InspectorField label="Phone">
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </InspectorField>

            <InspectorField label="Notes">
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </InspectorField>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <InspectorField label="Name">
              <p className="font-semibold text-lg">{client.name}</p>
            </InspectorField>

            {client.email && (
              <InspectorField label="Email">
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </a>
              </InspectorField>
            )}

            {client.phone && (
              <InspectorField label="Phone">
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </a>
              </InspectorField>
            )}

            {client.notes && (
              <InspectorField label="Notes">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </InspectorField>
            )}

            <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </>
        )}
      </InspectorSection>

      <InspectorSection title="Client Types">
        <ClientTypeBadges client={client} />
      </InspectorSection>

      <InspectorSection title="Financial Summary" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Credit Limit</p>
            <p className="font-semibold">{formatCurrency(client.creditLimit)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Current Debt</p>
            <p className={cn("font-semibold", parseFloat(String(client.currentDebt || 0)) > 0 && "text-red-600")}>
              {formatCurrency(client.currentDebt)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Lifetime Value</p>
            <p className="font-semibold text-green-600">{formatCurrency(client.lifetimeValue)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="font-semibold">{client.orderCount || 0}</p>
          </div>
        </div>

        {client.lastOrderDate && (
          <InspectorField label="Last Order">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(client.lastOrderDate)}
            </div>
          </InspectorField>
        )}

        {client.teriCode && (
          <InspectorField label="TERI Code">
            <Badge variant="outline">{client.teriCode}</Badge>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title="Quick Actions">
        <div className="space-y-2">
          {/* E2E-FIX C-01: Added type="button" and stopPropagation to prevent event handling issues */}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // QA-002 FIX: Added null check for client.id
              if (client?.id !== null && client?.id !== undefined) {
                onNavigate(client.id);
              }
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // QA-002 FIX: Added null check for client.id
              if (client?.id !== null && client?.id !== undefined) {
                onArchive(client.id);
              }
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Client
          </Button>
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN WORK SURFACE COMPONENT
// ============================================================================

export function ClientsWorkSurface() {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const limit = 50;

  // Work Surface hooks
  // QA-005 FIX: Removed unused saveState variable
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<Client>({
    entityType: "Client",
    onRefresh: async () => {
      await refetch();
    },
  });

  // Data queries
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = trpc.clients.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    clientTypes: typeFilter !== "all" ? [typeFilter as any] : undefined,
  });

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.items ?? [];

  const { data: totalCount } = trpc.clients.count.useQuery({
    search: search || undefined,
    clientTypes: typeFilter !== "all" ? [typeFilter as any] : undefined,
  });

  const totalPages = Math.ceil((totalCount || 0) / limit);

  // Selected client
  const selectedClient = useMemo(
    () => (clients as Client[]).find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  // Mutations
  const utils = trpc.useContext();

  const updateClient = trpc.clients.update.useMutation({
    onMutate: () => setSaving("Saving changes..."),
    onSuccess: () => {
      toast.success("Client updated successfully");
      setSaved();
      utils.clients.list.invalidate();
    },
    onError: (err) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to update client");
        setError(err.message);
      }
    },
  });

  const archiveClient = trpc.clients.archive.useMutation({
    onMutate: () => setSaving("Archiving client..."),
    onSuccess: () => {
      toast.success("Client archived successfully");
      setSaved();
      setIsArchiveDialogOpen(false);
      setSelectedClientId(null);
      inspector.close();
      utils.clients.list.invalidate();
      utils.clients.count.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to archive client");
      setError(err.message);
    },
  });

  // Sort clients
  const displayClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    if (!sortColumn) return clients;

    return [...clients].sort((a: any, b: any) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && !isNaN(parseFloat(aVal))) aVal = parseFloat(aVal);
      if (typeof bVal === "string" && !isNaN(parseFloat(bVal))) bVal = parseFloat(bVal);

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortColumn, sortDirection]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "cmd+n": (e) => {
        e.preventDefault();
        setIsAddClientOpen(true);
      },
      "ctrl+n": (e) => {
        e.preventDefault();
        setIsAddClientOpen(true);
      },
      arrowdown: (e) => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(displayClients.length - 1, prev + 1));
        const client = displayClients[Math.min(displayClients.length - 1, selectedIndex + 1)];
        if (client) setSelectedClientId(client.id);
      },
      arrowup: (e) => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        const client = displayClients[Math.max(0, selectedIndex - 1)];
        if (client) setSelectedClientId(client.id);
      },
      enter: (e) => {
        if (selectedClient) {
          e.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (isAddClientOpen) {
        setIsAddClientOpen(false);
      } else if (isArchiveDialogOpen) {
        setIsArchiveDialogOpen(false);
      } else if (inspector.isOpen) {
        inspector.close();
      }
    },
  });

  // Statistics
  const stats = useMemo(() => {
    const all = clients as Client[];
    return {
      total: totalCount || 0,
      withDebt: all.filter((c) => parseFloat(String(c.currentDebt || 0)) > 0).length,
      totalDebt: all.reduce((sum, c) => sum + parseFloat(String(c.currentDebt || 0)), 0),
      totalValue: all.reduce((sum, c) => sum + parseFloat(String(c.lifetimeValue || 0)), 0),
    };
  }, [clients, totalCount]);

  // Track version for optimistic locking when client is selected (UXS-705)
  useEffect(() => {
    if (selectedClient && selectedClient.version !== undefined) {
      trackVersion(selectedClient);
    }
  }, [selectedClient, trackVersion]);

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleUpdateClient = (updates: Partial<Client>) => {
    if (!updates.id) return;
    updateClient.mutate({
      clientId: updates.id,
      version: updates.version,
      name: updates.name,
      email: updates.email || undefined,
      phone: updates.phone || undefined,
    });
  };

  const handleArchive = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsArchiveDialogOpen(true);
  };

  const confirmArchive = () => {
    if (selectedClientId) {
      archiveClient.mutate({ clientId: selectedClientId });
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-6 w-6" />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clients, track transactions, and monitor debt
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Total: <span className="font-semibold text-foreground">{stats.total}</span>
            </span>
            <span>
              With Debt: <span className="font-semibold text-foreground">{stats.withDebt}</span>
            </span>
            <span>
              LTV: <span className="font-semibold text-foreground">{formatCurrency(stats.totalValue)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search clients... (Cmd+K)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPE_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div className={cn("flex-1 overflow-auto transition-all duration-200", inspector.isOpen && "mr-96")}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium">Failed to load clients</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : displayClients.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No clients found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || typeFilter !== "all" ? "Try adjusting your filters" : "Add your first client"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                      <span className="flex items-center">Name <SortIcon column="name" /></span>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("lifetimeValue")}>
                      <span className="flex items-center justify-end">LTV <SortIcon column="lifetimeValue" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("currentDebt")}>
                      <span className="flex items-center justify-end">Debt <SortIcon column="currentDebt" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("orderCount")}>
                      <span className="flex items-center justify-end">Orders <SortIcon column="orderCount" /></span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client: Client, index: number) => (
                    <TableRow
                      key={client.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedClientId === client.id && "bg-muted",
                        selectedIndex === index && "ring-1 ring-inset ring-primary"
                      )}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setSelectedIndex(index);
                        inspector.open();
                      }}
                      onDoubleClick={() => setLocation(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell><ClientTypeBadges client={client} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.email || client.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(client.lifetimeValue)}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", parseFloat(String(client.currentDebt || 0)) > 0 && "text-red-600")}>
                        {formatCurrency(client.currentDebt)}
                      </TableCell>
                      <TableCell className="text-right">{client.orderCount || 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLocation(`/clients/${client.id}`);
                          }}
                          aria-label={`Open ${client.name}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedClient?.name || "Client Details"}
          subtitle={selectedClient?.email ?? undefined}
        >
          <ClientInspectorContent
            client={selectedClient}
            onUpdate={handleUpdateClient}
            onNavigate={(id) => setLocation(`/clients/${id}`)}
            onArchive={handleArchive}
          />
        </InspectorPanel>
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Client</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to archive {selectedClient?.name}? This will hide the client from
            active lists but preserve all historical data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmArchive} disabled={archiveClient.isPending}>
              {archiveClient.isPending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TERP-0003: Add Client Wizard */}
      <AddClientWizard
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        onSuccess={(clientId) => {
          refetch();
          toast.success("Client created successfully");
          setLocation(`/clients/${clientId}`);
        }}
      />

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default ClientsWorkSurface;
