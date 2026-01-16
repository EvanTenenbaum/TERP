/**
 * ShrinkageReport Component
 * Sprint 4 Track A: 4.A.8 WS-009 - Shrinkage Tracking
 *
 * Features:
 * - Detect unexplained inventory losses
 * - Show shrinkage by reason and category
 * - Highlight suspicious events
 * - Detailed shrinkage item list
 */

import { memo, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

const REASON_COLORS: Record<string, string> = {
  DAMAGED: "#f97316",
  EXPIRED: "#eab308",
  LOST: "#ef4444",
  THEFT: "#dc2626",
  COUNT_DISCREPANCY: "#3b82f6",
  QUALITY_ISSUE: "#8b5cf6",
  REWEIGH: "#22c55e",
  OTHER: "#6b7280",
  "Not specified": "#9ca3af",
};

interface ShrinkageReportProps {
  variant?: "full" | "summary";
}

export const ShrinkageReport = memo(function ShrinkageReport({
  variant = "full",
}: ShrinkageReportProps) {
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [category, setCategory] = useState<string>("all");
  const [minShrinkage, setMinShrinkage] = useState<number>(0);

  const { data, isLoading, refetch } = trpc.inventoryMovements.getShrinkageReport.useQuery({
    startDate,
    endDate,
    category: category !== "all" ? category : undefined,
    minShrinkage,
  });

  const chartDataByReason = useMemo(() => {
    if (!data) return [];
    return data.byReason.map((item, index) => ({
      name: item.reason,
      value: item.totalQty,
      count: item.count,
      fill: REASON_COLORS[item.reason] || COLORS[index % COLORS.length],
    }));
  }, [data]);

  const chartDataByCategory = useMemo(() => {
    if (!data) return [];
    return data.byCategory.slice(0, 10).map((item, index) => ({
      name: item.category,
      value: item.totalQty,
      count: item.count,
      fill: COLORS[index % COLORS.length],
    }));
  }, [data]);

  const exportToCsv = () => {
    if (!data) return;

    const headers = ["Date", "SKU", "Product", "Category", "Qty Lost", "Reason", "Notes", "Performed By", "Suspicious"];
    const rows = data.items.map(item => [
      format(new Date(item.date), "yyyy-MM-dd HH:mm"),
      item.sku,
      item.productName,
      item.category || "",
      item.shrinkageQty.toString(),
      item.reason,
      item.notes || "",
      item.performedBy || "",
      item.isSuspicious ? "Yes" : "No",
    ]);

    const csvContent = [headers.join(","), ...rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shrinkage-report-${startDate}-to-${endDate}.csv`);
    link.click();
  };

  if (variant === "summary") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Shrinkage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Events</span>
                <Badge variant="outline">{data?.summary.totalShrinkageEvents || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Qty Lost</span>
                <Badge variant="destructive">
                  {data?.summary.totalShrinkageQty?.toFixed(0) || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Suspicious</span>
                <Badge variant={data?.summary.suspiciousEvents ? "destructive" : "outline"}>
                  {data?.summary.suspiciousEvents || 0}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setLocation("/reports/shrinkage")}
              >
                View Full Report
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Shrinkage Report
          </h2>
          <p className="text-muted-foreground">
            Track and analyze inventory losses and discrepancies
          </p>
        </div>
        <Button variant="outline" onClick={exportToCsv} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data?.byCategory.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Min Quantity</Label>
              <Input
                type="number"
                value={minShrinkage}
                onChange={(e) => setMinShrinkage(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold">
                      {data?.summary.totalShrinkageEvents || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Qty Lost</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data?.summary.totalShrinkageQty?.toFixed(0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Suspicious Events</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data?.summary.suspiciousEvents || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* By Reason */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shrinkage by Reason</CardTitle>
              </CardHeader>
              <CardContent>
                {chartDataByReason.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No data</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartDataByReason}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {chartDataByReason.map((entry, index) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toFixed(0)} units`,
                            "Quantity",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shrinkage by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {chartDataByCategory.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No data</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataByCategory} layout="vertical">
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toFixed(0)} units`,
                            "Quantity Lost",
                          ]}
                        />
                        <Bar dataKey="value" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Shrinkage Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Lost</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No shrinkage events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.slice(0, 50).map((item) => (
                      <TableRow
                        key={item.id}
                        className={item.isSuspicious ? "bg-red-50" : ""}
                      >
                        <TableCell className="text-sm">
                          {format(new Date(item.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-bold text-red-600">
                            -{item.shrinkageQty.toFixed(0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${
                              item.reason === "THEFT" || item.reason === "LOST"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }`}
                          >
                            {item.reason}
                          </Badge>
                          {item.isSuspicious && (
                            <AlertCircle className="h-4 w-4 text-red-500 inline ml-1" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.performedBy || "System"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {item.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
});
