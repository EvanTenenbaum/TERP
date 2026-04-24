import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { toast } from "sonner";

const CHANNEL_LABELS = {
  SALES_SHEET: "Sales Catalogue",
  LIVE_SHOPPING: "Live Shopping",
  VIP_SHOPPING: "VIP Shopping",
} as const;

const BASIS_LABELS = {
  LOW: "Low end of range",
  MID: "Middle of range",
  HIGH: "High end of range",
} as const;

export function CogsGlobalSettings() {
  const utils = trpc.useUtils();
  const { data, isLoading } =
    trpc.pricingDefaults.getRangePricingDefaults.useQuery();

  const mutation = trpc.pricingDefaults.setRangePricingDefault.useMutation({
    onSuccess: async () => {
      await utils.pricingDefaults.getRangePricingDefaults.invalidate();
      toast.success("Range pricing default updated");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Range-Based COGS Defaults</CardTitle>
          <CardDescription>
            Choose which vendor range value becomes the default effective COGS
            on each customer-facing channel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Staff views keep the full vendor range visible. Client-facing
              outputs only publish the selected sell price for the active
              channel.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {(data ?? []).map(setting => (
              <div
                key={setting.channel}
                className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {CHANNEL_LABELS[setting.channel]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Default effective basis:{" "}
                    <Badge variant="outline">
                      {BASIS_LABELS[setting.defaultBasis]}
                    </Badge>
                  </div>
                </div>
                <div className="w-full md:w-56">
                  <Label className="sr-only">
                    {CHANNEL_LABELS[setting.channel]} default
                  </Label>
                  <Select
                    value={setting.defaultBasis}
                    onValueChange={value =>
                      mutation.mutate({
                        channel: setting.channel,
                        defaultBasis: value as "LOW" | "MID" | "HIGH",
                      })
                    }
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MID">Mid</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">
              Loading channel defaults...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
