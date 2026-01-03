import { useCallback, useMemo, useState } from "react";
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
} from "@/components/samples/SampleList";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  if (status === "FULFILLED") return "FULFILLED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "RETURNED") return "RETURNED";
  return "PENDING";
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

  const debouncedProductSearch = useDebounce(productSearch, 300);

  const utils = trpc.useUtils();
  const { user } = useAuth();

  const { data: samplesData, isLoading: samplesLoading } =
    trpc.samples.getPending.useQuery();

  const { data: clientsData } = trpc.clients.list.useQuery(
    { limit: 200 },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: productSearchData, isLoading: productSearchLoading } =
    trpc.search.global.useQuery(
      { query: debouncedProductSearch, limit: 15 },
      { enabled: debouncedProductSearch.length > 1 }
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
    const products = productSearchData?.products ?? [];
    if (!products.length) return [];

    return products.map(product => ({
      id: product.id,
      label: product.title || `Product #${product.id}`,
    }));
  }, [productSearchData?.products]);

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
      };
    });
  }, [clientNameMap, samplesData]);

  const statusCounts = useMemo(() => {
    const counts: Record<TabFilter, number> = {
      ALL: samples.length,
      PENDING: 0,
      FULFILLED: 0,
      CANCELLED: 0,
      RETURNED: 0,
    };

    samples.forEach(sample => {
      counts[normalizeStatus(sample.status)] += 1;
    });

    return counts;
  }, [samples]);

  const createSampleMutation = trpc.samples.createRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getPending.invalidate();
      toast.success("Sample request created.");
      // TODO(NOTIF-001): trigger notification when notification service is available.
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteSampleMutation = trpc.samples.cancelRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getPending.invalidate();
      toast.success("Sample request deleted.");
      // TODO(NOTIF-001): trigger notification when notification service is available.
    },
    onError: error => {
      toast.error(error.message);
    },
  });

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

  const combinedProductOptions =
    productOptions.length > 0 ? productOptions : fallbackProductOptions;

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

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search samples..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">All {statusCounts.ALL}</Badge>
            <Badge variant="secondary">Pending {statusCounts.PENDING}</Badge>
          </div>
        </div>
      </Card>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sample statuses"
      >
        {[
          { value: "ALL" as TabFilter, label: "All Samples" },
          { value: "PENDING" as TabFilter, label: "Pending" },
          { value: "FULFILLED" as TabFilter, label: "Approved" },
          { value: "RETURNED" as TabFilter, label: "Returned" },
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
          </Button>
        ))}
      </div>

      <SampleList
        samples={samples}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        isLoading={samplesLoading}
        onDelete={handleDelete}
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
    </div>
  );
}
