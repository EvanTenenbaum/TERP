/**
 * Sprint 4 Track B - 4.B.8: MEET-022 - Reverse Lookup (Product Connections)
 *
 * Component for product-to-client connections:
 * - Given a product, find all clients who:
 *   - Purchased it
 *   - Want it
 *   - Have it on wishlist
 * - Display on product detail page
 * - Quick actions: contact, create order
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  ShoppingCart,
  Star,
  Package,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";

interface ProductConnectionsProps {
  productId: number;
  inventoryItemId?: number;
  includeWants?: boolean;
  includePurchases?: boolean;
  limit?: number;
  onCreateOrderClick?: (clientId: number) => void;
}

// Connection type from API
interface ProductConnection {
  clientId: number;
  clientName: string;
  clientCode: string;
  connectionType: "PURCHASED" | "WANTS" | "WISHLIST";
  details: {
    orderCount?: number;
    totalQuantity?: number;
    priority?: string;
    notes?: string;
  };
  date: Date | null;
}

/**
 * ProductConnections - Display all client connections to a product
 */
export function ProductConnections({
  productId,
  inventoryItemId,
  includeWants = true,
  includePurchases = true,
  limit = 50,
  onCreateOrderClick,
}: ProductConnectionsProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [, setLocation] = useLocation();

  const { data, isLoading, error } =
    trpc.client360.getProductConnections.useQuery({
      productId,
      inventoryItemId,
      includeWants,
      includePurchases,
      limit,
    });

  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get connection type badge
  const getConnectionBadge = (type: string) => {
    const config: Record<
      string,
      { variant: "default" | "secondary" | "outline"; icon: React.ReactNode }
    > = {
      PURCHASED: {
        variant: "default",
        icon: <ShoppingCart className="h-3 w-3 mr-1" />,
      },
      WANTS: { variant: "secondary", icon: <Star className="h-3 w-3 mr-1" /> },
      WISHLIST: {
        variant: "outline",
        icon: <Package className="h-3 w-3 mr-1" />,
      },
    };
    const c = config[type] || { variant: "outline", icon: null };
    return (
      <Badge variant={c.variant} className="flex items-center">
        {c.icon}
        {type}
      </Badge>
    );
  };

  // Filter connections by type
  const filterConnections = (
    connections: ProductConnection[],
    filter: string
  ) => {
    if (filter === "all") return connections;
    return connections.filter(c => c.connectionType === filter);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-destructive">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Failed to load product connections</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const connections = (data?.connections || []) as ProductConnection[];
  const purchasedCount = connections.filter(
    c => c.connectionType === "PURCHASED"
  ).length;
  const wantsCount = connections.filter(
    c => c.connectionType === "WANTS"
  ).length;
  const wishlistCount = connections.filter(
    c => c.connectionType === "WISHLIST"
  ).length;

  const filteredConnections = filterConnections(connections, activeTab);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Client Connections
        </CardTitle>
        <CardDescription>All clients connected to this product</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({connections.length})</TabsTrigger>
            <TabsTrigger value="PURCHASED">
              Purchased ({purchasedCount})
            </TabsTrigger>
            <TabsTrigger value="WANTS">Wants ({wantsCount})</TabsTrigger>
            <TabsTrigger value="WISHLIST">
              Wishlist ({wishlistCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredConnections.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConnections.map((connection, _idx) => (
                      <TableRow
                        key={`connection-${connection.clientId}-${connection.connectionType}`}
                      >
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {connection.clientName}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({connection.clientCode})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getConnectionBadge(connection.connectionType)}
                        </TableCell>
                        <TableCell>
                          {connection.connectionType === "PURCHASED" &&
                            connection.details && (
                              <div className="text-sm text-muted-foreground">
                                {connection.details.orderCount || 0} orders,{" "}
                                {parseFloat(
                                  String(
                                    connection.details.totalQuantity || "0"
                                  )
                                ).toFixed(0)}{" "}
                                units
                              </div>
                            )}
                          {connection.connectionType === "WANTS" &&
                            connection.details && (
                              <div className="text-sm">
                                {connection.details.priority && (
                                  <Badge variant="outline" className="mr-2">
                                    {connection.details.priority}
                                  </Badge>
                                )}
                                {connection.details.notes && (
                                  <span className="text-muted-foreground truncate max-w-[200px] inline-block">
                                    {connection.details.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          {connection.connectionType === "WISHLIST" && (
                            <span className="text-sm text-muted-foreground">
                              On wishlist
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(connection.date)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setLocation(`/clients/${connection.clientId}`)
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (onCreateOrderClick) {
                                    onCreateOrderClick(connection.clientId);
                                  } else {
                                    setLocation(
                                      `/orders/new?clientId=${connection.clientId}`
                                    );
                                  }
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Create Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  No {activeTab === "all" ? "" : activeTab.toLowerCase()}{" "}
                  connections found
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * ProductConnectionsSummary - Compact summary for product cards/lists
 */
interface ProductConnectionsSummaryProps {
  productId: number;
}

export function ProductConnectionsSummary({
  productId,
}: ProductConnectionsSummaryProps) {
  const { data, isLoading } = trpc.client360.getProductConnections.useQuery({
    productId,
    limit: 10,
  });

  if (isLoading) {
    return <Skeleton className="h-6 w-24" />;
  }

  const connections = data?.connections || [];
  const purchasedCount = connections.filter(
    c => c.connectionType === "PURCHASED"
  ).length;
  const wantsCount = connections.filter(
    c => c.connectionType === "WANTS"
  ).length;

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <TooltipProvider>
        {purchasedCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1">
                <ShoppingCart className="h-3 w-3" />
                {purchasedCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{purchasedCount} customers have purchased this</p>
            </TooltipContent>
          </Tooltip>
        )}
        {wantsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                {wantsCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{wantsCount} customers want this</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}

export default ProductConnections;
