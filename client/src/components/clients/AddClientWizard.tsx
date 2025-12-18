import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAppMutation } from "@/hooks/useAppMutation";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
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

interface AddClientWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (clientId: number) => void;
}

export function AddClientWizard({ open, onOpenChange, onSuccess }: AddClientWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
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
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");

  // Fetch all existing tags for autocomplete
  const { data: existingTags } = trpc.clients.tags.getAll.useQuery();

  // Create client mutation with standardized error handling
  const createClientMutation = trpc.clients.create.useMutation();
  const { mutate: createClient, isPending, fieldErrors } = useAppMutation(
    createClientMutation,
    {
      successMessage: "Client created successfully",
      onSuccess: (data) => {
        onOpenChange(false);
        resetForm();
        if (onSuccess && data) onSuccess(data as number);
      },
      context: { component: "AddClientWizard" },
    }
  );

  const resetForm = () => {
    setStep(1);
    setFormData({
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
    });
    setNewTag("");
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    createClient({
      ...formData,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    });
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const canProceedStep1 = formData.teriCode.trim() !== "" && formData.name.trim() !== "";
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
                value={formData.teriCode}
                onChange={(e) => setFormData({ ...formData, teriCode: e.target.value })}
                required
                className={fieldErrors?.teriCode ? "border-destructive" : ""}
              />
              {fieldErrors?.teriCode ? (
                <p className="text-xs text-destructive">{fieldErrors.teriCode}</p>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={fieldErrors?.name ? "border-destructive" : ""}
              />
              {fieldErrors?.name ? (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter client's address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isBuyer: checked as boolean })
                    }
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isSeller: checked as boolean })
                    }
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isBrand: checked as boolean })
                    }
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isReferee: checked as boolean })
                    }
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isContractor: checked as boolean })
                    }
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
              <FormSubmitButton
                type="button"
                onClick={handleSubmit}
                isPending={isPending}
                loadingText="Creating..."
              >
                Create Client
              </FormSubmitButton>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

