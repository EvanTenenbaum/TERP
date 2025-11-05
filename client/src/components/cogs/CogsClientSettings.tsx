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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Edit, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

type Client = {
  id: number;
  name: string;
  teriCode: string;
  cogsAdjustmentType?: string;
  cogsAdjustmentValue?: string;
};

export function CogsClientSettings() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Quick add form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState("PERCENTAGE");
  const [adjustmentValue, setAdjustmentValue] = useState("");

  // Fetch clients
  const { data: clients, isLoading } = trpc.clients.list.useQuery({ limit: 1000 });

  // Filter clients by search
  const filteredClients = clients?.filter((client) =>
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

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingClient) return;

    try {
      // TODO: Implement actual API call to update client COGS adjustment
      // await api.clients.updateCogsAdjustment(editingClient.id, { ... });
      
      console.log("Updating COGS adjustment for client:", editingClient);
      
      toast({
        title: "Adjustment updated",
        description: `COGS adjustment for ${editingClient.name} has been updated.`,
      });
      
      setIsEditDialogOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Error updating COGS adjustment:", error);
      toast({
        title: "Error updating adjustment",
        description: "Failed to update COGS adjustment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedClientId || !adjustmentValue) {
      toast({
        title: "Missing information",
        description: "Please select a client and enter an adjustment value.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement actual API call to add client COGS adjustment
      // await api.clients.addCogsAdjustment({ clientId, type, value });
      
      console.log("Adding COGS adjustment:", {
        clientId: selectedClientId,
        type: adjustmentType,
        value: adjustmentValue,
      });
      
      toast({
        title: "Adjustment added",
        description: "COGS adjustment has been added successfully.",
      });
      
      // Reset form
      setSelectedClientId("");
      setAdjustmentType("PERCENTAGE");
      setAdjustmentValue("");
    } catch (error) {
      console.error("Error adding COGS adjustment:", error);
      toast({
        title: "Error adding adjustment",
        description: "Failed to add COGS adjustment. Please try again.",
        variant: "destructive",
      });
    }
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(client)}
                        aria-label={`Edit COGS adjustment for ${client.name}`}
                      >
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
              <Label htmlFor="client-select">Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger id="client-select">
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
              <Label htmlFor="adjustment-type">Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger id="adjustment-type">
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
              <Label htmlFor="adjustment-value">Value</Label>
              <Input
                id="adjustment-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleQuickAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Adjustment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit COGS Adjustment</DialogTitle>
            <DialogDescription>
              Update the COGS adjustment for {editingClient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-adjustment-type">Adjustment Type</Label>
              <Select 
                defaultValue={editingClient?.cogsAdjustmentType || "NONE"}
                onValueChange={(value) => {
                  if (editingClient) {
                    setEditingClient({ ...editingClient, cogsAdjustmentType: value });
                  }
                }}
              >
                <SelectTrigger id="edit-adjustment-type">
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
              <Label htmlFor="edit-adjustment-value">Value</Label>
              <Input
                id="edit-adjustment-value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editingClient?.cogsAdjustmentValue || "0"}
                onChange={(e) => {
                  if (editingClient) {
                    setEditingClient({ ...editingClient, cogsAdjustmentValue: e.target.value });
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
