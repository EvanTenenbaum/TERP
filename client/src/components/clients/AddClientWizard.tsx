import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

/**
 * Zod validation schema for client creation form
 * Property 15: Required fields validation
 * Property 16: Email format validation
 * Property 17: Phone format validation
 */
// Base schema without refinements for react-hook-form compatibility
const baseClientFormSchema = z.object({
  teriCode: z
    .string()
    .min(1, "TERI Code is required")
    .max(50, "TERI Code must be less than 50 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "TERI Code can only contain letters, numbers, underscores, and hyphens"),
  name: z
    .string()
    .min(1, "Client name is required")
    .max(200, "Name must be less than 200 characters")
    .refine(s => s.trim().length > 0, "Client name cannot be only whitespace"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email must be less than 254 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "Phone must be less than 50 characters")
    .regex(/^[\d\s\-+()]*$/, "Phone can only contain digits, spaces, and common symbols (+, -, (, ))")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  isBuyer: z.boolean(),
  isSeller: z.boolean(),
  isBrand: z.boolean(),
  isReferee: z.boolean(),
  isContractor: z.boolean(),
  tags: z.array(z.string()),
});

export const clientFormSchema = baseClientFormSchema.refine(
  (data) => data.isBuyer || data.isSeller || data.isBrand || data.isReferee || data.isContractor,
  {
    message: "At least one client type must be selected",
    path: ["isBuyer"], // Show error on first checkbox
  }
);

export type ClientFormData = z.infer<typeof clientFormSchema>;

// Step-specific validation schemas
export const step1Schema = clientFormSchema.pick({
  teriCode: true,
  name: true,
  email: true,
  phone: true,
  address: true,
});

export const step2Schema = z.object({
  isBuyer: z.boolean(),
  isSeller: z.boolean(),
  isBrand: z.boolean(),
  isReferee: z.boolean(),
  isContractor: z.boolean(),
}).refine(
  (data) => data.isBuyer || data.isSeller || data.isBrand || data.isReferee || data.isContractor,
  { message: "At least one client type must be selected" }
);

interface AddClientWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (clientId: number) => void;
}

export function AddClientWizard({ open, onOpenChange, onSuccess }: AddClientWizardProps) {
  const [step, setStep] = useState(1);
  const [newTag, setNewTag] = useState("");

  // React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, dirtyFields },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      teriCode: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      isBuyer: false,
      isSeller: false,
      isBrand: false,
      isReferee: false,
      isContractor: false,
      tags: [],
    },
    mode: "onChange", // Validate on change for real-time feedback
  });

  // Watch form values for controlled components
  const formData = watch();

  // Fetch all existing tags for autocomplete
  const { data: existingTags } = trpc.clients.tags.getAll.useQuery();

  // Create client mutation
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      onOpenChange(false);
      resetForm();
      if (onSuccess && data) onSuccess(data as number);
    },
  });

  const resetForm = (): void => {
    setStep(1);
    reset();
    setNewTag("");
  };

  const handleNext = async (): Promise<void> => {
    // Validate current step before proceeding
    if (step === 1) {
      const isStep1Valid = await trigger(["teriCode", "name", "email", "phone", "address"]);
      if (!isStep1Valid) return;
    }
    if (step === 2) {
      const isStep2Valid = await trigger(["isBuyer", "isSeller", "isBrand", "isReferee", "isContractor"]);
      if (!isStep2Valid) return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = (): void => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = async (data: ClientFormData): Promise<void> => {
    await createClientMutation.mutateAsync({
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
    });
  };

  const addTag = (tag: string): void => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setValue("tags", [...formData.tags, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string): void => {
    setValue("tags", formData.tags.filter((t) => t !== tag));
  };

  // Step validation based on form state
  const step1HasErrors = !!(errors.teriCode || errors.name || errors.email || errors.phone || errors.address);
  const canProceedStep1 = formData.teriCode.trim() !== "" && formData.name.trim() !== "" && !step1HasErrors;
  const canProceedStep2 =
    formData.isBuyer || formData.isSeller || formData.isBrand || formData.isReferee || formData.isContractor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? "Basic Information" : step === 2 ? "Client Types" : "Tags & Notes"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teriCode">
                TERI Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="teriCode"
                placeholder="Enter unique TERI code"
                {...register("teriCode")}
                aria-invalid={!!errors.teriCode}
                className={errors.teriCode ? "border-destructive" : ""}
              />
              {errors.teriCode ? (
                <p className="text-xs text-destructive">{errors.teriCode.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This is the unique identifier for the client (e.g., "KJ", "FO1")
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter client's full name"
                {...register("name")}
                aria-invalid={!!errors.name}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Full name is kept private and only visible in the client profile
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                {...register("email")}
                aria-invalid={!!errors.email}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register("phone")}
                aria-invalid={!!errors.phone}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter client's address"
                {...register("address")}
                aria-invalid={!!errors.address}
                className={errors.address ? "border-destructive" : ""}
                rows={3}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
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
                    onCheckedChange={(checked) => setValue("isBuyer", checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isBuyer" className="text-base font-medium cursor-pointer">
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
                    onCheckedChange={(checked) => setValue("isSeller", checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isSeller" className="text-base font-medium cursor-pointer">
                      Seller
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
                    onCheckedChange={(checked) => setValue("isBrand", checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isBrand" className="text-base font-medium cursor-pointer">
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
                    onCheckedChange={(checked) => setValue("isReferee", checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isReferee" className="text-base font-medium cursor-pointer">
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
                    onCheckedChange={(checked) => setValue("isContractor", checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isContractor" className="text-base font-medium cursor-pointer">
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
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
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
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
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
                        .filter((tag) => !formData.tags.includes(tag))
                        .slice(0, 10)
                        .map((tag) => (
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
                onClick={handleSubmit(onSubmit)}
                disabled={createClientMutation.isPending || !isValid}
              >
                {createClientMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

