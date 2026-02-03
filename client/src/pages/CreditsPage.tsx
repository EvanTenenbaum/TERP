/**
 * Credits Management Page
 * Wave 5C: Comprehensive credit management UI
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Plus,
  Search,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type CreditStatus = "ACTIVE" | "PARTIALLY_USED" | "FULLY_USED" | "EXPIRED" | "VOID";
type CreditReason = "RETURN" | "PRICE_ADJUSTMENT" | "GOODWILL" | "PROMOTIONAL" | "REFUND" | "DAMAGE_CLAIM" | "BILLING_ERROR" | "OTHER";

const statusColors: Record<CreditStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PARTIALLY_USED: "bg-blue-100 text-blue-800",
  FULLY_USED: "bg-gray-100 text-gray-800",
  EXPIRED: "bg-yellow-100 text-yellow-800",
  VOID: "bg-red-100 text-red-800",
};

const reasonLabels: Record<CreditReason, string> = {
  RETURN: "Return",
  PRICE_ADJUSTMENT: "Price Adjustment",
  GOODWILL: "Goodwill",
  PROMOTIONAL: "Promotional",
  REFUND: "Refund",
  DAMAGE_CLAIM: "Damage Claim",
  BILLING_ERROR: "Billing Error",
  OTHER: "Other",
};

export default function CreditsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditStatus | "all">("all");
  const [issueCreditOpen, setIssueCreditOpen] = useState(false);
  const [applyCreditOpen, setApplyCreditOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  
  // UI-CONFIRM-DIALOG: State for void confirmation dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [creditToVoid, setCreditToVoid] = useState<number | null>(null);

  // Form state for issuing credit
  const [newCredit, setNewCredit] = useState({
    clientId: "",
    amount: "",
    reason: "" as CreditReason | "",
    description: "",
    notes: "",
  });

  // Form state for applying credit
  const [applyForm, setApplyForm] = useState({
    invoiceId: "",
    amount: "",
    notes: "",
  });

  // Fetch credits data
  const { data: credits, isLoading, refetch } = trpc.credits.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    searchTerm: searchTerm || undefined,
    limit: 50,
  });

  const { data: summary } = trpc.credits.getSummary.useQuery();

  // Mutations
  const issueCreditMutation = trpc.credits.issue.useMutation({
    onSuccess: () => {
      toast({ title: "Credit issued successfully" });
      setIssueCreditOpen(false);
      setNewCredit({ clientId: "", amount: "", reason: "", description: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error issuing credit", description: error.message, variant: "destructive" });
    },
  });

  const applyCreditMutation = trpc.credits.applyCredit.useMutation({
    onSuccess: () => {
      toast({ title: "Credit applied successfully" });
      setApplyCreditOpen(false);
      setApplyForm({ invoiceId: "", amount: "", notes: "" });
      setSelectedCredit(null);
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error applying credit", description: error.message, variant: "destructive" });
    },
  });

  const voidCreditMutation = trpc.credits.void.useMutation({
    onSuccess: () => {
      toast({ title: "Credit voided successfully" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error voiding credit", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return format(new Date(date), "MMM dd, yyyy");
  };

  const handleIssueCredit = () => {
    if (!newCredit.clientId || !newCredit.amount || !newCredit.reason) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    issueCreditMutation.mutate({
      clientId: parseInt(newCredit.clientId),
      amount: parseFloat(newCredit.amount),
      reason: newCredit.reason as CreditReason,
      description: newCredit.description || undefined,
      notes: newCredit.notes || undefined,
    });
  };

  const handleApplyCredit = () => {
    if (!selectedCredit || !applyForm.invoiceId || !applyForm.amount) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    applyCreditMutation.mutate({
      creditId: selectedCredit.id,
      invoiceId: parseInt(applyForm.invoiceId),
      amountToApply: applyForm.amount,
      notes: applyForm.notes || undefined,
    });
  };

  const openApplyDialog = (credit: any) => {
    setSelectedCredit(credit);
    setApplyForm({ invoiceId: "", amount: credit.amountRemaining.toString(), notes: "" });
    setApplyCreditOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Dashboard" to="/" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credits Management</h1>
          <p className="text-muted-foreground mt-1">
            Issue, track, and apply customer credits
          </p>
        </div>
        <Button onClick={() => setIssueCreditOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Issue Credit
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits Issued</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalCreditsIssued)}</div>
              <p className="text-xs text-muted-foreground">{summary.creditCount} credits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalCreditsRemaining)}
              </div>
              <p className="text-xs text-muted-foreground">Can be applied to invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalCreditsUsed)}
              </div>
              <p className="text-xs text-muted-foreground">Applied to invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(summary.expiringWithin30Days.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.expiringWithin30Days.count} credits in next 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credits Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Credits</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search credits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CreditStatus | "all")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PARTIALLY_USED">Partially Used</SelectItem>
                  <SelectItem value="FULLY_USED">Fully Used</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading credits...</p>
          ) : credits?.items && credits.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.items.map((credit: any) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-mono">{credit.creditNumber}</TableCell>
                    <TableCell>{credit.clientName || `Client #${credit.clientId}`}</TableCell>
                    <TableCell>
                      {credit.creditReason ? reasonLabels[credit.creditReason as CreditReason] || credit.creditReason : "-"}
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(credit.creditAmount)}</TableCell>
                    <TableCell className="font-mono font-bold">
                      {formatCurrency(credit.amountRemaining)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[credit.creditStatus as CreditStatus]}>
                        {credit.creditStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(credit.expirationDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(credit.creditStatus === "ACTIVE" || credit.creditStatus === "PARTIALLY_USED") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openApplyDialog(credit)}
                            >
                              Apply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // UI-CONFIRM-DIALOG: Show confirm dialog instead of confirm()
                                setCreditToVoid(credit.id);
                                setVoidDialogOpen(true);
                              }}
                            >
                              Void
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No credits found</p>
          )}
        </CardContent>
      </Card>

      {/* Issue Credit Dialog */}
      <Dialog open={issueCreditOpen} onOpenChange={setIssueCreditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Issue Credit</DialogTitle>
            <DialogDescription>
              Create a new credit for a customer
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                type="number"
                value={newCredit.clientId}
                onChange={(e) => setNewCredit({ ...newCredit, clientId: e.target.value })}
                placeholder="Enter client ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newCredit.amount}
                onChange={(e) => setNewCredit({ ...newCredit, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select
                value={newCredit.reason}
                onValueChange={(v) => setNewCredit({ ...newCredit, reason: v as CreditReason })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reasonLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newCredit.description}
                onChange={(e) => setNewCredit({ ...newCredit, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newCredit.notes}
                onChange={(e) => setNewCredit({ ...newCredit, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueCreditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueCredit} disabled={issueCreditMutation.isPending}>
              {issueCreditMutation.isPending ? "Issuing..." : "Issue Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Credit Dialog */}
      <Dialog open={applyCreditOpen} onOpenChange={setApplyCreditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply Credit</DialogTitle>
            <DialogDescription>
              Apply credit {selectedCredit?.creditNumber} to an invoice
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Available: <span className="font-bold">{formatCurrency(selectedCredit?.amountRemaining)}</span>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceId">Invoice ID *</Label>
              <Input
                id="invoiceId"
                type="number"
                value={applyForm.invoiceId}
                onChange={(e) => setApplyForm({ ...applyForm, invoiceId: e.target.value })}
                placeholder="Enter invoice ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="applyAmount">Amount to Apply *</Label>
              <Input
                id="applyAmount"
                type="number"
                step="0.01"
                value={applyForm.amount}
                onChange={(e) => setApplyForm({ ...applyForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="applyNotes">Notes</Label>
              <Textarea
                id="applyNotes"
                value={applyForm.notes}
                onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })}
                placeholder="Notes for this application"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyCreditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyCredit} disabled={applyCreditMutation.isPending}>
              {applyCreditMutation.isPending ? "Applying..." : "Apply Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* UI-CONFIRM-DIALOG: Void Credit Confirmation Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Credit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this credit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreditToVoid(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (creditToVoid !== null) {
                  voidCreditMutation.mutate({ creditId: creditToVoid });
                  setCreditToVoid(null);
                }
                setVoidDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void Credit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
