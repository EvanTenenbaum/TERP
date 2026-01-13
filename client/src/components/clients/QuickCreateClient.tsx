/**
 * Sprint 4 Track B - 4.B.10: WS-011 - Quick Customer Creation
 *
 * Fast customer creation flow:
 * - Minimal required fields (name, email/phone)
 * - Auto-fill from previous entries
 * - Inline creation in order forms
 * - Quick success toast with link to full profile
 */

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { UserPlus, Search, Check, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface QuickCreateClientProps {
  onSuccess?: (client: { id: number; name: string; teriCode: string }) => void;
  triggerButton?: React.ReactNode;
  defaultReferrerId?: number;
  inline?: boolean; // If true, render inline instead of dialog
}

/**
 * QuickCreateClient - Fast customer creation with minimal fields
 */
export function QuickCreateClient({
  onSuccess,
  triggerButton,
  defaultReferrerId,
  inline = false,
}: QuickCreateClientProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isBuyer, setIsBuyer] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [referrerId, setReferrerId] = useState<number | undefined>(
    defaultReferrerId
  );
  const [referrerSearch, setReferrerSearch] = useState("");
  const [showReferrerPopover, setShowReferrerPopover] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(false);

  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Auto-fill suggestions
  const { data: nameSuggestions } =
    trpc.client360.getAutoFillSuggestions.useQuery(
      { query: name, field: "name" },
      { enabled: name.length >= 2 && showAutoFill }
    );

  const { data: emailSuggestions } =
    trpc.client360.getAutoFillSuggestions.useQuery(
      { query: email, field: "email" },
      { enabled: email.length >= 3 && showAutoFill }
    );

  const { data: phoneSuggestions } =
    trpc.client360.getAutoFillSuggestions.useQuery(
      { query: phone, field: "phone" },
      { enabled: phone.length >= 3 && showAutoFill }
    );

  // Referrer search
  const { data: referrerResults } = trpc.clients.list.useQuery(
    { search: referrerSearch, limit: 5 },
    { enabled: referrerSearch.length >= 2 }
  );

  // Quick create mutation
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
              onClick={() => setLocation(`/clients/${result.client.id}`)}
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
      toast.error(error.message || "Failed to create client");
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setIsBuyer(true);
    setIsSeller(false);
    setReferrerId(defaultReferrerId);
    setReferrerSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide either email or phone");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="quick-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="quick-name"
            placeholder="Full name"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setShowAutoFill(true);
            }}
            onFocus={() => setShowAutoFill(true)}
            required
            autoComplete="off"
          />
          {/* Auto-fill suggestions */}
          {showAutoFill &&
            nameSuggestions?.suggestions &&
            nameSuggestions.suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {nameSuggestions.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setName(s.value || "");
                      setShowAutoFill(false);
                    }}
                  >
                    <span className="font-medium">{s.value}</span>
                    <span className="text-muted-foreground ml-2">
                      ({s.clientName})
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="quick-email">Email</Label>
        <div className="relative">
          <Input
            id="quick-email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setShowAutoFill(true);
            }}
            onFocus={() => setShowAutoFill(true)}
            autoComplete="off"
          />
          {showAutoFill &&
            emailSuggestions?.suggestions &&
            emailSuggestions.suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {emailSuggestions.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setEmail(s.value || "");
                      setShowAutoFill(false);
                    }}
                  >
                    <span className="font-medium">{s.value}</span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="quick-phone">Phone</Label>
        <div className="relative">
          <Input
            id="quick-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={e => {
              setPhone(e.target.value);
              setShowAutoFill(true);
            }}
            onFocus={() => setShowAutoFill(true)}
            autoComplete="off"
          />
          {showAutoFill &&
            phoneSuggestions?.suggestions &&
            phoneSuggestions.suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {phoneSuggestions.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setPhone(s.value || "");
                      setShowAutoFill(false);
                    }}
                  >
                    <span className="font-medium">{s.value}</span>
                  </button>
                ))}
              </div>
            )}
        </div>
        <p className="text-xs text-muted-foreground">
          At least email or phone is required
        </p>
      </div>

      {/* Client Types */}
      <div className="flex gap-4">
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
            Seller/Supplier
          </Label>
        </div>
      </div>

      {/* Referrer (optional) */}
      <div className="space-y-2">
        <Label>Referred By (optional)</Label>
        <Popover
          open={showReferrerPopover}
          onOpenChange={setShowReferrerPopover}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal"
              type="button"
            >
              {referrerId &&
              referrerResults?.items?.find(
                (r: { id: number; name: string }) => r.id === referrerId
              ) ? (
                <span>
                  {
                    referrerResults.items.find(
                      (r: { id: number; name: string }) => r.id === referrerId
                    )?.name
                  }
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Select referrer...
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={referrerSearch}
                  onChange={e => setReferrerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {referrerResults?.items?.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded"
                    onClick={() => {
                      setReferrerId(client.id);
                      setShowReferrerPopover(false);
                    }}
                  >
                    {client.name} ({client.teriCode})
                  </button>
                ))}
                {referrerSearch.length >= 2 &&
                  (!referrerResults?.items ||
                    referrerResults.items.length === 0) && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      No clients found
                    </p>
                  )}
              </div>
              {referrerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  type="button"
                  onClick={() => {
                    setReferrerId(undefined);
                    setShowReferrerPopover(false);
                  }}
                >
                  Clear selection
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
                Create Client
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
              Create Client
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
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Add Client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onClick={() => setShowAutoFill(false)}
      >
        <DialogHeader>
          <DialogTitle>Quick Add Client</DialogTitle>
          <DialogDescription>
            Create a new client with minimal information. You can add more
            details later.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

export default QuickCreateClient;
