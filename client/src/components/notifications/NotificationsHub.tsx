import { useMemo } from "react";
import { Bell } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { BackButton } from "@/components/common/BackButton";
import { AlertsPanel } from "@/components/alerts/AlertsPanel";
import { InboxPanel } from "@/components/inbox/InboxPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationsHubTab = "system" | "alerts";

function getTabFromSearch(search: string): NotificationsHubTab {
  const value = new URLSearchParams(search).get("tab");
  return value === "alerts" ? "alerts" : "system";
}

export function NotificationsHub() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const activeTab = useMemo<NotificationsHubTab>(
    () => getTabFromSearch(search),
    [search]
  );

  const handleTabChange = (nextTab: string) => {
    const params = new URLSearchParams(search);

    if (nextTab === "alerts") {
      params.set("tab", "alerts");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    setLocation(`/notifications${query ? `?${query}` : ""}`);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <BackButton label="Back to Dashboard" to="/" />
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Review system notifications and alerts in one hub.
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="system">System Notifications</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                Inbox items, reminders, and updates that need review.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100vh-20rem)] min-h-[32rem]">
                <InboxPanel />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel variant="full" maxHeight="calc(100vh - 240px)" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
