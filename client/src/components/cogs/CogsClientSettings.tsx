import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function CogsClientSettings() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch clients - handle paginated response
  const { data: clientsData, isLoading } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);

  // Filter clients by search
  const filteredClients = clients.filter((client: { id: number; name: string; teriCode: string; cogsAdjustmentType?: string | null; cogsAdjustmentValue?: string | null }) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.teriCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAdjustmentBadge = (type: string, value: string) => {
    if (type === "NONE") {
      return <Badge variant="secondary">No Adjustment</Badge>;
    } else if (type === "PERCENTAGE") {
      return <Badge variant="default">{value}% Discount</Badge>;
    } else if (type === "FIXED_AMOUNT") {
      return <Badge variant="default">${value} Discount</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client-Specific COGS Adjustments</CardTitle>
          <CardDescription>
            Configure COGS discounts or adjustments for specific clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Clients Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading clients...
            </div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>TERI Code</TableHead>
                  <TableHead>COGS Adjustment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.teriCode}</Badge>
                    </TableCell>
                    <TableCell>
                      {getAdjustmentBadge(
                        client.cogsAdjustmentType || "NONE",
                        client.cogsAdjustmentValue || "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No clients found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Client COGS Adjustment</CardTitle>
          <CardDescription>
            Quickly configure COGS adjustments for a client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select defaultValue="PERCENTAGE">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Adjustment</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage Discount</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Adjustment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

