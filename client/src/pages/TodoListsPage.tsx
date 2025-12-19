import { useState } from "react";
import { Plus, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { TodoListCard } from "@/components/todos/TodoListCard";
import { TodoListForm } from "@/components/todos/TodoListForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLocation } from "wouter";

export function TodoListsPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: lists = [], isLoading } = trpc.todoLists.getMyLists.useQuery();

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
        <div className="text-center text-muted-foreground py-12">
          Loading your lists...
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12">
          <ListTodo className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first todo list to get started
          </p>
          <Button onClick={() => setIsCreateFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First List
          </Button>
        </div>
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
