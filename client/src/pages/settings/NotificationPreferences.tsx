import React, { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    const { data: preferencesData } =
      trpc.notifications.getPreferences.useQuery();
    const mutation = trpc.notifications.updatePreferences.useMutation({
      onSuccess: async () => {
        await utils.notifications.getPreferences.invalidate();
      },
    });

    const [state, setState] = useState<PreferencesState>(defaultState);
    const [hasHydrated, setHasHydrated] = useState(false);
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
      },
      []
    );

    const handleSave = useCallback(() => {
      mutation.mutate(state);
    }, [mutation, state]);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {controls.map(control => (
              <div
                key={control.key}
                className="flex items-center justify-between border border-border rounded-lg p-4"
              >
                <div className="space-y-1">
                  <Label htmlFor={control.key}>{control.title}</Label>
                  <p className="text-sm text-muted-foreground">
                    {control.description}
                  </p>
                </div>
                <Switch
                  id={control.key}
                  checked={state[control.key]}
                  onCheckedChange={handleToggle(control.key)}
                  aria-label={control.title}
                />
              </div>
            ))}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending}
              >
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);
