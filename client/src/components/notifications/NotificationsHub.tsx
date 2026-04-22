import { useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { BackButton } from "@/components/common/BackButton";
import { AlertsPanel } from "@/components/alerts/AlertsPanel";
import { InlineNotificationPanel } from "@/components/notifications/InlineNotificationPanel";
import { normalizeNotificationLink } from "@/lib/navigation/notificationLinks";
import { TodoListCard } from "@/components/todos/TodoListCard";
import { TodoListForm } from "@/components/todos/TodoListForm";
import { QuickAddTaskModal } from "@/components/todos/QuickAddTaskModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  EmptyState,
  ErrorState,
  emptyStateConfigs,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationsHubTab = "system" | "alerts" | "todos";

function getTabFromSearch(search: string): NotificationsHubTab {
  const value = new URLSearchParams(search).get("tab");
  if (value === "alerts") return "alerts";
  if (value === "todos") return "todos";
  return "system";
}

export function NotificationsHub() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<number | null>(null);

  const activeTab = useMemo<NotificationsHubTab>(
    () => getTabFromSearch(search),
    [search]
  );

  const handleTabChange = (nextTab: string) => {
    const params = new URLSearchParams(search);

    if (nextTab === "alerts") {
      params.set("tab", "alerts");
    } else if (nextTab === "todos") {
      params.set("tab", "todos");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    setLocation(`/notifications${query ? `?${query}` : ""}`);
  };

  // Todo Lists data and mutations
  const {
    data: listsData,
    isLoading: listsLoading,
    error: listsError,
    isError: listsIsError,
    refetch: refetchLists,
  } = trpc.todoLists.getMyLists.useQuery();
  const lists = Array.isArray(listsData)
    ? listsData
    : (listsData?.items ?? []);

  const utils = trpc.useContext();

  const deleteList = trpc.todoLists.delete.useMutation({
    onSuccess: () => {
      utils.todoLists.getMyLists.invalidate();
      setDeleteListId(null);
    },
  });

  const handleDeleteList = (listId: number) => {
    setDeleteListId(listId);
  };

  const confirmDeleteList = () => {
    if (deleteListId) {
      deleteList.mutate({ listId: deleteListId });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <BackButton label="Back to Dashboard" to="/" />
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="h-6 w-6 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">Notifications</h1>
            <p className="text-sm text-muted-foreground truncate">
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
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="system">System Notifications</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="todos">Todo Lists</TabsTrigger>
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
                <InlineNotificationPanel
                  title="System Notifications"
                  collapsible={false}
                  limit={100}
                  className="h-full rounded-none border-0 shadow-none"
                  onNotificationClick={notification => {
                    const destination = normalizeNotificationLink(
                      notification.link,
                      notification.metadata
                    );
                    if (destination) {
                      setLocation(destination);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel variant="full" maxHeight="calc(100vh - 240px)" />
        </TabsContent>

        <TabsContent value="todos">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Todo Lists</CardTitle>
                  <CardDescription>
                    Organize your tasks with lists
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateFormOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New List
                  </Button>
                  <Button
                    onClick={() => setIsQuickAddOpen(true)}
                    data-testid="create-todo"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Todo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {listsLoading ? (
                <LoadingState message="Loading your lists..." />
              ) : listsIsError ? (
                <ErrorState
                  title="Failed to load todo lists"
                  description={
                    listsError?.message ||
                    "An error occurred while loading your todo lists."
                  }
                  onRetry={() => refetchLists()}
                />
              ) : lists.length === 0 ? (
                <EmptyState
                  {...emptyStateConfigs.todos}
                  action={{
                    label: "Create Your First List",
                    onClick: () => setIsCreateFormOpen(true),
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lists.map(list => (
                    <TodoListCard
                      key={list.id}
                      list={list}
                      onClick={() => setLocation(`/todos/${list.id}`)}
                      onDelete={() => handleDeleteList(list.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Todo List Forms */}
      <TodoListForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
      />

      <QuickAddTaskModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCreated={createdListId => {
          setIsQuickAddOpen(false);
          setLocation(`/todos/${createdListId}`);
        }}
      />

      <ConfirmDialog
        open={!!deleteListId}
        onOpenChange={open => !open && setDeleteListId(null)}
        title="Delete Todo List"
        description="Are you sure you want to delete this list? All tasks will be deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteList}
        isLoading={deleteList.isPending}
      />
    </div>
  );
}
