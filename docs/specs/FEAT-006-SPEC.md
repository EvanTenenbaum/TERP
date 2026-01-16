# Specification: FEAT-006 - Full Referral (Couch Tax) Workflow

**Status:** Draft
**Priority:** MEDIUM
**Estimate:** 20h
**Module:** Sales / Clients / Accounting
**Dependencies:** FEAT-005 (Scheduling & Referral APIs)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The business tracks referral commissions ("couch tax") paid to individuals who bring in new customers or facilitate sales. The system needs a complete workflow to assign referrers to orders, calculate commissions by category, track accumulated balances, and process payouts.

**User Quote:**
> "in the couch tax section, which is basically the referee. It should have a default, either per unit by category... amounts that get credited to the referries account so that. The system user knows to pay them later."

## 2. User Stories

1. **As a sales rep**, I want to select a referrer when creating an order, so that they get credited.
2. **As an admin**, I want to configure commission rates by category, so that referrers are paid correctly.
3. **As an admin**, I want to see outstanding commissions by referrer, so that I can process payouts.
4. **As a referrer**, I want to track my accumulated commissions, so that I know what I'm owed.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Referrer selection on order form | Must Have |
| FR-02 | Commission rules configuration by category | Must Have |
| FR-03 | Automatic commission calculation on order delivery | Must Have |
| FR-04 | Referrer balance tracking | Must Have |
| FR-05 | Commission payout processing | Must Have |
| FR-06 | Referrer commission report | Should Have |

## 4. Technical Specification

### 4.1 Component: Referrer Selector

**File:** `/home/user/TERP/client/src/components/orders/ReferrerSelector.tsx`

```typescript
import { trpc } from "@/lib/trpc";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

interface ReferrerSelectorProps {
  value?: number;
  onChange: (referrerClientId: number | undefined) => void;
  estimatedCommission?: number;
}

export function ReferrerSelector({ value, onChange, estimatedCommission }: ReferrerSelectorProps) {
  // Fetch clients who are referrers (isReferee=true)
  const { data: referrers } = trpc.clients.list.useQuery({
    clientTypes: ["referee"],
    limit: 100,
  });

  const options = referrers?.map(r => ({
    value: r.id,
    label: r.name,
  })) || [];

  return (
    <div className="space-y-2">
      <Label>Referred By (Couch Tax)</Label>
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        placeholder="Select referrer..."
        allowClear
      />
      {value && estimatedCommission !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">
            Est. Commission: {formatCurrency(estimatedCommission)}
          </Badge>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Component: Commission Rules Manager

**File:** `/home/user/TERP/client/src/pages/admin/CommissionRulesPage.tsx`

```typescript
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function CommissionRulesPage() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const { data: rules, refetch } = trpc.referrals.getCommissionRules.useQuery();
  const upsertRule = trpc.referrals.upsertCommissionRule.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
    },
  });

  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: (r) => r.category || "All Categories" },
    { header: "Type", accessor: "commissionType" },
    {
      header: "Value",
      accessor: (r) => r.commissionType === "PER_UNIT"
        ? `${formatCurrency(r.commissionValue)}/unit`
        : `${r.commissionValue}%`
    },
    { header: "Min Order", accessor: (r) => formatCurrency(r.minOrderValue) },
    { header: "Active", accessor: (r) => r.isActive ? "Yes" : "No" },
    {
      header: "Actions",
      accessor: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => {
            setEditingRule(r);
            setShowEditModal(true);
          }}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Commission Rules</h1>
        <Button onClick={() => {
          setEditingRule(null);
          setShowEditModal(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <DataTable columns={columns} data={rules || []} />

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
          </DialogHeader>
          <CommissionRuleForm
            initialData={editingRule}
            onSubmit={(data) => upsertRule.mutate(data)}
            onCancel={() => setShowEditModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 4.3 Component: Referrer Payout Dashboard

**File:** `/home/user/TERP/client/src/pages/admin/ReferrerPayoutsPage.tsx`

```typescript
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export function ReferrerPayoutsPage() {
  const [selectedReferrer, setSelectedReferrer] = useState<number | null>(null);

  // Fetch all referrers with balances
  const { data: referrers } = trpc.clients.list.useQuery({
    clientTypes: ["referee"],
    hasDebt: undefined,
    limit: 100,
  });

  const referrersWithBalance = referrers?.filter(r => r.referralBalance > 0) || [];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Referrer List */}
      <div className="col-span-4 space-y-4">
        <h2 className="text-lg font-semibold">Referrers with Balance</h2>
        {referrersWithBalance.map(referrer => (
          <Card
            key={referrer.id}
            className={`cursor-pointer hover:border-primary ${selectedReferrer === referrer.id ? "border-primary" : ""}`}
            onClick={() => setSelectedReferrer(referrer.id)}
          >
            <CardContent className="py-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{referrer.name}</span>
                <Badge variant="secondary" className="font-mono">
                  {formatCurrency(referrer.referralBalance)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {referrersWithBalance.length === 0 && (
          <p className="text-muted-foreground">No outstanding balances</p>
        )}
      </div>

      {/* Referrer Detail */}
      <div className="col-span-8">
        {selectedReferrer ? (
          <ReferrerDetailPanel referrerClientId={selectedReferrer} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a referrer to view details
          </div>
        )}
      </div>
    </div>
  );
}

function ReferrerDetailPanel({ referrerClientId }: { referrerClientId: number }) {
  const { data: summary, refetch } = trpc.referrals.getReferrerSummary.useQuery({ referrerClientId });
  const processPayoutMutation = trpc.referrals.processCommissionPayout.useMutation({
    onSuccess: () => refetch(),
  });

  const [payoutAmount, setPayoutAmount] = useState("");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">{summary?.referrer.name}</h3>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(summary?.referrer.currentBalance || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-xl">{formatCurrency(summary?.referrer.totalEarned || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-xl">{formatCurrency(summary?.referrer.totalPaid || 0)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Process Payout */}
      <Card>
        <CardHeader>
          <h4 className="font-medium">Process Payout</h4>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            type="number"
            placeholder="Amount"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
          />
          <Button
            onClick={() => {
              processPayoutMutation.mutate({
                referrerClientId,
                amount: Number(payoutAmount),
                paymentMethod: "CASH",
              });
            }}
            disabled={!payoutAmount || Number(payoutAmount) <= 0}
          >
            Process Payout
          </Button>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <h4 className="font-medium">Commission History</h4>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Order", accessor: "orderNumber" },
              { header: "Date", accessor: (c) => new Date(c.orderDate).toLocaleDateString() },
              { header: "Customer", accessor: "customerName" },
              { header: "Amount", accessor: (c) => formatCurrency(c.commissionAmount) },
              { header: "Status", accessor: (c) => <Badge>{c.status}</Badge> },
            ]}
            data={summary?.commissions || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

## 5. UI/UX Specification

### 5.1 Wireframe - Order Form with Referrer

```
┌─────────────────────────────────────────┐
│ Order Details                           │
│ ┌─────────────────────────────────────┐ │
│ │ Referred By (Couch Tax)             │ │
│ │ [John Smith                    ▼]   │ │
│ │ Est. Commission: $45.00             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 5.2 Wireframe - Referrer Payouts

```
┌──────────────────┬──────────────────────────────────────┐
│ Referrers        │ John Smith                           │
│                  │ ┌──────────────────────────────────┐ │
│ John Smith  $450 │ │ Balance: $450  Earned: $2,100   │ │
│ Jane Doe    $120 │ │ Paid: $1,650                    │ │
│ Bob Wilson   $85 │ └──────────────────────────────────┘ │
│                  │                                      │
│                  │ Process Payout                       │
│                  │ [$___________] [Process]             │
│                  │                                      │
│                  │ Commission History                   │
│                  │ ┌─────────────────────────────────┐ │
│                  │ │ ORD-001 01/10 Acme   $45 PAID  │ │
│                  │ │ ORD-002 01/08 Beta   $30 PEND  │ │
│                  │ └─────────────────────────────────┘ │
└──────────────────┴──────────────────────────────────────┘
```

### 5.3 Acceptance Criteria

- [ ] Referrer can be selected on order creation
- [ ] Estimated commission shown based on order items
- [ ] Commission rules configurable by admin
- [ ] Commission credited when order delivered
- [ ] Referrer balance updates correctly
- [ ] Payout processing works and updates history

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
