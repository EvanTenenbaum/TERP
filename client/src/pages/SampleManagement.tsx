import { useCallback, useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Beaker, Filter } from "lucide-react";
import {
  SampleForm,
  type SampleFormOption,
  type SampleFormValues,
} from "@/components/samples/SampleForm";
import {
  SampleList,
  type SampleListItem,
  type SampleStatus,
  type SampleLocation,
} from "@/components/samples/SampleList";
import {
  SampleReturnDialog,
  type SampleReturnFormValues,
} from "@/components/samples/SampleReturnDialog";
import {
  VendorShipDialog,
  type VendorShipFormValues,
} from "@/components/samples/VendorShipDialog";
import {
  LocationUpdateDialog,
  type LocationUpdateFormValues,
} from "@/components/samples/LocationUpdateDialog";
import { ExpiringSamplesWidget } from "@/components/samples/ExpiringSamplesWidget";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Alert components available if needed for error states
import {
  EmptyState,
  DatabaseErrorState,
  ErrorState,
  isDatabaseError,
  emptyStateConfigs,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import type { SampleRequest } from "../../../drizzle/schema";
import { toast } from "sonner";

type TabFilter = "ALL" | SampleStatus;

interface ClientOption {
  id: number;
  name: string | null;
}

function normalizeProducts(
  products: SampleRequest["products"] | null | undefined
): Array<{ productId: number; quantity: string }> {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  return [];
}

function normalizeStatus(
  status: string | SampleStatus | null | undefined
): SampleStatus {
  const validStatuses: SampleStatus[] = [
    "PENDING",
    "FULFILLED",
    "CANCELLED",
    "RETURNED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "VENDOR_RETURN_REQUESTED",
    "SHIPPED_TO_VENDOR",
    "VENDOR_CONFIRMED",
  ];
  if (status && validStatuses.includes(status as SampleStatus)) {
    return status as SampleStatus;
  }
  return "PENDING";
}

function normalizeLocation(
  location: string | SampleLocation | null | undefined
): SampleLocation | null {
  const validLocations: SampleLocation[] = [
    "WAREHOUSE",
    "WITH_CLIENT",
    "WITH_SALES_REP",
    "RETURNED",
    "LOST",
  ];
  if (location && validLocations.includes(location as SampleLocation)) {
    return location as SampleLocation;
  }
  return null;
}

function extractDueDate(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/due date:\s*(\d{4}-\d{2}-\d{2})/i);
  return match ? match[1] : null;
}

export default function SampleManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Return workflow dialog states
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnDialogType, setReturnDialogType] = useState<"sample" | "vendor">(
    "sample"
  );
  const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);
  const [vendorShipDialogOpen, setVendorShipDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedSampleLocation, setSelectedSampleLocation] =
    useState<SampleLocation | null>(null);

  const debouncedProductSearch = useDebounce(productSearch, 300);

  const utils = trpc.useUtils();
  const { user } = useAuth();

  // Fetch all samples instead of just pending with debug logging
  // BUG-071 FIX: Enhanced query options to prevent indefinite hanging under memory pressure
  const {
    data: samplesData,
    isLoading: samplesLoading,
    error: samplesError,
    refetch: refetchSamples,
    isError: isSamplesError,
  } = trpc.samples.getAll.useQuery(
    { limit: 200 },
    {
      // BUG-071 FIX: Retry logic for stability with exponential backoff
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
      // BUG-071 FIX: Keep data fresh but cache for 30 seconds to prevent repeated requests
      staleTime: 30 * 1000,
      // BUG-071 FIX: Garbage collect after 5 minutes
      gcTime: 5 * 60 * 1000,
      // BUG-071 FIX: Refetch on mount but not on window focus to reduce load
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Debug logging for data display issues (QA-050)
  useEffect(() => {
    const items =
      (samplesData && "items" in samplesData && samplesData.items) ||
      (Array.isArray(samplesData) ? samplesData : []) ||
      [];
    const itemCount = items.length;

    // Debug logging for data display issues (QA-050) - only in development
    if (import.meta.env.DEV) {
      console.info("[SampleManagement] Query state:", {
        isLoading: samplesLoading,
        isError: isSamplesError,
        error: samplesError?.message,
        itemCount,
        hasItems: items.length > 0,
        rawDataType: samplesData ? typeof samplesData : "undefined",
        hasItemsProperty: samplesData && "items" in samplesData,
        isArray: Array.isArray(samplesData),
      });

      // Warn if we have a response but no items
      if (
        !samplesLoading &&
        !isSamplesError &&
        samplesData &&
        itemCount === 0
      ) {
        console.warn(
          "[SampleManagement] Zero samples returned - possible data display issue",
          {
            response: samplesData,
          }
        );
      }
    }
  }, [samplesData, samplesLoading, isSamplesError, samplesError]);

  const { data: clientsData } = trpc.clients.list.useQuery(
    { limit: 200 },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: productSearchData, isLoading: productSearchLoading } =
    trpc.samples.productOptions.useQuery(
      { search: debouncedProductSearch, limit: 20 },
      { staleTime: 5 * 60 * 1000 }
    );

  const clientOptions = useMemo<SampleFormOption[]>(() => {
    const list: ClientOption[] = Array.isArray(clientsData)
      ? clientsData
      : (clientsData?.items ?? []);

    return list.map(client => ({
      id: client.id,
      label: client.name ?? `Client #${client.id}`,
    }));
  }, [clientsData]);

  const clientNameMap = useMemo(() => {
    const entries: Array<[number, string]> = clientOptions.map(option => [
      option.id,
      option.label,
    ]);
    return new Map<number, string>(entries);
  }, [clientOptions]);

  const productOptions = useMemo<SampleFormOption[]>(() => {
    const products = productSearchData?.items ?? [];
    if (!products.length) return [];

    return products.map(product => ({
      id: product.id,
      label: product.nameCanonical || `Product #${product.id}`,
    }));
  }, [productSearchData?.items]);

  const fallbackProductOptions = useMemo<SampleFormOption[]>(() => {
    const items =
      samplesData && "items" in samplesData
        ? samplesData.items
        : Array.isArray(samplesData)
          ? samplesData
          : [];
    const seen = new Set<number>();
    const options: SampleFormOption[] = [];

    items.forEach(sample => {
      normalizeProducts(sample.products).forEach(product => {
        if (!seen.has(product.productId)) {
          seen.add(product.productId);
          options.push({
            id: product.productId,
            label: `Product #${product.productId}`,
          });
        }
      });
    });

    return options;
  }, [samplesData]);

  const samples = useMemo<SampleListItem[]>(() => {
    const items =
      (samplesData && "items" in samplesData && samplesData.items) ||
      (Array.isArray(samplesData) ? samplesData : []) ||
      [];

    return items.map(sample => {
      const products = normalizeProducts(sample.products);
      const productSummary = products
        .map(
          product =>
            `Product #${product.productId} (${product.quantity || "1"})`
        )
        .join(", ");

      return {
        id: sample.id,
        productSummary: productSummary || "No products listed",
        clientName:
          clientNameMap.get(sample.clientId) ?? `Client #${sample.clientId}`,
        status: normalizeStatus(sample.sampleRequestStatus),
        requestedDate:
          typeof sample.requestDate === "string"
            ? sample.requestDate
            : format(sample.requestDate, "yyyy-MM-dd"),
        dueDate: extractDueDate(sample.notes),
        notes: sample.notes ?? null,
        location: normalizeLocation(sample.location),
        expirationDate: sample.expirationDate
          ? typeof sample.expirationDate === "string"
            ? sample.expirationDate
            : format(sample.expirationDate, "yyyy-MM-dd")
          : null,
        vendorReturnTrackingNumber: sample.vendorReturnTrackingNumber ?? null,
      };
    });
  }, [clientNameMap, samplesData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: samples.length,
      PENDING: 0,
      FULFILLED: 0,
      CANCELLED: 0,
      RETURNED: 0,
      RETURN_REQUESTED: 0,
      RETURN_APPROVED: 0,
      VENDOR_RETURN_REQUESTED: 0,
      SHIPPED_TO_VENDOR: 0,
      VENDOR_CONFIRMED: 0,
    };

    samples.forEach(sample => {
      if (counts[sample.status] !== undefined) {
        counts[sample.status] += 1;
      }
    });

    return counts;
  }, [samples]);

  // Mutations
  const createSampleMutation = trpc.samples.createRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Sample request created.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteSampleMutation = trpc.samples.cancelRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Sample request deleted.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const requestReturnMutation = trpc.samples.requestReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return request submitted.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const approveReturnMutation = trpc.samples.approveReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return approved.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const completeReturnMutation = trpc.samples.completeReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return completed.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const requestVendorReturnMutation =
    trpc.samples.requestVendorReturn.useMutation({
      onSuccess: async () => {
        await utils.samples.getAll.invalidate();
        toast.success("Vendor return requested.");
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const shipToVendorMutation = trpc.samples.shipToVendor.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Marked as shipped to vendor.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const confirmVendorReturnMutation =
    trpc.samples.confirmVendorReturn.useMutation({
      onSuccess: async () => {
        await utils.samples.getAll.invalidate();
        toast.success("Vendor return confirmed.");
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const updateLocationMutation = trpc.samples.updateLocation.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Location updated.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleSubmit = useCallback(
    async (values: SampleFormValues) => {
      if (!user?.id) {
        toast.error("You need to be logged in to create a sample.");
        return;
      }

      const notesWithDueDate =
        values.dueDate && values.dueDate.length > 0
          ? [values.notes, `Due Date: ${values.dueDate}`]
              .filter(Boolean)
              .join("\\n")
          : values.notes;

      await createSampleMutation.mutateAsync({
        clientId: values.clientId,
        requestedBy: user.id,
        products: [{ productId: values.productId, quantity: values.quantity }],
        notes: notesWithDueDate,
      });
    },
    [createSampleMutation, user?.id]
  );

  const handleDelete = useCallback(
    async (sampleId: number) => {
      if (!user?.id) {
        toast.error("You need to be logged in to delete a sample.");
        return;
      }

      await deleteSampleMutation.mutateAsync({
        requestId: sampleId,
        cancelledBy: user.id,
        reason: "Deleted via Sample Management",
      });
    },
    [deleteSampleMutation, user?.id]
  );

  const handleRequestReturn = useCallback((sampleId: number) => {
    setSelectedSampleId(sampleId);
    setReturnDialogType("sample");
    setReturnDialogOpen(true);
  }, []);

  const handleApproveReturn = useCallback(
    async (sampleId: number) => {
      if (!user?.id) {
        toast.error("You need to be logged in.");
        return;
      }
      await approveReturnMutation.mutateAsync({
        requestId: sampleId,
        approvedBy: user.id,
      });
    },
    [approveReturnMutation, user?.id]
  );

  const handleCompleteReturn = useCallback(
    async (sampleId: number) => {
      if (!user?.id) {
        toast.error("You need to be logged in.");
        return;
      }
      await completeReturnMutation.mutateAsync({
        requestId: sampleId,
        completedBy: user.id,
      });
    },
    [completeReturnMutation, user?.id]
  );

  const handleRequestVendorReturn = useCallback((sampleId: number) => {
    setSelectedSampleId(sampleId);
    setReturnDialogType("vendor");
    setReturnDialogOpen(true);
  }, []);

  const handleShipToVendor = useCallback((sampleId: number) => {
    setSelectedSampleId(sampleId);
    setVendorShipDialogOpen(true);
  }, []);

  const handleConfirmVendorReturn = useCallback(
    async (sampleId: number) => {
      if (!user?.id) {
        toast.error("You need to be logged in.");
        return;
      }
      await confirmVendorReturnMutation.mutateAsync({
        requestId: sampleId,
        confirmedBy: user.id,
      });
    },
    [confirmVendorReturnMutation, user?.id]
  );

  const handleUpdateLocation = useCallback(
    (sampleId: number) => {
      const sample = samples.find(s => s.id === sampleId);
      setSelectedSampleId(sampleId);
      setSelectedSampleLocation(sample?.location ?? null);
      setLocationDialogOpen(true);
    },
    [samples]
  );

  const handleReturnSubmit = useCallback(
    async (values: SampleReturnFormValues) => {
      if (!user?.id || !selectedSampleId) {
        toast.error("You need to be logged in.");
        return;
      }

      if (returnDialogType === "sample") {
        await requestReturnMutation.mutateAsync({
          requestId: selectedSampleId,
          requestedBy: user.id,
          reason: values.reason,
          condition: values.condition,
          returnDate: values.returnDate,
        });
      } else {
        await requestVendorReturnMutation.mutateAsync({
          requestId: selectedSampleId,
          requestedBy: user.id,
          reason: values.reason,
        });
      }
    },
    [
      user?.id,
      selectedSampleId,
      returnDialogType,
      requestReturnMutation,
      requestVendorReturnMutation,
    ]
  );

  const handleVendorShipSubmit = useCallback(
    async (values: VendorShipFormValues) => {
      if (!user?.id || !selectedSampleId) {
        toast.error("You need to be logged in.");
        return;
      }

      await shipToVendorMutation.mutateAsync({
        requestId: selectedSampleId,
        shippedBy: user.id,
        trackingNumber: values.trackingNumber,
      });
    },
    [user?.id, selectedSampleId, shipToVendorMutation]
  );

  const handleLocationSubmit = useCallback(
    async (values: LocationUpdateFormValues) => {
      if (!user?.id || !selectedSampleId) {
        toast.error("You need to be logged in.");
        return;
      }

      await updateLocationMutation.mutateAsync({
        requestId: selectedSampleId,
        location: values.location,
        changedBy: user.id,
        notes: values.notes,
      });
    },
    [user?.id, selectedSampleId, updateLocationMutation]
  );

  const combinedProductOptions =
    productOptions.length > 0 ? productOptions : fallbackProductOptions;

  // Loading state
  if (samplesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Filter className="h-4 w-4" />
              Samples
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-7 w-7 text-primary" />
              Sample Management
            </h1>
          </div>
        </div>
        <LoadingState message="Loading samples..." />
      </div>
    );
  }

  // Error state with retry option - CRITICAL: Handle known database errors (Wave 3 finding)
  if (isSamplesError) {
    console.error("[SampleManagement] API Error:", samplesError);

    const isDbError = isDatabaseError(samplesError);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Filter className="h-4 w-4" />
              Samples
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-7 w-7 text-primary" />
              Sample Management
            </h1>
          </div>
        </div>
        <Card className="p-6" data-testid="samples-error">
          {isDbError ? (
            <DatabaseErrorState
              entity="samples"
              onRetry={() => refetchSamples()}
              errorMessage={samplesError?.message}
            />
          ) : (
            <ErrorState
              title="Failed to load samples"
              description={
                samplesError?.message ||
                "An error occurred while loading samples."
              }
              onRetry={() => refetchSamples()}
              showSupport
            />
          )}
        </Card>
      </div>
    );
  }

  // Empty state when no samples (but not if there was an error - that shows error state)
  if (samples.length === 0 && !isSamplesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Filter className="h-4 w-4" />
              Samples
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-7 w-7 text-primary" />
              Sample Management
            </h1>
            <p className="text-muted-foreground">
              Track sample requests, approvals, and returns.
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>New Sample</Button>
        </div>
        <Card className="p-6" data-testid="samples-empty">
          <EmptyState
            {...emptyStateConfigs.samples}
            action={{
              label: "Create Sample Request",
              onClick: () => setIsFormOpen(true),
            }}
            secondaryAction={{
              label: "Refresh",
              onClick: () => refetchSamples(),
              variant: "outline",
            }}
          />
        </Card>

        <SampleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleSubmit}
          clients={clientOptions}
          productOptions={combinedProductOptions}
          onProductSearch={setProductSearch}
          isSubmitting={createSampleMutation.isPending}
          isProductSearchLoading={productSearchLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Filter className="h-4 w-4" />
            Samples
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Beaker className="h-7 w-7 text-primary" />
            Sample Management
          </h1>
          <p className="text-muted-foreground">
            Track sample requests, approvals, and returns.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>New Sample</Button>
      </div>

      {/* Expiring Samples Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search samples..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="secondary">All {statusCounts.ALL}</Badge>
                <Badge variant="secondary">
                  Pending {statusCounts.PENDING}
                </Badge>
                <Badge variant="secondary">
                  Approved {statusCounts.FULFILLED}
                </Badge>
                {statusCounts.RETURN_REQUESTED > 0 && (
                  <Badge variant="outline">
                    Returns {statusCounts.RETURN_REQUESTED}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div>
          <ExpiringSamplesWidget daysAhead={30} limit={5} />
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sample statuses"
      >
        {[
          { value: "ALL" as TabFilter, label: "All Samples" },
          { value: "PENDING" as TabFilter, label: "Pending" },
          { value: "FULFILLED" as TabFilter, label: "Approved" },
          { value: "RETURN_REQUESTED" as TabFilter, label: "Return Requested" },
          { value: "RETURNED" as TabFilter, label: "Returned" },
          {
            value: "VENDOR_RETURN_REQUESTED" as TabFilter,
            label: "Vendor Returns",
          },
        ].map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            role="tab"
            data-state={statusFilter === tab.value ? "active" : "inactive"}
            aria-selected={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {statusCounts[tab.value] > 0 && tab.value !== "ALL" && (
              <Badge variant="secondary" className="ml-2">
                {statusCounts[tab.value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      <SampleList
        samples={samples}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        isLoading={samplesLoading}
        onDelete={handleDelete}
        onRequestReturn={handleRequestReturn}
        onApproveReturn={handleApproveReturn}
        onCompleteReturn={handleCompleteReturn}
        onRequestVendorReturn={handleRequestVendorReturn}
        onShipToVendor={handleShipToVendor}
        onConfirmVendorReturn={handleConfirmVendorReturn}
        onUpdateLocation={handleUpdateLocation}
        pageSize={10}
      />

      <SampleForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        clients={clientOptions}
        productOptions={combinedProductOptions}
        onProductSearch={setProductSearch}
        isSubmitting={createSampleMutation.isPending}
        isProductSearchLoading={productSearchLoading}
      />

      <SampleReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        onSubmit={handleReturnSubmit}
        type={returnDialogType}
        sampleId={selectedSampleId}
        isSubmitting={
          requestReturnMutation.isPending ||
          requestVendorReturnMutation.isPending
        }
      />

      <VendorShipDialog
        open={vendorShipDialogOpen}
        onOpenChange={setVendorShipDialogOpen}
        onSubmit={handleVendorShipSubmit}
        sampleId={selectedSampleId}
        isSubmitting={shipToVendorMutation.isPending}
      />

      <LocationUpdateDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        onSubmit={handleLocationSubmit}
        sampleId={selectedSampleId}
        currentLocation={selectedSampleLocation}
        isSubmitting={updateLocationMutation.isPending}
      />
    </div>
  );
}
