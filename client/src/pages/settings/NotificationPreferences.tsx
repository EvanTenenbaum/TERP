import React, { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, Loader2, AlertCircle, RotateCcw } from "lucide-react";

type PreferenceKey =
  | "inAppEnabled"
  | "emailEnabled"
  | "appointmentReminders"
  | "orderUpdates"
  | "systemAlerts";

type PreferencesState = Record<PreferenceKey, boolean>;

const defaultState: PreferencesState = {
  inAppEnabled: true,
  emailEnabled: true,
  appointmentReminders: true,
  orderUpdates: true,
  systemAlerts: true,
};

export const NotificationPreferencesPage = React.memo(
  function NotificationPreferencesPage(): React.ReactElement {
    const utils = trpc.useContext();
    const {
      data: preferencesData,
      isLoading,
      error,
      refetch,
    } = trpc.notifications.getPreferences.useQuery();

    const mutation = trpc.notifications.updatePreferences.useMutation({
      onSuccess: async () => {
        await utils.notifications.getPreferences.invalidate();
        setHasChanges(false);
        toast.success("Preferences saved successfully");
      },
      onError: error => {
        toast.error("Failed to save preferences", {
          description: error.message,
        });
      },
    });

    const [state, setState] = useState<PreferencesState>(defaultState);
    const [hasHydrated, setHasHydrated] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const controls = useMemo(
      () => [
        {
          key: "inAppEnabled" as const,
          title: "In-App Notifications",
          description: "Receive notifications within the ERP dashboard.",
        },
        {
          key: "emailEnabled" as const,
          title: "Email Notifications",
          description: "Enable future email alerts for critical events.",
        },
        {
          key: "appointmentReminders" as const,
          title: "Appointment Reminders",
          description: "Get reminded about upcoming client appointments.",
        },
        {
          key: "orderUpdates" as const,
          title: "Order Updates",
          description: "Stay informed about order changes and status updates.",
        },
        {
          key: "systemAlerts" as const,
          title: "System Alerts",
          description: "Receive system health and maintenance notifications.",
        },
      ],
      []
    );

    useEffect(() => {
      if (!preferencesData || hasHydrated) {
        return;
      }
      const nextState = controls.reduce<PreferencesState>(
        (acc, control) => ({
          ...acc,
          [control.key]:
            preferencesData[control.key] ?? defaultState[control.key],
        }),
        defaultState
      );
      setState(nextState);
      setHasHydrated(true);
    }, [controls, hasHydrated, preferencesData]);

    const handleToggle = useCallback(
      (key: PreferenceKey) => (checked: boolean) => {
        setState(prev => ({
          ...prev,
          [key]: checked,
        }));
        setHasChanges(true);
      },
      []
    );

    const handleSave = useCallback(() => {
      mutation.mutate(state);
    }, [mutation, state]);

    const handleRestoreDefaults = useCallback(() => {
      setState(defaultState);
      setHasChanges(true);
      toast.info("Defaults restored. Click Save to apply changes.");
    }, []);

    // Loading skeleton
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-border rounded-lg p-4"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load preferences</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="w-fit"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Unsaved changes alert */}
        {hasChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unsaved changes</AlertTitle>
            <AlertDescription>
              You have unsaved changes to your notification preferences. Click
              Save to apply them.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {controls.map(control => (
              <div
                key={control.key}
                className="flex items-center justify-between border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <Label
                    htmlFor={control.key}
                    className="text-base font-medium cursor-pointer"
                  >
                    {control.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {control.description}
                  </p>
                </div>
                <Switch
                  id={control.key}
                  checked={state[control.key]}
                  onCheckedChange={handleToggle(control.key)}
                  aria-label={control.title}
                  disabled={mutation.isPending}
                />
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleRestoreDefaults}
                disabled={mutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Defaults
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending || !hasChanges}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>

            {preferencesData?.updatedAt && (
              <p className="text-xs text-muted-foreground text-right">
                Last updated:{" "}
                {new Date(preferencesData.updatedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
