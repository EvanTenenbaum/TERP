import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface SampleFormValues {
  productId: number;
  clientId: number;
  quantity: string;
  notes?: string;
  dueDate?: string | null;
}

export interface SampleFormOption {
  id: number;
  label: string;
}

export interface SampleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SampleFormValues) => Promise<void> | void;
  clients: SampleFormOption[];
  productOptions: SampleFormOption[];
  onProductSearch?: (query: string) => void;
  isSubmitting?: boolean;
  isProductSearchLoading?: boolean;
}

const formSchema = z.object({
  productId: z.number().min(1, { message: "Product is required" }),
  clientId: z.number().min(1, { message: "Client is required" }),
  quantity: z.string().min(1, { message: "Quantity is required" }),
  notes: z.string().optional(),
  dueDate: z.string().optional().nullable(),
});

export const SampleForm = React.memo(function SampleForm({
  open,
  onOpenChange,
  onSubmit,
  clients,
  productOptions,
  onProductSearch,
  isSubmitting = false,
  isProductSearchLoading = false,
}: SampleFormProps) {
  const [productQuery, setProductQuery] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<SampleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: 0,
      clientId: 0,
      quantity: "",
      notes: "",
      dueDate: "",
    },
  });

  const selectedProductId = watch("productId");

  const selectedProductLabel = useMemo(() => {
    return (
      productOptions.find(option => option.id === selectedProductId)?.label ??
      ""
    );
  }, [productOptions, selectedProductId]);

  const handleProductChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setProductQuery(value);
      const parsed = Number(value);
      setValue("productId", Number.isNaN(parsed) ? 0 : parsed);
      if (onProductSearch) {
        onProductSearch(value);
      }
    },
    [onProductSearch, setValue]
  );

  const handleFormSubmit = handleSubmit(async values => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      // Keep the form open to allow user to retry
      console.error(error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Sample Request</DialogTitle>
          <DialogDescription>
            Enter details for the new sample request. Products and clients are
            searchable to speed up entry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              list="product-options"
              placeholder="Search product by name or ID"
              value={productQuery}
              onChange={handleProductChange}
              aria-label="Product"
              disabled={isSubmitting}
            />
            <input
              type="hidden"
              {...register("productId", { valueAsNumber: true })}
            />
            <datalist id="product-options">
              {productOptions.map(option => (
                <option
                  key={option.id}
                  value={option.id.toString()}
                  label={option.label}
                />
              ))}
            </datalist>
            {selectedProductLabel && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedProductLabel}
              </p>
            )}
            {isProductSearchLoading && (
              <p className="text-xs text-muted-foreground">Searching...</p>
            )}
            {errors.productId && (
              <p className="text-sm text-destructive">
                {errors.productId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <select
              id="client"
              aria-label="Client"
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              disabled={isSubmitting}
              defaultValue=""
              {...register("clientId", { valueAsNumber: true })}
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="text-sm text-destructive">
                {errors.clientId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                aria-label="Quantity"
                placeholder="e.g. 5"
                disabled={isSubmitting}
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                aria-label="Due Date"
                disabled={isSubmitting}
                {...register("dueDate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              aria-label="Notes"
              placeholder="Add any extra details or special handling notes"
              disabled={isSubmitting}
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Sample"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
