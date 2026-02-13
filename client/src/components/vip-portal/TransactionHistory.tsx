/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  DollarSign, 
  FileCheck,
  ShoppingCart,
  RefreshCw,
  CreditCard
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TransactionHistoryProps {
  clientId: number;
  config: any;
}

export function TransactionHistory({ clientId, config }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: txData } = trpc.vipPortal.transactions.getHistory.useQuery({
    clientId,
    search: searchTerm || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "INVOICE":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "PAYMENT":
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case "QUOTE":
        return <FileCheck className="h-4 w-4 text-purple-500" />;
      case "ORDER":
        return <ShoppingCart className="h-4 w-4 text-orange-500" />;
      case "REFUND":
        return <RefreshCw className="h-4 w-4 text-red-500" />;
      case "CREDIT":
        return <CreditCard className="h-4 w-4 text-teal-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PAID":
        return "secondary";
      case "OVERDUE":
        return "destructive";
      case "PARTIAL":
        return "outline";
      default:
        return "default";
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case "PAYMENT":
      case "REFUND":
        return "text-green-600";
      case "INVOICE":
      case "ORDER":
        return "text-blue-600";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Transaction History</h2>
        <p className="text-sm text-muted-foreground">Complete record of all your transactions</p>
      </div>

      {/* Summary Cards */}
      {(config as any).featuresConfig?.transactionHistory?.showSummaryTotals && (txData as any)?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Transactions</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                {(txData as any)?.summary?.totalCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Value</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                ${(txData as any)?.summary?.totalValue?.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Last Transaction</CardDescription>
              <CardTitle className="text-sm md:text-base">
                {(txData as any)?.summary?.lastTransactionDate 
                  ? new Date((txData as any).summary.lastTransactionDate).toLocaleDateString()
                  : "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      {(config as any).featuresConfig?.transactionHistory?.allowFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INVOICE">Invoices</SelectItem>
                  <SelectItem value="PAYMENT">Payments</SelectItem>
                  <SelectItem value="QUOTE">Quotes</SelectItem>
                  <SelectItem value="ORDER">Orders</SelectItem>
                  <SelectItem value="REFUND">Refunds</SelectItem>
                  <SelectItem value="CREDIT">Credits</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List - Mobile-First Card Layout */}
      <div className="space-y-3">
        {txData?.transactions && txData.transactions.length > 0 ? (
          txData.transactions.map((tx) => (
            <Card key={tx.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                      {getTransactionIcon(tx.transactionType)}
                      <span className="truncate">{tx.transactionNumber || `#${tx.id}`}</span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {new Date(tx.transactionDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="flex-shrink-0">
                      {tx.transactionType}
                    </Badge>
                    {tx.paymentStatus && (
                      <Badge variant={getStatusVariant(tx.paymentStatus)} className="flex-shrink-0">
                        {tx.paymentStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Financial Details */}
                {config.featuresConfig?.transactionHistory?.showTransactionDetails && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Amount</p>
                      <p className={`font-medium text-base ${getAmountColor(tx.transactionType)}`}>
                        ${tx.amount.toLocaleString()}
                      </p>
                    </div>
                    {tx.paymentAmount && (
                      <div>
                        <p className="text-muted-foreground text-xs">Payment Amount</p>
                        <p className="font-medium text-base text-green-600">
                          ${tx.paymentAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {tx.paymentDate && (
                      <div>
                        <p className="text-muted-foreground text-xs">Payment Date</p>
                        <p className="font-medium">
                          {new Date(tx.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {tx.notes && config.featuresConfig?.transactionHistory?.showTransactionDetails && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm line-clamp-2">{tx.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {config.featuresConfig?.transactionHistory?.allowPdfDownload && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                  ? "No transactions match your filters"
                  : "No transaction history available"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
