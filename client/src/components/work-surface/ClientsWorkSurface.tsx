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
import { QuickCreateClient } from "@/components/clients/QuickCreateClient";
import { ProfileQuickPanel } from "@/components/clients/ProfileQuickPanel";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import { getRelationshipSummary } from "@/lib/relationshipSummary";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { OperationalEmptyState } from "@/components/ui/operational-states";
import { FreshnessBadge } from "@/components/ui/freshness-badge";
import {
  RELATIONSHIP_ROLE_TOKENS,
  RELATIONSHIP_STATUS_TOKENS,
} from "@/lib/statusTokens";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const clientSchema = z.object({
  name: z
    .string()
    .min(
      1,
      "Field: Name. Rule: value is required. Fix: enter the client name before saving."
    ),
  email: z
    .string()
    .email(
      "Field: Email handle. Rule: must be a valid email format. Fix: enter an address like name@company.com."
    )
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

/** Valid client type filter values accepted by the tRPC clients.list/count procedures. */
type ClientTypeFilter = "buyer" | "seller" | "brand" | "referee" | "contractor";

interface Client {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isBuyer?: boolean | null;
  isSeller?: boolean | null;
  isBrand?: boolean | null;
  isReferee?: boolean | null;
  isContractor?: boolean | null;
  creditLimit?: string | number | null;
  currentDebt?: string | number | null;
  lifetimeValue?: string | number | null;
  orderCount?: number;
  lastOrderDate?: string | null;
  teriCode?: string | null;
  version?: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLIENT_TYPE_FILTERS: {
  value: ClientTypeFilter | "all";
  label: string;
}[] = [
  { value: "all", label: "All Types" },
  { value: "buyer", label: "Clients" },
  { value: "seller", label: "Suppliers" },
  { value: "brand", label: "Brands" },
  { value: "referee", label: "Referees" },
  { value: "contractor", label: "Contractors" },
];

// TER-508: localStorage key for persisting view state across page reloads
const CLIENTS_VIEW_STATE_KEY = "terp-clients-view-v2";
const CLIENTS_SCROLL_STATE_KEY = `${CLIENTS_VIEW_STATE_KEY}:scroll-top`;

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

const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "-";
  }
};

const getRelationshipStatus = (
  client: Pick<Client, "currentDebt" | "lastOrderDate" | "updatedAt">
) => {
  const debt = parseFloat(String(client.currentDebt || 0));
  const lastTouch = client.lastOrderDate ?? client.updatedAt ?? null;
  const lastTouchDays = lastTouch
    ? Math.floor(
        (Date.now() - new Date(lastTouch).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  if (debt > 0) {
    return { label: "Needs Attention", toneKey: "NEEDS-ATTENTION" as const };
  }
  if (lastTouchDays !== null && lastTouchDays <= 30) {
    return { label: "Active", toneKey: "ACTIVE" as const };
  }
  if (lastTouchDays !== null && lastTouchDays <= 90) {
    return { label: "Watch", toneKey: "WATCH" as const };
  }

  return { label: "Dormant", toneKey: "DORMANT" as const };
};

const getLastActivityDate = (
  client: Pick<Client, "lastOrderDate" | "updatedAt">
) => client.lastOrderDate ?? client.updatedAt ?? null;

// ============================================================================
// CLIENT TYPE BADGES
// ============================================================================

function ClientTypeBadges({ client }: { client: Client }) {
  const badges: { label: string; className: string }[] = [];
  if (client.isBuyer)
    badges.push({
      label: "Client",
      className: RELATIONSHIP_ROLE_TOKENS.Customer,
    });
  if (client.isSeller)
    badges.push({
      label: "Supplier",
      className: RELATIONSHIP_ROLE_TOKENS.Supplier,
    });
  if (client.isBrand)
    badges.push({
      label: "Brand",
      className: RELATIONSHIP_ROLE_TOKENS.Brand,
    });
  if (client.isReferee)
    badges.push({
      label: "Referee",
      className: RELATIONSHIP_ROLE_TOKENS.Referee,
    });
  if (client.isContractor)
    badges.push({
      label: "Contractor",
      className: RELATIONSHIP_ROLE_TOKENS.Contractor,
    });

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {getRelationshipSummary(client)}
      </p>
      <div className="flex gap-1 flex-wrap">
        {badges.map(badge => (
          <Badge
            key={badge.label}
            variant="outline"
            className={cn("text-xs", badge.className)}
          >
            {badge.label}
          </Badge>
        ))}
      </div>
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

function ClientInspectorContent({
  client,
  onUpdate,
  onNavigate,
  onArchive,
}: ClientInspectorProps) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Validation
  const validation = useValidationTiming({
    schema: clientSchema,
    initialValues: client
      ? {
          name: client.name,
          email: client.email ?? undefined,
          phone: client.phone ?? undefined,
          notes: client.notes ?? undefined,
        }
      : undefined,
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
    } else {
      // Surface validation feedback to the user
      const firstValidationMessage = Object.values(result.errors)[0];
      toast.error(
        firstValidationMessage ||
          "Field: Form. Rule: contains validation errors. Fix: correct highlighted fields and retry."
      );
    }
  };

  return (
    <div className="space-y-6">
      <InspectorSection title="Relationship Signals" defaultOpen>
        {editMode ? (
          <>
            <InspectorField label="Code Name" required>
              <Input
                value={editForm.name}
                onChange={e => {
                  setEditForm({ ...editForm, name: e.target.value });
                  validation.handleChange("name", e.target.value);
                }}
                onBlur={() => validation.handleBlur("name")}
                className={cn(
                  validation.getFieldState("name").showError && "border-red-500"
                )}
              />
              {validation.getFieldState("name").showError && (
                <p className="text-xs text-destructive mt-1">
                  {validation.getFieldState("name").error}
                </p>
              )}
            </InspectorField>

            <InspectorField label="Email Handle">
              <Input
                type="email"
                value={editForm.email}
                onChange={e => {
                  setEditForm({ ...editForm, email: e.target.value });
                  validation.handleChange("email", e.target.value);
                }}
                onBlur={() => validation.handleBlur("email")}
                className={cn(
                  validation.getFieldState("email").showError &&
                    "border-red-500"
                )}
              />
              {validation.getFieldState("email").showError && (
                <p className="text-xs text-destructive mt-1">
                  {validation.getFieldState("email").error}
                </p>
              )}
            </InspectorField>

            <InspectorField label="Phone or Messaging Handle">
              <Input
                value={editForm.phone}
                onChange={e =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </InspectorField>

            <InspectorField label="Notes">
              <Textarea
                value={editForm.notes}
                onChange={e =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={3}
              />
            </InspectorField>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <InspectorField label="Code Name">
              <p className="font-semibold text-lg">{client.name}</p>
            </InspectorField>

            {client.email && (
              <InspectorField label="Email Handle">
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 text-[var(--info)] hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {client.email}
                </a>
              </InspectorField>
            )}

            {client.phone && (
              <InspectorField label="Phone or Messaging Handle">
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-2 text-[var(--info)] hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </a>
              </InspectorField>
            )}

            {client.notes && (
              <InspectorField label="Notes">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </InspectorField>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditMode(true)}
            >
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
            <p className="font-semibold">
              {formatCurrency(client.creditLimit)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Current Debt</p>
            <p
              className={cn(
                "font-semibold",
                parseFloat(String(client.currentDebt || 0)) > 0 &&
                  "text-destructive"
              )}
            >
              {formatCurrency(client.currentDebt)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">All Time Value</p>
            <p className="font-semibold text-[var(--success)]">
              {formatCurrency(client.lifetimeValue)}
            </p>
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
          <InspectorField label="Signal Code">
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
            data-testid="view-full-profile-btn"
            onClick={e => {
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
          {/* Single button serves both archive and delete oracle selectors (soft-delete) */}
          <span data-testid="delete-client-btn">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              data-testid="archive-client-btn"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                if (client?.id !== null && client?.id !== undefined) {
                  onArchive(client.id);
                }
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Client
            </Button>
          </span>
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
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScrollRef = useRef(false);
  const getScrollContainer = () => {
    if (typeof window === "undefined") {
      return tableScrollRef.current;
    }

    let current: HTMLElement | null = tableScrollRef.current;
    while (current) {
      const style = window.getComputedStyle(current);
      const scrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight;

      if (scrollable) {
        return current;
      }

      current = current.parentElement;
    }

    return tableScrollRef.current;
  };

  // State — TER-508: Initialize from localStorage for filter persistence
  // Parse localStorage once and distribute to avoid redundant JSON.parse calls
  const savedViewState = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(CLIENTS_VIEW_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        search?: string;
        typeFilter?: string;
        sortColumn?: string | null;
        sortDirection?: string;
      };
    } catch {
      return null;
    }
  }, []);
  const [search, setSearch] = useState(() => savedViewState?.search ?? "");
  const [typeFilter, setTypeFilter] = useState<ClientTypeFilter | "all">(() => {
    const saved = savedViewState?.typeFilter;
    const validFilters: Array<ClientTypeFilter | "all"> = [
      "all",
      "buyer",
      "seller",
      "brand",
      "referee",
      "contractor",
    ];
    if (saved && validFilters.includes(saved as ClientTypeFilter | "all")) {
      return saved as ClientTypeFilter | "all";
    }
    return "all";
  });
  const [page, setPage] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(
    () => savedViewState?.sortColumn ?? null
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    const saved = savedViewState?.sortDirection;
    if (saved === "asc" || saved === "desc") return saved;
    return "desc";
  });
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const limit = 50;

  // TER-508: Persist filter state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENTS_VIEW_STATE_KEY,
        JSON.stringify({
          search,
          typeFilter,
          sortColumn,
          sortDirection,
        })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [search, typeFilter, sortColumn, sortDirection]);

  // Work Surface hooks
  // QA-005 FIX: Removed unused saveState variable
  const { setSaving, setSaved, setError } = useSaveState();
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
  const clientsQuery = trpc.clients.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    clientTypes: typeFilter !== "all" ? [typeFilter] : undefined,
  });
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = clientsQuery;

  const clients = useMemo(
    () =>
      Array.isArray(clientsData)
        ? clientsData
        : ((clientsData as { items?: unknown[] })?.items ?? []),
    [clientsData]
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      hasRestoredScrollRef.current ||
      isLoading ||
      clients.length === 0
    ) {
      return;
    }

    const rawScrollTop = window.sessionStorage.getItem(CLIENTS_SCROLL_STATE_KEY);
    const scrollTop = Number(rawScrollTop);
    if (!rawScrollTop || !Number.isFinite(scrollTop)) {
      return;
    }

    let animationFrameId = 0;
    let intervalId = 0;
    let attempts = 0;
    const maxAttempts = 8;
    const startRestoreLoop = () => {
      attempts = 0;
      window.clearInterval(intervalId);
      restoreScroll();
      intervalId = window.setInterval(restoreScroll, 150);
    };

    const restoreScroll = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        const container = getScrollContainer();
        if (!container) {
          return;
        }

        container.scrollTop = scrollTop;
        attempts += 1;

        if (Math.abs(container.scrollTop - scrollTop) <= 1) {
          hasRestoredScrollRef.current = true;
          window.clearInterval(intervalId);
          return;
        }

        if (attempts >= maxAttempts) {
          hasRestoredScrollRef.current = true;
          window.clearInterval(intervalId);
        }
      });
    };

    const handleHistoryRestore = () => {
      hasRestoredScrollRef.current = false;
      startRestoreLoop();
    };

    startRestoreLoop();
    window.addEventListener("pageshow", handleHistoryRestore);
    window.addEventListener("popstate", handleHistoryRestore);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearInterval(intervalId);
      window.removeEventListener("pageshow", handleHistoryRestore);
      window.removeEventListener("popstate", handleHistoryRestore);
    };
  }, [clients.length, isLoading]);

  const { data: totalCount } = trpc.clients.count.useQuery({
    search: search || undefined,
    clientTypes: typeFilter !== "all" ? [typeFilter] : undefined,
  });

  const totalPages = Math.ceil((totalCount || 0) / limit);

  // Selected client
  const selectedClient = useMemo(
    () => (clients as Client[]).find(c => c.id === selectedClientId) || null,
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
    onError: err => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to update client");
        setError(err.message);
      }
    },
  });

  const archiveClient = trpc.clients.archive.useMutation({
    // Optimistic removal of the client from the list
    onMutate: async ({ clientId }) => {
      setSaving("Archiving client...");
      inspector.close();
      setIsArchiveDialogOpen(false);
      setSelectedClientId(null);

      const queryInput = {
        limit,
        offset: page * limit,
        search: search || undefined,
        clientTypes: typeFilter !== "all" ? [typeFilter] : undefined,
      };
      await utils.clients.list.cancel();
      const previousData = utils.clients.list.getData(queryInput);

      // tRPC types `old` as UnifiedPaginatedResponse<T> | undefined,
      // so it always has `.items` — no raw-array branch needed.
      utils.clients.list.setData(queryInput, old => {
        if (!old) return old;

        if ("items" in old && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.filter(c => c.id !== clientId),
          };
        }
        return old;
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success("Client archived successfully");
      setSaved();
    },
    onError: (err, _input, context) => {
      toast.error(err.message || "Failed to archive client");
      setError(err.message);

      // Rollback optimistic update
      if (context?.previousData) {
        const rollbackInput = {
          limit,
          offset: page * limit,
          search: search || undefined,
          clientTypes: typeFilter !== "all" ? [typeFilter] : undefined,
        };
        utils.clients.list.setData(rollbackInput, context.previousData);
      }
    },
    onSettled: () => {
      utils.clients.list.invalidate();
      utils.clients.count.invalidate();
    },
  });

  // Sort clients
  const displayClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    if (!sortColumn) return clients;

    return [...clients].sort((a: Client, b: Client) => {
      const col = sortColumn as keyof Client;
      const rawA = a[col];
      const rawB = b[col];
      let aVal: string | number | boolean | null | undefined =
        rawA instanceof Date ? rawA.toISOString() : rawA;
      let bVal: string | number | boolean | null | undefined =
        rawB instanceof Date ? rawB.toISOString() : rawB;

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && !isNaN(parseFloat(aVal)))
        aVal = parseFloat(aVal);
      if (typeof bVal === "string" && !isNaN(parseFloat(bVal)))
        bVal = parseFloat(bVal);

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
      "cmd+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "cmd+n": e => {
        e.preventDefault();
        setIsAddClientOpen(true);
      },
      "ctrl+n": e => {
        e.preventDefault();
        setIsAddClientOpen(true);
      },
      arrowdown: e => {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(displayClients.length - 1, prev + 1));
        const client =
          displayClients[
            Math.min(displayClients.length - 1, selectedIndex + 1)
          ];
        if (client) setSelectedClientId(client.id);
      },
      arrowup: e => {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        const client = displayClients[Math.max(0, selectedIndex - 1)];
        if (client) setSelectedClientId(client.id);
      },
      enter: e => {
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
      withDebt: all.filter(c => parseFloat(String(c.currentDebt || 0)) > 0)
        .length,
      totalDebt: all.reduce(
        (sum, c) => sum + parseFloat(String(c.currentDebt || 0)),
        0
      ),
      totalValue: all.reduce(
        (sum, c) => sum + parseFloat(String(c.lifetimeValue || 0)),
        0
      ),
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
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
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
    if (sortColumn !== column)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const navigateToProfile = (clientId: number) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        CLIENTS_SCROLL_STATE_KEY,
        String(getScrollContainer()?.scrollTop ?? 0)
      );
    }
    setLocation(buildRelationshipProfilePath(clientId));
  };

  const navigateToClientOrders = (clientId: number) => {
    setLocation(buildSalesWorkspacePath("orders", { clientId }));
  };

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Clients"
        description="Manage clients, track transactions, and monitor debt"
        divider
        className="px-6 py-4"
        actions={
          <>
            <FreshnessBadge queryResult={clientsQuery} cadence="live" />
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {stats.total}
                </span>
              </span>
              <span>
                With Debt:{" "}
                <span className="font-semibold text-foreground">
                  {stats.withDebt}
                </span>
              </span>
              <span>
                LTV:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(stats.totalValue)}
                </span>
              </span>
            </div>
          </>
        }
      />

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              data-testid="clients-search-input"
              placeholder="Search clients... (Cmd+K)"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={v => {
              setTypeFilter(v as ClientTypeFilter | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPE_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div
          ref={tableScrollRef}
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium">Failed to load clients</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : displayClients.length === 0 ? (
            <OperationalEmptyState
              variant="clients"
              title="No clients found"
              description={
                search || typeFilter !== "all"
                  ? "Clear the filters or broaden the search to bring more relationship records into view."
                  : "Add your first client so conversations, orders, and collections all start from one shared record."
              }
              searchActive={Boolean(search)}
              filterActive={typeFilter !== "all"}
              action={
                search || typeFilter !== "all"
                  ? {
                      label: "Clear Filters",
                      onClick: () => {
                        setSearch("");
                        setTypeFilter("all");
                      },
                    }
                  : {
                      label: "Quick Add Client",
                      onClick: () => setIsAddClientOpen(true),
                    }
              }
            />
          ) : (
            <>
              <Table data-testid="clients-table">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <span className="flex items-center">
                        Code Name <SortIcon column="name" />
                      </span>
                    </TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Reachable Handles</TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("lifetimeValue")}
                    >
                      <span className="flex items-center justify-end">
                        LTV <SortIcon column="lifetimeValue" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("currentDebt")}
                    >
                      <span className="flex items-center justify-end">
                        Debt <SortIcon column="currentDebt" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("orderCount")}
                    >
                      <span className="flex items-center justify-end">
                        Orders <SortIcon column="orderCount" />
                      </span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client: Client, index: number) => (
                    <TableRow
                      key={client.id}
                      data-testid={`client-row-${client.id}`}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedClientId === client.id && "bg-muted",
                        selectedIndex === index &&
                          "ring-1 ring-inset ring-primary"
                      )}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setSelectedIndex(index);
                        inspector.open();
                      }}
                      onDoubleClick={() => navigateToProfile(client.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <p>{client.name}</p>
                          {client.teriCode ? (
                            <p className="text-xs text-muted-foreground">
                              {client.teriCode}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ClientTypeBadges client={client} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            RELATIONSHIP_STATUS_TOKENS[
                              getRelationshipStatus(client).toneKey
                            ]
                          }
                        >
                          {getRelationshipStatus(client).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(getLastActivityDate(client))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[client.email, client.phone]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[var(--success)]">
                        {formatCurrency(client.lifetimeValue)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          parseFloat(String(client.currentDebt || 0)) > 0 &&
                            "text-destructive"
                        )}
                      >
                        {formatCurrency(client.currentDebt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          onClick={event => {
                            event.stopPropagation();
                            navigateToClientOrders(client.id);
                          }}
                        >
                          {client.orderCount || 0}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToProfile(client.id);
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
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(p => Math.min(totalPages - 1, p + 1))
                      }
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
          title={selectedClient?.name || "Relationship Profile"}
          subtitle={
            selectedClient
              ? [
                  selectedClient.teriCode,
                  selectedClient.email,
                  selectedClient.phone,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              : undefined
          }
        >
          {selectedClient ? (
            <ProfileQuickPanel clientId={selectedClient.id} />
          ) : (
            <ClientInspectorContent
              client={selectedClient}
              onUpdate={handleUpdateClient}
              onNavigate={navigateToProfile}
              onArchive={handleArchive}
            />
          )}
        </InspectorPanel>
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent data-testid="confirm-delete-modal">
          <DialogHeader>
            <DialogTitle>Archive Client</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to archive {selectedClient?.name}? This will
            hide the client from active lists but preserve all historical data.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-testid="confirm-delete-btn"
              variant="destructive"
              onClick={confirmArchive}
              disabled={archiveClient.isPending}
            >
              {archiveClient.isPending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickCreateClient
        hideTrigger
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        title="Quick Add Relationship"
        description="Capture the code name and a reachable handle now. Use the full profile when you need address, pricing, or finance details."
        submitLabel="Create Relationship"
        onSuccess={client => {
          refetch();
          toast.success(`Relationship created: ${client.teriCode}`);
          navigateToProfile(client.id);
        }}
      />

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default ClientsWorkSurface;
