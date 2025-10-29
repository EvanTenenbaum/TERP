import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Loader2, Package, TrendingUp } from "lucide-react";
import { DataCardSection } from "@/components/data-cards";

/**
 * Vendor Supply Page
 * Central page for managing vendor supply items
 */

export default function VendorSupplyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch all vendor supply items
  const { data: supplyData, isLoading } = trpc.vendorSupply.getAll.useQuery({});

  const supplyItems = supplyData?.data || [];

  // Filter supply items based on search
  const filteredItems = supplyItems.filter((item: any) => {
    const matchesSearch =
      !searchQuery ||
      item.strain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      AVAILABLE: "default",
      RESERVED: "secondary",
      SOLD: "outline",
      EXPIRED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Supply</h1>
          <p className="text-muted-foreground">
            Manage vendor supply items and find matching clients
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supply Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vendor Supply Item</DialogTitle>
              <DialogDescription>
                Record a new item available from a vendor
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground py-4">
              Form implementation coming soon...
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <DataCardSection moduleId="vendor_supply" />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by strain, category, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Supply Items List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No supply items found</p>
            <p className="text-sm text-muted-foreground">
              Add vendor supply items to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item: any) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {item.strain || item.category || "Supply Item"}
                      </CardTitle>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription>
                      Vendor: {item.vendorName || `#${item.vendorId}`}
                      {item.category && ` • ${item.category}`}
                      {item.subcategory && ` • ${item.subcategory}`}
                      {item.grade && ` • Grade ${item.grade}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {item.quantityAvailable && (
                    <div>
                      <p className="text-muted-foreground">Available Quantity</p>
                      <p className="font-medium">{item.quantityAvailable} units</p>
                    </div>
                  )}
                  {item.pricePerUnit && (
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">${item.pricePerUnit}/unit</p>
                    </div>
                  )}
                  {item.availableUntil && (
                    <div>
                      <p className="text-muted-foreground">Available Until</p>
                      <p className="font-medium">
                        {new Date(item.availableUntil).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {item.createdAt && (
                    <div>
                      <p className="text-muted-foreground">Added</p>
                      <p className="font-medium">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    Find Matching Clients
                  </Button>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

