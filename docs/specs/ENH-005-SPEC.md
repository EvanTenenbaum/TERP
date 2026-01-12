# Specification: ENH-005 - Full Scheduling Workflow UI

**Status:** Draft
**Priority:** MEDIUM
**Estimate:** 16h
**Module:** Frontend / Sales / Warehouse
**Dependencies:** FEAT-005 (Scheduling & Referral APIs)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The warehouse needs visibility into order pickup schedules to manage their pick/pack workflow effectively. Sales reps need the ability to set pickup dates and mark orders as "ASAP" to prioritize them in the queue.

**User Quote:**
> "pick up date should be able to be set, and if it's like ASAP or like now, then. That should affect the pick and pack queue"

## 2. User Stories

1. **As a sales rep**, I want to set a pickup date/time when creating an order.
2. **As a warehouse worker**, I want to see orders prioritized by pickup schedule.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Pickup date/time picker on order form | Must Have |
| FR-02 | "ASAP" toggle that prioritizes order | Must Have |
| FR-03 | Pick queue view sorted by schedule | Must Have |
| FR-04 | Visual indicators for ASAP vs scheduled | Must Have |

## 4. Technical Specification

### 4.1 Component: Pickup Scheduler

**File:** `/home/user/TERP/client/src/components/orders/PickupScheduler.tsx`

```typescript
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";

interface PickupSchedulerProps {
  value: {
    pickupDate?: Date;
    pickupTime?: string;
    isAsap: boolean;
  };
  onChange: (value: PickupSchedulerProps["value"]) => void;
}

export function PickupScheduler({ value, onChange }: PickupSchedulerProps) {
  const handleAsapToggle = (checked: boolean) => {
    onChange({
      ...value,
      isAsap: checked,
      pickupDate: checked ? undefined : value.pickupDate,
      pickupTime: checked ? undefined : value.pickupTime,
    });
  };

  return (
    <div className="space-y-4">
      {/* ASAP Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <div>
            <Label htmlFor="asap-toggle" className="font-medium">ASAP Pickup</Label>
            <p className="text-sm text-muted-foreground">Priority in pick queue</p>
          </div>
        </div>
        <Switch
          id="asap-toggle"
          checked={value.isAsap}
          onCheckedChange={handleAsapToggle}
        />
      </div>

      {/* Schedule Picker (hidden when ASAP) */}
      {!value.isAsap && (
        <div className="space-y-4 p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <Label className="font-medium">Schedule Pickup</Label>
          </div>

          <Calendar
            mode="single"
            selected={value.pickupDate}
            onSelect={(date) => onChange({ ...value, pickupDate: date })}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />

          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={value.pickupTime || ""}
              onChange={(e) => onChange({ ...value, pickupTime: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Preview Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Pickup:</span>
        {value.isAsap ? (
          <Badge variant="destructive" className="bg-orange-500">
            <Zap className="h-3 w-3 mr-1" />
            ASAP
          </Badge>
        ) : value.pickupDate ? (
          <Badge variant="outline">
            {value.pickupDate.toLocaleDateString()} {value.pickupTime || ""}
          </Badge>
        ) : (
          <Badge variant="secondary">Not scheduled</Badge>
        )}
      </div>
    </div>
  );
}
```

### 4.2 Component: Pick Queue View

**File:** `/home/user/TERP/client/src/components/warehouse/PickQueue.tsx`

```typescript
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Clock, CheckCircle } from "lucide-react";

export function PickQueue() {
  const { data: queue } = trpc.scheduling.getPickQueue.useQuery({
    date: new Date().toISOString().split("T")[0],
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={queue?.stats.totalOrders || 0} />
        <StatCard label="ASAP" value={queue?.stats.asapCount || 0} variant="warning" />
        <StatCard label="Scheduled" value={queue?.stats.scheduledCount || 0} />
        <StatCard label="In Progress" value={queue?.stats.inProgressCount || 0} variant="info" />
      </div>

      {/* Queue List */}
      <div className="space-y-2">
        {queue?.queue.map((order, i) => (
          <Card key={order.orderId} className={order.isAsap ? "border-orange-300 bg-orange-50" : ""}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.orderNumber}</span>
                      {order.isAsap ? (
                        <Badge variant="destructive" className="bg-orange-500">
                          <Zap className="h-3 w-3 mr-1" />
                          ASAP
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {order.pickupTime || order.pickupDate}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{order.clientName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm">{order.itemCount} items</span>
                    <p className="text-xs text-muted-foreground">~{order.estimatedPickTime} min</p>
                  </div>
                  <Button size="sm">Start Pick</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## 5. UI/UX Specification

### 5.1 Wireframe - Pick Queue

```
┌─────────────────────────────────────────────────────────────┐
│ Pick Queue                                    January 12    │
├─────────────────────────────────────────────────────────────┤
│ Total: 12 │ ASAP: 3 │ Scheduled: 9 │ In Progress: 2        │
├─────────────────────────────────────────────────────────────┤
│ #1 ┌───────────────────────────────────────────────────┐   │
│    │ ORD-001 [ASAP⚡]           Acme Corp              │   │
│    │ 8 items • ~15 min                    [Start Pick]│   │
│    └───────────────────────────────────────────────────┘   │
│ #2 ┌───────────────────────────────────────────────────┐   │
│    │ ORD-002 [ASAP⚡]           Beta LLC               │   │
│    │ 3 items • ~5 min                     [Start Pick]│   │
│    └───────────────────────────────────────────────────┘   │
│ #3 ┌───────────────────────────────────────────────────┐   │
│    │ ORD-003 [2:00 PM]          Gamma Inc              │   │
│    │ 12 items • ~25 min                   [Start Pick]│   │
│    └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria (UI)

- [ ] ASAP toggle works correctly
- [ ] Date/time picker hidden when ASAP selected
- [ ] Pick queue shows ASAP orders first
- [ ] Visual distinction between ASAP and scheduled orders
- [ ] Queue updates in real-time

## 6. Testing Requirements

### 6.1 E2E Tests
- [ ] Set pickup schedule on order
- [ ] View queue sorted correctly

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
