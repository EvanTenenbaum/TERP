/**
 * WS-004: Referred By Selector
 * Dropdown to select a VIP referrer when creating an order for a new customer
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, X, Search, User } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ReferredBySelectorProps {
  excludeClientId?: number;
  selectedReferrerId?: number | null;
  onSelect: (referrerId: number | null, referrerName?: string) => void;
  disabled?: boolean;
}

export function ReferredBySelector({
  excludeClientId,
  selectedReferrerId,
  onSelect,
  disabled = false,
}: ReferredBySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: referrers, isLoading } = trpc.referrals.getEligibleReferrers.useQuery(
    {
      excludeClientId,
      search: search || undefined,
    },
    { enabled: open }
  );

  const { data: settings } = trpc.referrals.getSettings.useQuery();

  const selectedReferrer = referrers?.find((r) => r.id === selectedReferrerId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-purple-500" />
        Referred By (Optional)
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              selectedReferrerId && "border-purple-300 bg-purple-50"
            )}
          >
            {selectedReferrerId && selectedReferrer ? (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {selectedReferrer.name}
                {selectedReferrer.tier && (
                  <span className="text-xs text-purple-600">({selectedReferrer.tier})</span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">Select referrer...</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : referrers && referrers.length > 0 ? (
              referrers.map((referrer) => (
                <div
                  key={referrer.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100",
                    selectedReferrerId === referrer.id && "bg-purple-50"
                  )}
                  onClick={() => {
                    onSelect(referrer.id, referrer.name);
                    setOpen(false);
                  }}
                >
                  <div>
                    <p className="font-medium">{referrer.name}</p>
                    {referrer.tier && (
                      <p className="text-xs text-gray-500">{referrer.tier}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No customers found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedReferrerId && (
        <div className="flex items-center justify-between rounded-lg bg-purple-50 p-2 text-sm">
          <span className="text-purple-700">
            <Gift className="mr-1 inline h-4 w-4" />
            {selectedReferrer?.name} will earn{" "}
            <strong>{settings?.globalPercentage || 10}%</strong> credit on this order
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(null)}
            className="h-6 w-6 p-0 text-purple-500 hover:text-purple-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
