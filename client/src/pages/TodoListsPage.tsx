import { useState } from "react";
import { Plus, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { TodoListCard } from "@/components/todos/TodoListCard";
import { TodoListForm } from "@/components/todos/TodoListForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLocation } from "wouter";
import { EmptyState, ErrorState, emptyStateConfigs } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

export function TodoListsPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  // Handle paginated response - extract items array or use empty array as fallback
  const { data: listsData, isLoading, error, isError, refetch } = trpc.todoLists.getMyLists.useQuery();
  const lists = Array.isArray(listsData) ? listsData : (listsData?.items ?? []);

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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListTodo className="h-8 w-8" />
            My Todo Lists
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your tasks with lists
          </p>
        </div>
        <Button onClick={() => setIsCreateFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Lists Grid */}
      {isLoading ? (
        <LoadingState message="Loading your lists..." />
      ) : isError ? (
        <ErrorState
          title="Failed to load todo lists"
          description={error?.message || "An error occurred while loading your todo lists."}
          onRetry={() => refetch()}
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

      {/* Create Form */}
      <TodoListForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
      />

      {/* Delete List Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteListId}
        onOpenChange={(open) => !open && setDeleteListId(null)}
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
