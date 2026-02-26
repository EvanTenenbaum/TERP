import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  X,
  Plus,
  Check,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useBeforeUnloadWarning } from "@/hooks/useUnsavedChangesWarning";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";

interface AddClientWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (clientId: number) => void;
}

// Step names for the wizard
const STEP_NAMES = {
  1: "Basic Information",
  2: "Client Types",
  3: "Tags & Notes",
  4: "Review & Confirm",
} as const;

const TOTAL_STEPS = 4;

export function AddClientWizard({
  open,
  onOpenChange,
  onSuccess,
}: AddClientWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    teriCode: "",
    name: "",
    companyName: "", // FEAT-001: Added company name field
    email: "",
    phone: "",
    secondaryPhone: "", // FEAT-001: Added secondary phone
    address: "",
    city: "", // FEAT-001: Added city
    state: "", // FEAT-001: Added state
    zipCode: "", // FEAT-001: Added zip code
    businessType: "" as
      | ""
      | "RETAIL"
      | "WHOLESALE"
      | "DISPENSARY"
      | "DELIVERY"
      | "MANUFACTURER"
      | "DISTRIBUTOR"
      | "OTHER", // FEAT-001: Business type
    preferredContact: "" as "" | "EMAIL" | "PHONE" | "TEXT" | "ANY", // FEAT-001: Preferred contact method
    paymentTerms: 30, // FEAT-001: Payment terms in days
    notes: "", // FEAT-001: Added notes field
    isBuyer: false,
    isSeller: false,
    isBrand: false,
    isReferee: false,
    isContractor: false,
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);

  // UX-001: Warn before leaving with unsaved changes
  const hasFormData =
    formData.name !== "" ||
    formData.teriCode !== "" ||
    formData.email !== "" ||
    formData.phone !== "" ||
    formData.address !== "" ||
    formData.tags.length > 0 ||
    formData.companyName !== "" ||
    formData.secondaryPhone !== "" ||
    formData.notes !== "";
  useBeforeUnloadWarning(hasFormData && open);

  // Fetch all existing tags for autocomplete
  const { data: existingTags } = trpc.clients.tags.getAll.useQuery();

  // Create client mutation
  // BUG-071 FIX: Enhanced error handling with detailed messages
  // TER-38 FIX: Use tRPC error codes for reliable error detection
  const utils = trpc.useContext();
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: data => {
      toast.success("Client created successfully", {
        description: `${formData.name} has been added to your client list`,
      });
      // TER-185: Invalidate client list so new client appears immediately
      utils.clients.list.invalidate();
      utils.clients.count.invalidate();
      onOpenChange(false);
      resetForm();
      if (onSuccess && data) onSuccess(data as number);
    },
    onError: error => {
      // TER-38 FIX: Always log the error for debugging
      console.error("Create client error:", {
        message: error.message,
        code: error.data?.code,
        httpStatus: error.data?.httpStatus,
      });

      // TER-38 FIX: Use tRPC error codes for reliable error categorization
      const errorCode = error.data?.code;
      const errorMessage = error.message || "An unexpected error occurred";

      switch (errorCode) {
        case "CONFLICT":
          // Duplicate TERI code or other unique constraint violation
          toast.error("Client already exists", {
            description: errorMessage.includes("TERI code")
              ? errorMessage
              : "A client with this TERI code already exists. Please use a different code.",
          });
          break;

        case "BAD_REQUEST":
          // Validation error
          toast.error("Invalid form data", {
            description: "Please check all required fields and try again.",
          });
          break;

        case "UNAUTHORIZED":
          // Authentication error
          toast.error("Authentication required", {
            description: "Please log in to create a client.",
          });
          break;

        case "FORBIDDEN":
          // Permission error
          toast.error("Permission denied", {
            description: "You don't have permission to create clients.",
          });
          break;

        default:
          // Handle by message content as fallback
          if (
            errorMessage.includes("network") ||
            errorMessage.includes("fetch") ||
            errorMessage.includes("Failed to fetch")
          ) {
            toast.error("Connection error", {
              description:
                "Unable to reach the server. Please check your connection and try again.",
            });
          } else if (
            errorMessage.includes("already exists") ||
            errorMessage.includes("duplicate")
          ) {
            toast.error("Client already exists", {
              description: errorMessage,
            });
          } else {
            // Generic error - show the server message
            toast.error("Failed to create client", {
              description: errorMessage,
            });
          }
      }
    },
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      teriCode: "",
      name: "",
      companyName: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      businessType: "",
      preferredContact: "",
      paymentTerms: 30,
      notes: "",
      isBuyer: false,
      isSeller: false,
      isBrand: false,
      isReferee: false,
      isContractor: false,
      tags: [],
    });
    setNewTag("");
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Get client types as display strings
  const getSelectedClientTypes = useCallback(() => {
    const types: string[] = [];
    if (formData.isBuyer) types.push("Buyer");
    if (formData.isSeller) types.push("Supplier");
    if (formData.isBrand) types.push("Brand");
    if (formData.isReferee) types.push("Referee");
    if (formData.isContractor) types.push("Contractor");
    return types;
  }, [
    formData.isBuyer,
    formData.isSeller,
    formData.isBrand,
    formData.isReferee,
    formData.isContractor,
  ]);

  // Get formatted address for review
  const getFormattedAddress = useCallback(() => {
    const parts = [
      formData.address,
      formData.city,
      formData.state,
      formData.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [formData.address, formData.city, formData.state, formData.zipCode]);

  // Get business type label for display
  const getBusinessTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      RETAIL: "Retail",
      WHOLESALE: "Wholesale",
      DISPENSARY: "Dispensary",
      DELIVERY: "Delivery",
      MANUFACTURER: "Manufacturer",
      DISTRIBUTOR: "Distributor",
      OTHER: "Other",
    };
    return labels[type] || type;
  }, []);

  // Get preferred contact label for display
  const getPreferredContactLabel = useCallback((method: string) => {
    const labels: Record<string, string> = {
      EMAIL: "Email",
      PHONE: "Phone",
      TEXT: "Text",
      ANY: "Any",
    };
    return labels[method] || method;
  }, []);

  const handleSubmit = async () => {
    // BUG-071 FIX: Enhanced validation with user feedback
    try {
      // Validate required fields
      if (!formData.teriCode.trim()) {
        toast.error("TERI Code is required", {
          description: "Please provide a unique TERI code for this client",
        });
        return;
      }

      if (!formData.name.trim()) {
        toast.error("Contact name is required", {
          description: "Please provide a contact name for this client",
        });
        return;
      }

      // Validate at least one client type is selected
      if (
        !formData.isBuyer &&
        !formData.isSeller &&
        !formData.isBrand &&
        !formData.isReferee &&
        !formData.isContractor
      ) {
        toast.error("Client type is required", {
          description: "Please select at least one client type",
        });
        return;
      }

      // FEAT-001: Compose full address from parts
      const addressParts = [
        formData.address,
        formData.city,
        formData.state,
        formData.zipCode,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      // Include company name in the name if provided
      const displayName = formData.companyName
        ? `${formData.name} (${formData.companyName})`
        : formData.name;

      // Combine notes and secondary phone info
      const notesWithPhone = formData.secondaryPhone
        ? `${formData.notes ? formData.notes + "\n" : ""}Secondary Phone: ${formData.secondaryPhone}`
        : formData.notes;

      await createClientMutation.mutateAsync({
        teriCode: formData.teriCode,
        name: displayName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: fullAddress || undefined,
        businessType: formData.businessType || undefined,
        preferredContact: formData.preferredContact || undefined,
        paymentTerms: formData.paymentTerms || 30,
        isBuyer: formData.isBuyer,
        isSeller: formData.isSeller,
        isBrand: formData.isBrand,
        isReferee: formData.isReferee,
        isContractor: formData.isContractor,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        wishlist: notesWithPhone || undefined, // Store additional notes in wishlist field
      });
    } catch (error) {
      // Error is already handled by onError callback
      console.error("Failed to create client:", error);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const canProceedStep1 =
    formData.teriCode.trim() !== "" && formData.name.trim() !== "";
  const canProceedStep2 =
    formData.isBuyer ||
    formData.isSeller ||
    formData.isBrand ||
    formData.isReferee ||
    formData.isContractor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Step {step} of {TOTAL_STEPS}:{" "}
            {STEP_NAMES[step as keyof typeof STEP_NAMES]}
          </DialogDescription>
          {/* Step progress indicator */}
          <div className="flex gap-1 mt-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Basic Information - FEAT-001 Enhanced */}
        {step === 1 && (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teriCode">
                  TERI Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="teriCode"
                  placeholder="Enter unique TERI code"
                  value={formData.teriCode}
                  onChange={e =>
                    setFormData({ ...formData, teriCode: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (e.g., "KJ", "FO1")
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={e =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Contact Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter contact's full name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Primary contact person for this client
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Primary Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={e =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                <Input
                  id="secondaryPhone"
                  type="tel"
                  placeholder="+1 (555) 987-6543"
                  value={formData.secondaryPhone}
                  onChange={e =>
                    setFormData({ ...formData, secondaryPhone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      businessType: value as typeof formData.businessType,
                    })
                  }
                >
                  <SelectTrigger id="businessType">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    <SelectItem value="DISPENSARY">Dispensary</SelectItem>
                    <SelectItem value="DELIVERY">Delivery</SelectItem>
                    <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredContact">Preferred Contact</Label>
                <Select
                  value={formData.preferredContact}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      preferredContact:
                        value as typeof formData.preferredContact,
                    })
                  }
                >
                  <SelectTrigger id="preferredContact">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="ANY">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                min="0"
                placeholder="30"
                value={formData.paymentTerms}
                onChange={e =>
                  setFormData({
                    ...formData,
                    paymentTerms: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Number of days for payment (e.g., Net 30)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={e =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={e =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={formData.zipCode}
                  onChange={e =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this client..."
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Client Types */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Client Types</CardTitle>
                <CardDescription>
                  Choose all that apply. Clients can have multiple types.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isBuyer"
                    checked={formData.isBuyer}
                    onCheckedChange={checked =>
                      setFormData({ ...formData, isBuyer: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="isBuyer"
                      className="text-base font-medium cursor-pointer"
                    >
                      Buyer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Client purchases products or services
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isSeller"
                    checked={formData.isSeller}
                    onCheckedChange={checked =>
                      setFormData({ ...formData, isSeller: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="isSeller"
                      className="text-base font-medium cursor-pointer"
                    >
                      Supplier
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Client sells products or services to you
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isBrand"
                    checked={formData.isBrand}
                    onCheckedChange={checked =>
                      setFormData({ ...formData, isBrand: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="isBrand"
                      className="text-base font-medium cursor-pointer"
                    >
                      Brand
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Client represents a brand or manufacturer
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isReferee"
                    checked={formData.isReferee}
                    onCheckedChange={checked =>
                      setFormData({
                        ...formData,
                        isReferee: checked as boolean,
                      })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="isReferee"
                      className="text-base font-medium cursor-pointer"
                    >
                      Referee
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Client provides referrals or references
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isContractor"
                    checked={formData.isContractor}
                    onCheckedChange={checked =>
                      setFormData({
                        ...formData,
                        isContractor: checked as boolean,
                      })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="isContractor"
                      className="text-base font-medium cursor-pointer"
                    >
                      Contractor
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Client provides contract services
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!canProceedStep2 && (
              <p className="text-sm text-destructive">
                Please select at least one client type to continue
              </p>
            )}
          </div>
        )}

        {/* Step 3: Tags */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Tags (Optional)</CardTitle>
                <CardDescription>
                  Tags help organize and filter clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newTag">Add Tag</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newTag"
                      placeholder="Enter a tag"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newTag);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => addTag(newTag)}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Current Tags */}
                {formData.tags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setDeleteTagConfirm(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Tags */}
                {existingTags && existingTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Suggested Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {existingTags
                        .filter(tag => !formData.tags.includes(tag))
                        .slice(0, 10)
                        .map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                            onClick={() => addTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Review Client Information
                </CardTitle>
                <CardDescription>
                  Please review the information below before creating the client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 pl-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">TERI Code:</span>
                      <p className="font-medium">{formData.teriCode}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Contact Name:
                      </span>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    {formData.companyName && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Company:
                        </span>
                        <p className="font-medium">{formData.companyName}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Contact Information Section */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Contact Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 pl-6 text-sm">
                    {formData.email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium">{formData.email}</p>
                      </div>
                    )}
                    {formData.phone && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Primary Phone:
                        </span>
                        <p className="font-medium">{formData.phone}</p>
                      </div>
                    )}
                    {formData.secondaryPhone && (
                      <div>
                        <span className="text-muted-foreground">
                          Secondary Phone:
                        </span>
                        <p className="font-medium">{formData.secondaryPhone}</p>
                      </div>
                    )}
                    {formData.preferredContact && (
                      <div>
                        <span className="text-muted-foreground">
                          Preferred Contact:
                        </span>
                        <p className="font-medium">
                          {getPreferredContactLabel(formData.preferredContact)}
                        </p>
                      </div>
                    )}
                    {!formData.email && !formData.phone && (
                      <p className="text-muted-foreground col-span-2 italic">
                        No contact details provided
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Address Section */}
                {getFormattedAddress() && (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Address
                      </h4>
                      <p className="pl-6 text-sm font-medium">
                        {getFormattedAddress()}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Business Details Section */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Business Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 pl-6 text-sm">
                    {formData.businessType && (
                      <div>
                        <span className="text-muted-foreground">
                          Business Type:
                        </span>
                        <p className="font-medium">
                          {getBusinessTypeLabel(formData.businessType)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">
                        Payment Terms:
                      </span>
                      <p className="font-medium">
                        Net {formData.paymentTerms} days
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Client Types Section */}
                <div className="space-y-3">
                  <h4 className="font-medium">Client Types</h4>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {getSelectedClientTypes().map(type => (
                      <Badge key={type} variant="default">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags Section */}
                {formData.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {formData.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes Section */}
                {formData.notes && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium">Notes</h4>
                      <p className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                        {formData.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending
                  ? "Creating..."
                  : "Create Client"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={deleteTagConfirm !== null}
        onOpenChange={open => !open && setDeleteTagConfirm(null)}
        title="Remove Tag"
        description="Are you sure you want to remove this tag from the client?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteTagConfirm) {
            removeTag(deleteTagConfirm);
          }
          setDeleteTagConfirm(null);
        }}
      />
    </Dialog>
  );
}
