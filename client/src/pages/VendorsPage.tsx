import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

interface VendorRow {
  id: string;
  name: string;
  productCount: number;
  batchCount: number;
  totalOnHand: number;
}

function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function VendorsPage() {
  const { data, isLoading } = trpc.inventory.list.useQuery({ limit: 500 });
  type InventoryItem = NonNullable<typeof data>["items"][number];

  const vendorRows = useMemo<VendorRow[]>(() => {
    if (!data?.items) return [];

    const map = new Map<string, VendorRow>();

    data.items.forEach(item => {
      const inventoryItem = item as InventoryItem;
      const vendor = inventoryItem.vendor;
      const product = inventoryItem.product;
      const batch = inventoryItem.batch;

      if (!vendor) return;

      const id = String(vendor.id ?? vendor.name ?? "vendor");
      const existing = map.get(id) ?? {
        id,
        name: vendor.name ?? "Unknown Vendor",
        productCount: 0,
        batchCount: 0,
        totalOnHand: 0,
      };

      map.set(id, {
        ...existing,
        productCount: existing.productCount + (product ? 1 : 0),
        batchCount: existing.batchCount + (batch ? 1 : 0),
        totalOnHand: existing.totalOnHand + parseAmount(batch?.onHandQty ?? 0),
      });
    });

    return Array.from(map.values());
  }, [data]);

  const columns = useMemo<Array<DataTableColumn<VendorRow>>>(
    () => [
      {
        id: "name",
        header: "Vendor",
        accessor: row => row.name,
        valueAccessor: row => row.name,
        searchable: true,
      },
      {
        id: "productCount",
        header: "Products",
        accessor: row => row.productCount,
        valueAccessor: row => row.productCount,
        enableFiltering: false,
      },
      {
        id: "batchCount",
        header: "Batches",
        accessor: row => row.batchCount,
        valueAccessor: row => row.batchCount,
        enableFiltering: false,
      },
      {
        id: "totalOnHand",
        header: "Total On Hand",
        accessor: row => row.totalOnHand.toFixed(2),
        valueAccessor: row => row.totalOnHand,
        enableFiltering: false,
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <Card className="p-4" data-testid="vendors-skeleton">
        <TableSkeleton rows={6} columns={4} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<VendorRow>
            data={vendorRows}
            columns={columns}
            enableSorting
            enableGlobalSearch
            enablePagination
            enableColumnVisibility
            initialPageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
