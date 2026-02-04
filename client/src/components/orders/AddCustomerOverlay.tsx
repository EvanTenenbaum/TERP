import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface AddCustomerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (clientId: number) => void;
}

/**
 * Simplified customer onboarding overlay for order creation
 * Focuses on essential buyer information only
 */
export function AddCustomerOverlay({
  open,
  onOpenChange,
  onSuccess,
}: AddCustomerOverlayProps) {
  const [formData, setFormData] = useState({
    teriCode: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    isBuyer: true, // Always true for customers
  });

  // Create client mutation
  // TER-38 FIX: Enhanced error handling with proper tRPC error codes
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: data => {
      if (data) {
        toast.success("Customer created successfully!");
        onSuccess(data as number);
        onOpenChange(false);
        resetForm();
      }
    },
    onError: error => {
      // TER-38 FIX: Log error for debugging
      console.error("Create customer error:", {
        message: error.message,
        code: error.data?.code,
      });

      // TER-38 FIX: Use tRPC error codes for reliable error categorization
      const errorCode = error.data?.code;
      const errorMessage = error.message || "An unexpected error occurred";

      switch (errorCode) {
        case "CONFLICT":
          toast.error("Customer already exists", {
            description: errorMessage.includes("TERI code")
              ? errorMessage
              : "A customer with this TERI code already exists.",
          });
          break;

        case "UNAUTHORIZED":
          toast.error("Authentication required", {
            description: "Please log in to create a customer.",
          });
          break;

        case "FORBIDDEN":
          toast.error("Permission denied", {
            description: "You don't have permission to create customers.",
          });
          break;

        default:
          // Handle network errors or show server message
          if (
            errorMessage.includes("network") ||
            errorMessage.includes("fetch") ||
            errorMessage.includes("Failed to fetch")
          ) {
            toast.error("Connection error", {
              description: "Unable to reach the server. Please try again.",
            });
          } else {
            toast.error("Failed to create customer", {
              description: errorMessage,
            });
          }
      }
    },
  });

  const resetForm = () => {
    setFormData({
      teriCode: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      isBuyer: true,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.teriCode.trim() || !formData.name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createClientMutation.mutateAsync({
        ...formData,
        isSeller: false,
        isBrand: false,
        isReferee: false,
        isContractor: false,
      });
    } catch (_error) {
      // Error already handled by onError callback
    }
  };

  const canSubmit =
    formData.teriCode.trim() !== "" && formData.name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer to add to this order. Required fields are
            marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TERI Code */}
          <div className="space-y-2">
            <Label htmlFor="teriCode">
              TERI Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="teriCode"
              value={formData.teriCode}
              onChange={e =>
                setFormData({ ...formData, teriCode: e.target.value })
              }
              placeholder="e.g., CUST-001"
              required
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Acme Corporation"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="customer@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={e =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={e =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="123 Main St, City, State, ZIP"
              rows={3}
            />
          </div>

          {/* Buyer Checkbox (always checked, disabled) */}
          <div className="flex items-center space-x-2">
            <Checkbox id="isBuyer" checked={formData.isBuyer} disabled />
            <Label htmlFor="isBuyer" className="text-sm text-muted-foreground">
              Customer is a buyer
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || createClientMutation.isPending}
            >
              {createClientMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createClientMutation.isPending ? "Creating..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
