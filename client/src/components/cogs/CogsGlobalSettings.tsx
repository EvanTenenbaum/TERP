import { useEffect, useRef, useState } from "react";
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
import { Check, Info, Loader2 } from "lucide-react";
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

type ChannelKey = keyof typeof CHANNEL_LABELS;

export function CogsGlobalSettings() {
  const utils = trpc.useUtils();
  const { data, isLoading } =
    trpc.pricingDefaults.getRangePricingDefaults.useQuery();

  const [savedChannel, setSavedChannel] = useState<ChannelKey | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    },
    []
  );

  const mutation = trpc.pricingDefaults.setRangePricingDefault.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.pricingDefaults.getRangePricingDefaults.invalidate();
      toast.success("Range pricing default updated");
      setSavedChannel(variables.channel);
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setSavedChannel(prev => (prev === variables.channel ? null : prev));
      }, 2000);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const pendingChannel: ChannelKey | null =
    mutation.isPending && mutation.variables
      ? mutation.variables.channel
      : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Range-Based COGS Defaults</CardTitle>
          <CardDescription>
            Choose which vendor range value becomes the default effective COGS
            on each customer-facing channel. Changes save automatically.
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
                <div className="flex w-full flex-col gap-1 md:w-56">
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
                    <SelectTrigger
                      aria-label={`${CHANNEL_LABELS[setting.channel]} default basis`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MID">Mid</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <div aria-live="polite" className="h-4 text-xs">
                    {pendingChannel === setting.channel ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving…
                      </span>
                    ) : savedChannel === setting.channel ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" />
                        Saved
                      </span>
                    ) : null}
                  </div>
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
