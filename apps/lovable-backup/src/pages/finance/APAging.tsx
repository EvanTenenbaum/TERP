import { useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface VendorAging {
  id: string;
  vendor: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  total: number;
}

export default function APAging() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  
  const [vendors] = useState<VendorAging[]>([
    { id: "1", vendor: "Acme Supplies", current: 45000, days30: 12000, days60: 8000, days90: 0, total: 65000 },
    { id: "2", vendor: "TechParts Inc", current: 89000, days30: 15000, days60: 0, days90: 0, total: 104000 },
    { id: "3", vendor: "Global Logistics", current: 34000, days30: 8000, days60: 4000, days90: 2300, total: 48300 },
    { id: "4", vendor: "Office Depot", current: 17200, days30: 15000, days60: 0, days90: 0, total: 32200 },
  ]);

  const filteredVendors = vendors.filter((v) =>
    v.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filteredVendors.reduce(
    (acc, v) => ({
      current: acc.current + v.current,
      days30: acc.days30 + v.days30,
      days60: acc.days60 + v.days60,
      days90: acc.days90 + v.days90,
      total: acc.total + v.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, total: 0 }
  );

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">AP Aging Report</h1>
        <p className="text-muted-foreground">Accounts payable by aging period</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Current (0-30)</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.current)}</p>
        </Card>
        <Card className="p-6 border-warning/20">
          <p className="text-sm text-muted-foreground mb-1">31-60 Days</p>
          <p className="text-2xl font-semibold text-warning">{formatCurrency(totals.days30)}</p>
        </Card>
        <Card className="p-6 border-warning/20">
          <p className="text-sm text-muted-foreground mb-1">61-90 Days</p>
          <p className="text-2xl font-semibold text-warning">{formatCurrency(totals.days60)}</p>
        </Card>
        <Card className="p-6 border-error/20">
          <p className="text-sm text-muted-foreground mb-1">90+ Days</p>
          <p className="text-2xl font-semibold text-error">{formatCurrency(totals.days90)}</p>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-panel border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Vendor</th>
                <th className="text-right p-4 text-sm font-medium">Current</th>
                <th className="text-right p-4 text-sm font-medium">31-60</th>
                <th className="text-right p-4 text-sm font-medium">61-90</th>
                <th className="text-right p-4 text-sm font-medium">90+</th>
                <th className="text-right p-4 text-sm font-medium">Total</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr 
                  key={vendor.id} 
                  className="border-b border-border hover:bg-panel transition-fast cursor-pointer"
                  onClick={() => navigate(`/finance/vendors/${vendor.id}`)}
                >
                  <td className="p-4 font-medium">{vendor.vendor}</td>
                  <td className="p-4 text-right">{formatCurrency(vendor.current)}</td>
                  <td className="p-4 text-right text-warning">{formatCurrency(vendor.days30)}</td>
                  <td className="p-4 text-right text-warning">{formatCurrency(vendor.days60)}</td>
                  <td className="p-4 text-right text-error">{formatCurrency(vendor.days90)}</td>
                  <td className="p-4 text-right font-semibold">{formatCurrency(vendor.total)}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
