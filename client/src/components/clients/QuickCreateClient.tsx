import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import { UserPlus, Check, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface QuickCreateClientProps {
  onSuccess?: (client: { id: number; name: string; teriCode: string }) => void;
  triggerButton?: React.ReactNode;
  defaultReferrerId?: number;
  inline?: boolean;
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function QuickCreateClient({
  onSuccess,
  triggerButton,
  defaultReferrerId,
  inline = false,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
  title = "Quick Add Relationship",
  description = "Capture the code name and a reachable handle now. Fill the rest of the profile in later.",
  submitLabel = "Create Relationship",
}: QuickCreateClientProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isBuyer, setIsBuyer] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [referrerId, setReferrerId] = useState<number | undefined>(
    defaultReferrerId
  );

  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const quickCreateMutation = trpc.client360.quickCreate.useMutation({
    onSuccess: result => {
      if (result.success && result.client) {
        toast.success(
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Client created: {result.client.teriCode}</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={() =>
                setLocation(buildRelationshipProfilePath(result.client.id))
              }
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>,
          { duration: 5000 }
        );

        onSuccess?.(result.client);
        resetForm();
        setOpen(false);
        utils.clients.list.invalidate();
      }
    },
    onError: error => {
      // BUG-071 FIX: Provide clear, user-friendly error messages
      console.error("Quick create client error:", error);

      // Handle specific error types
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        toast.error("Client already exists", {
          description:
            "A client with this name or email already exists. Please use different information.",
        });
      } else if (
        error.message.includes("validation") ||
        error.message.includes("required")
      ) {
        toast.error("Invalid form data", {
          description: "Please check all required fields and try again.",
        });
      } else if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        toast.error("Connection error", {
          description:
            "Unable to reach the server. Please check your connection and try again.",
        });
      } else {
        toast.error("Failed to create client", {
          description:
            error.message || "An unexpected error occurred. Please try again.",
        });
      }
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setIsBuyer(true);
    setIsSeller(false);
    setReferrerId(defaultReferrerId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Code name is required", {
        description: "Please provide the relationship code name before saving.",
      });
      return;
    }

    if (!email.trim() && !phone.trim()) {
      toast.error("Reachable handle required", {
        description:
          "Add either a username/email or a signal, ID, or phone contact.",
      });
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Username / email must be a valid email", {
        description:
          "This field still saves into the email slot, so it needs an email-formatted handle.",
      });
      return;
    }

    if (!isBuyer && !isSeller) {
      toast.error("Relationship type required", {
        description: "Mark this record as a buyer, supplier, or both.",
      });
      return;
    }

    quickCreateMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      isBuyer,
      isSeller,
      referredByClientId: referrerId,
    });
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="quick-name">
          Code Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quick-name"
          placeholder="What the team calls this relationship"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quick-email">Username / Email</Label>
        <Input
          id="quick-email"
          type="email"
          placeholder="name@domain.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use this when the reachable username is already an email-formatted
          handle.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quick-phone">Signal / ID / Phone</Label>
        <Input
          id="quick-phone"
          type="tel"
          placeholder="@signalhandle or +1 (555) 123-4567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Add at least one reachable handle before creating the profile.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Relationship Type</Label>
        <div className="flex flex-wrap gap-4 rounded-lg border border-border/70 px-3 py-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="quick-buyer"
              checked={isBuyer}
              onCheckedChange={checked => setIsBuyer(!!checked)}
            />
            <Label htmlFor="quick-buyer" className="text-sm cursor-pointer">
              Buyer
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="quick-seller"
              checked={isSeller}
              onCheckedChange={checked => setIsSeller(!!checked)}
            />
            <Label htmlFor="quick-seller" className="text-sm cursor-pointer">
              Supplier
            </Label>
          </div>
        </div>
      </div>

      {!inline && (
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={quickCreateMutation.isPending}>
            {quickCreateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {submitLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      )}

      {inline && (
        <Button
          type="submit"
          disabled={quickCreateMutation.isPending}
          className="w-full"
        >
          {quickCreateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      )}
    </form>
  );

  if (inline) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Quick Add Relationship
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

export default QuickCreateClient;
