/**
 * CustomerWishlistCard Component (WS-015)
 * Displays and allows editing of customer product wishes/preferences
 * ST-026: Added version support for optimistic locking
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Edit2, Save, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useOptimisticLocking } from "@/hooks/useOptimisticLocking";

interface CustomerWishlistCardProps {
  clientId: number;
  wishlist: string;
  version: number; // ST-026: Add version for optimistic locking
  onRefresh?: () => void; // ST-026: Callback to refresh client data on conflict
}

export function CustomerWishlistCard({
  clientId,
  wishlist: initialWishlist,
  version,
  onRefresh = () => {},
}: CustomerWishlistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [editValue, setEditValue] = useState(initialWishlist);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // ST-026: Optimistic locking for concurrent edit detection
  const { handleMutationError, ConflictDialogComponent } = useOptimisticLocking({
    entityType: "Client Wishlist",
    onRefresh: () => {
      onRefresh();
      setIsEditing(false);
    },
    onDiscard: () => setIsEditing(false),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      setWishlist(editValue);
      setIsEditing(false);
      utils.clients.getById.invalidate({ clientId });
      toast({
        title: "Wishlist Updated",
        description: "Customer wishlist has been saved successfully.",
      });
    },
    onError: (error) => {
      // ST-026: Handle concurrent edit conflicts
      if (!handleMutationError(error)) {
        toast({
          title: "Error",
          description: error.message || "Failed to update wishlist",
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      clientId,
      version, // ST-026: Include version for optimistic locking
      wishlist: editValue,
    });
  };

  const handleCancel = () => {
    setEditValue(wishlist);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <CardTitle className="text-lg">Customer Wishlist</CardTitle>
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-2"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          Products or strains this customer is looking for
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter products, strains, or preferences this customer is looking for..."
              className="min-h-[100px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {wishlist ? (
              <p className="whitespace-pre-wrap text-muted-foreground">{wishlist}</p>
            ) : (
              <p className="text-muted-foreground italic">
                No wishlist items yet. Click Edit to add products or strains this customer is looking for.
              </p>
            )}
          </div>
        )}
      </CardContent>
      {/* ST-026: Conflict dialog for concurrent edit detection */}
      {ConflictDialogComponent}
    </Card>
  );
}
