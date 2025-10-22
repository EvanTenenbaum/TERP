import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Discrepancy {
  id: string;
  sku: string;
  location: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  status: "open" | "resolved" | "ignored";
  detectedAt: string;
}

export default function Discrepancies() {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([
    { id: "1", sku: "WGT-001", location: "A-12-3", systemQty: 150, physicalQty: 145, variance: -5, status: "open", detectedAt: "2025-01-14" },
    { id: "2", sku: "WGT-002", location: "A-12-4", systemQty: 89, physicalQty: 95, variance: 6, status: "open", detectedAt: "2025-01-14" },
    { id: "3", sku: "WGT-003", location: "B-05-1", systemQty: 234, physicalQty: 234, variance: 0, status: "resolved", detectedAt: "2025-01-13" },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleResolve = (id: string, action: "adjust" | "ignore") => {
    setDiscrepancies(discrepancies.map(d => 
      d.id === id ? { ...d, status: action === "adjust" ? "resolved" as const : "ignored" as const } : d
    ));
    setExpandedId(null);
  };

  const openDiscrepancies = discrepancies.filter(d => d.status === "open");
  const resolvedDiscrepancies = discrepancies.filter(d => d.status !== "open");

  const columns = [
    { key: "sku", label: "SKU" },
    { key: "location", label: "Location" },
    { 
      key: "variance", 
      label: "Variance",
      render: (d: Discrepancy) => (
        <span className={d.variance > 0 ? "text-success" : d.variance < 0 ? "text-warning" : ""}>
          {d.variance > 0 ? "+" : ""}{d.variance}
        </span>
      )
    },
    { key: "detectedAt", label: "Detected" },
    { 
      key: "status", 
      label: "Status",
      render: (d: Discrepancy) => {
        const statusMap = {
          open: { status: "warning" as const, label: "OPEN" },
          resolved: { status: "success" as const, label: "RESOLVED" },
          ignored: { status: "neutral" as const, label: "IGNORED" },
        };
        const config = statusMap[d.status];
        return <StatusBadge status={config.status} label={config.label} />;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Inventory Discrepancies</h1>
        <p className="text-muted-foreground">Review and resolve count variances</p>
      </div>

      {openDiscrepancies.length > 0 && (
        <Card className="p-6 border-warning/20">
          <div className="flex items-start gap-4 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <h3 className="mb-1">Action Required</h3>
              <p className="text-sm text-muted-foreground">
                {openDiscrepancies.length} discrepancies need review
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {openDiscrepancies.map((disc) => (
              <Collapsible
                key={disc.id}
                open={expandedId === disc.id}
                onOpenChange={(open) => setExpandedId(open ? disc.id : null)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 rounded-md bg-panel hover:bg-elevated transition-fast">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-medium">{disc.sku}</p>
                        <p className="text-sm text-muted-foreground">{disc.location}</p>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">System: </span>
                        <span>{disc.systemQty}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span>Physical: </span>
                        <span>{disc.physicalQty}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${disc.variance > 0 ? "text-success" : "text-warning"}`}>
                        {disc.variance > 0 ? "+" : ""}{disc.variance}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 space-y-3 bg-elevated rounded-md mt-2">
                    <p className="text-sm text-muted-foreground">
                      Detected on {disc.detectedAt}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleResolve(disc.id, "adjust")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Adjust System Qty
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleResolve(disc.id, "ignore")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Ignore
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </Card>
      )}

      {resolvedDiscrepancies.length > 0 && (
        <div className="space-y-4">
          <h3>History</h3>
          <DataTable
            columns={columns}
            data={resolvedDiscrepancies}
            emptyMessage="No resolved discrepancies"
          />
        </div>
      )}

      {openDiscrepancies.length === 0 && resolvedDiscrepancies.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h3 className="mb-2">All Clear</h3>
          <p className="text-sm text-muted-foreground">No discrepancies detected</p>
        </Card>
      )}
    </div>
  );
}
