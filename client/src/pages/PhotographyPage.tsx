/**
 * Photography Module Page (WS-010)
 * Simple image upload and management for product photography
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Search, CheckCircle, Clock, Image } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";

export default function PhotographyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Queries
  const {
    data: queue,
    isLoading,
    refetch,
  } = trpc.photography.getQueue.useQuery({
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as "PENDING" | "IN_PROGRESS" | "COMPLETED"),
    search: searchTerm || undefined,
  });

  // Mutations
  const markComplete = trpc.photography.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Item marked as photographed");
      refetch();
      setSelectedItems([]);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleMarkComplete = (batchId: number) => {
    markComplete.mutate({ batchId, imageUrls: [] });
  };

  const handleBulkMarkComplete = () => {
    selectedItems.forEach(batchId => {
      markComplete.mutate({ batchId, imageUrls: [] });
    });
  };

  const toggleSelection = (batchId: number) => {
    setSelectedItems(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const selectAll = () => {
    if (queue?.items) {
      const pendingIds = queue.items
        .filter(item => item.status !== "COMPLETED")
        .map(item => item.batchId);
      setSelectedItems(pendingIds);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Camera className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Photography Queue</h1>
            <p className="text-muted-foreground">
              Manage product photography workflow
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.stats?.pending || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.stats?.inProgress || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {queue?.stats?.completedToday || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.items?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} selected
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkMarkComplete}
                    disabled={markComplete.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Selected Complete
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All Pending
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : !queue?.items?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in photography queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedItems.length ===
                        queue.items.filter(i => i.status !== "COMPLETED").length
                      }
                      onCheckedChange={checked => {
                        if (checked) {
                          selectAll();
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.items.map(item => (
                  <TableRow key={item.batchId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.batchId)}
                        onCheckedChange={() => toggleSelection(item.batchId)}
                        disabled={item.status === "COMPLETED"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell>{item.strainName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.batchId}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.addedAt
                        ? new Date(item.addedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status !== "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(item.batchId)}
                          disabled={markComplete.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Done
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
