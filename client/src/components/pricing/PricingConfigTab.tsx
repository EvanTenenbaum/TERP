import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tag, TrendingUp, TrendingDown, Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PricingConfigTabProps {
  clientId: number;
}

export function PricingConfigTab({ clientId }: PricingConfigTabProps) {
  const utils = trpc.useUtils();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // Fetch client pricing rules
  const { data: clientRules, isLoading: rulesLoading } = trpc.pricing.getClientPricingRules.useQuery({
    clientId,
  });

  // Fetch all pricing profiles
  const { data: profiles } = trpc.pricing.listProfiles.useQuery();

  // Apply profile mutation
  const applyProfileMutation = trpc.pricing.applyProfileToClient.useMutation({
    onSuccess: () => {
      toast.success("Pricing profile applied successfully");
      utils.pricing.getClientPricingRules.invalidate();
      setSelectedProfileId("");
    },
    onError: (error) => {
      toast.error("Failed to apply pricing profile: " + error.message);
    },
  });

  // Handle apply profile
  const handleApplyProfile = () => {
    if (!selectedProfileId) return;

    applyProfileMutation.mutate({
      clientId,
      profileId: parseInt(selectedProfileId),
    });
  };

  // Get adjustment icon
  const getAdjustmentIcon = (type: string) => {
    if (type.includes("MARKUP")) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  // Get adjustment badge
  const getAdjustmentBadge = (type: string, value: string) => {
    const isPercent = type.includes("PERCENT");
    const isMarkup = type.includes("MARKUP");
    const variant = isMarkup ? "default" : "destructive";
    const symbol = isPercent ? "%" : "$";
    const sign = isMarkup ? "+" : "-";
    
    return (
      <Badge variant={variant}>
        {sign}{value}{symbol}
      </Badge>
    );
  };

  if (rulesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5" />
            <div>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>
                Manage pricing rules and profiles for this client
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Apply Pricing Profile */}
          <div className="space-y-3">
            <Label>Apply Pricing Profile</Label>
            <div className="flex gap-2">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a pricing profile..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleApplyProfile}
                disabled={!selectedProfileId || applyProfileMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {applyProfileMutation.isPending ? "Applying..." : "Apply"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Applying a profile will add all its rules to this client's pricing configuration
            </p>
          </div>

          {/* Active Pricing Rules */}
          <div className="space-y-3">
            <Label>Active Pricing Rules</Label>
            {!clientRules || clientRules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pricing rules configured for this client</p>
                  <p className="text-xs mt-2">Apply a pricing profile to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Adjustment</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAdjustmentIcon(rule.adjustmentType)}
                            {getAdjustmentBadge(rule.adjustmentType, rule.adjustmentValue.toString())}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {Object.keys((rule.conditions as Record<string, unknown>) || {}).length} condition(s)
                          </div>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* COGS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5" />
            <div>
              <CardTitle>COGS Configuration</CardTitle>
              <CardDescription>
                Configure cost of goods sold adjustments for this client
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>COGS Adjustment Type</Label>
            <Select defaultValue="NONE">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No Adjustment</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage Discount</SelectItem>
                <SelectItem value="FIXED_AMOUNT">Fixed Amount Discount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Adjustment Value</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              This adjustment will be applied to COGS calculations for all orders from this client
            </p>
          </div>

          <div className="flex justify-end">
            <Button>
              Save COGS Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

