import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockDeals = [
  { id: "D-001", name: "Green Valley - Q4 Order", value: 25000, stage: "lead" },
  { id: "D-002", name: "Sunset Cannabis Expansion", value: 50000, stage: "qualified" },
  { id: "D-003", name: "Mountain Peak Bulk Order", value: 75000, stage: "proposal" },
  { id: "D-004", name: "City Wellness Trial", value: 15000, stage: "lead" }
];

const stages = [
  { id: "lead", name: "Leads", color: "border-slate-400" },
  { id: "qualified", name: "Qualified", color: "border-blue-400" },
  { id: "proposal", name: "Proposal", color: "border-yellow-400" },
  { id: "negotiation", name: "Negotiation", color: "border-orange-400" },
  { id: "won", name: "Won", color: "border-green-400" }
];

export default function Pipeline() {
  const [deals] = useState(mockDeals);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="mb-1">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Track deals through sales stages
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id);
          const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
          
          return (
            <div key={stage.id} className="space-y-3">
              <div>
                <h3 className="font-semibold">{stage.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {stageDeals.length} deals • ${stageValue.toLocaleString()}
                </p>
              </div>
              
              <div className={`min-h-[500px] p-3 rounded-lg border-2 ${stage.color} bg-muted/30`}>
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="p-4 mb-3 cursor-pointer hover-scale"
                    draggable
                    onDragStart={() => setDraggedDeal(deal.id)}
                    onDragEnd={() => setDraggedDeal(null)}
                  >
                    <p className="font-medium text-sm mb-2">{deal.name}</p>
                    <Badge variant="secondary">
                      ${deal.value.toLocaleString()}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
