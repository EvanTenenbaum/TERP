import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  brand: string;
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

export default function ProductsPage() {
  const { data, isLoading } = trpc.inventory.list.useQuery({ limit: 500 });
  type InventoryItem = NonNullable<typeof data>["items"][number];

  const productRows = useMemo<ProductRow[]>(() => {
    if (!data?.items) return [];

    const map = new Map<string, ProductRow>();

    data.items.forEach(item => {
      const inventoryItem = item as InventoryItem;
      const product = inventoryItem.product;
      const batch = inventoryItem.batch;
      const brand = inventoryItem.brand;

      if (!product) return;

      const id = String(product.id);
      const existing = map.get(id) ?? {
        id,
        name: product.nameCanonical ?? "Unknown Product",
        category: product.category ?? "Uncategorized",
        brand: brand?.name ?? "Unknown Brand",
        batchCount: 0,
        totalOnHand: 0,
      };

      const onHand = parseAmount(batch?.onHandQty ?? 0);
      map.set(id, {
        ...existing,
        batchCount: existing.batchCount + 1,
        totalOnHand: existing.totalOnHand + onHand,
      });
    });

    return Array.from(map.values());
  }, [data]);

  const columns = useMemo<Array<DataTableColumn<ProductRow>>>(() => {
    const categoryOptions = Array.from(
      new Set(productRows.map(row => row.category).filter(Boolean))
    ).map(value => ({ label: value, value: value.toLowerCase() }));

    const brandOptions = Array.from(
      new Set(productRows.map(row => row.brand).filter(Boolean))
    ).map(value => ({ label: value, value: value.toLowerCase() }));

    return [
      {
        id: "name",
        header: "Product",
        accessor: row => row.name,
        valueAccessor: row => row.name,
        searchable: true,
      },
      {
        id: "category",
        header: "Category",
        accessor: row => row.category,
        valueAccessor: row => row.category,
        filterOptions: categoryOptions,
        searchable: true,
      },
      {
        id: "brand",
        header: "Brand",
        accessor: row => row.brand,
        valueAccessor: row => row.brand,
        filterOptions: brandOptions,
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
    ];
  }, [productRows]);

  if (isLoading) {
    return (
      <Card className="p-4" data-testid="products-skeleton">
        <TableSkeleton rows={6} columns={5} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<ProductRow>
            data={productRows}
            columns={columns}
            enableSorting
            enableColumnFilters
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
