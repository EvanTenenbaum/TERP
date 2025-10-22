import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockBatches, mockInventory } from "@/lib/mockData";

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  
  const batch = mockBatches.find(b => b.id === batchId);
  const item = batch ? mockInventory.find(i => i.id === batch.inventory_id) : null;

  if (!batch) {
    return <div>Batch not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-1">{batch.id}</h1>
            <StatusBadge
              status={batch.status === "Available" ? "success" : batch.status === "Quarantined" ? "warning" : "neutral"}
              label={batch.status}
            />
          </div>
          <p className="text-sm text-muted-foreground">Lot: {batch.lot_number}</p>
        </div>
        <Button variant="outline">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Item</h3>
          <p className="font-semibold text-lg">{item?.strain_name || batch.inventory_id}</p>
          <p className="text-sm text-muted-foreground mt-1">{item?.type}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Quantity</h3>
          <p className="font-semibold text-2xl">{batch.qty}</p>
          <p className="text-xs text-muted-foreground mt-2">units</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Expiration Date</h3>
          <p className="font-semibold text-lg">
            {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : "N/A"}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Batch Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Received Date</p>
            <p className="font-medium">{new Date(batch.received_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lot Number</p>
            <p className="font-medium">{batch.lot_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{batch.status}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
