import { ArrowLeft, Plus, Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const salesData = [
  { month: "Jan", quotes: 45, converted: 23 },
  { month: "Feb", quotes: 52, converted: 28 },
  { month: "Mar", quotes: 48, converted: 25 },
  { month: "Apr", quotes: 61, converted: 34 },
];

const revenueData = [
  { month: "Jan", revenue: 245000 },
  { month: "Feb", revenue: 298000 },
  { month: "Mar", revenue: 267000 },
  { month: "Apr", revenue: 332000 },
];

export default function DashboardDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const dashboard = {
    id,
    name: "Executive Overview",
    description: "High-level KPIs and trends",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/analytics/dashboards")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">{dashboard.name}</h1>
          <p className="text-sm text-muted-foreground">{dashboard.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold">$1.14M</p>
          <p className="text-xs text-success mt-1">↑ 12.5%</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Active Quotes</p>
          <p className="text-2xl font-semibold">34</p>
          <p className="text-xs text-success mt-1">↑ 8.2%</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
          <p className="text-2xl font-semibold">56%</p>
          <p className="text-xs text-warning mt-1">↓ 2.1%</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Avg. Quote Value</p>
          <p className="text-2xl font-semibold">$33.5K</p>
          <p className="text-xs text-success mt-1">↑ 5.3%</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4">Quote Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--mid))" />
              <YAxis stroke="hsl(var(--mid))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--c-panel))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="quotes" fill="hsl(var(--c-brand))" />
              <Bar dataKey="converted" fill="hsl(var(--c-success))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--mid))" />
              <YAxis stroke="hsl(var(--mid))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--c-panel))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--c-brand))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
