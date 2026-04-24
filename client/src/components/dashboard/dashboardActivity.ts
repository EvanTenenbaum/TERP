export const DASHBOARD_ACTIVITY_STORAGE_KEY =
  "terp.simpleDashboard.lastVisitedAt";

const ACTIVITY_FALLBACK_HOURS = 24;
const EXPECTED_DELIVERY_WINDOW_DAYS = 7;

const pendingIntakeStatuses = new Set(["SENT", "CONFIRMED", "RECEIVING"]);
const pendingFulfillmentStatuses = new Set([
  "CONFIRMED",
  "PENDING",
  "READY_FOR_PACKING",
  "PACKED",
]);
const excludedAppointmentStatuses = new Set(["rejected", "cancelled"]);

export type DashboardOrderSummary = {
  id: number;
  orderNumber?: string | null;
  orderType?: string | null;
  isDraft?: boolean | null;
  client?: { name?: string | null } | null;
  fulfillmentStatus?: string | null;
  createdAt?: string | Date | null;
};

export type DashboardPaymentSummary = {
  id: number;
  paymentNumber?: string | null;
  paymentType?: string | null;
  amount?: string | number | null;
  paymentDate?: string | Date | null;
  createdAt?: string | Date | null;
};

export type DashboardPurchaseOrderSummary = {
  id: number;
  poNumber?: string | null;
  purchaseOrderStatus?: string | null;
  expectedDeliveryDate?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type DashboardAppointmentSummary = {
  id: number;
  clientName?: string | null;
  requestedSlot?: string | Date | null;
  status?: string | null;
};

export type DashboardOperationalKpis = {
  expectedDeliveries: number;
  pendingFulfillment: number;
  appointmentsToday: number;
  nextExpectedDeliveryLabel: string;
  nextAppointmentLabel: string;
};

export type DashboardActivityItem = {
  id: string;
  kind: "order" | "payment" | "intake";
  title: string;
  detail: string;
  timestamp: string;
};

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatShortDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "Date TBD";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "Time TBD";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value: string | number | null | undefined): string {
  const amount =
    typeof value === "string"
      ? Number.parseFloat(value)
      : typeof value === "number"
        ? value
        : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function humanizeStatus(value: string | null | undefined): string {
  if (!value) return "Updated";

  return value
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isToday(
  value: string | Date | null | undefined,
  todayStart: Date,
  tomorrowStart: Date
): boolean {
  const date = parseDate(value);
  if (!date) return false;
  return date >= todayStart && date < tomorrowStart;
}

export function getDashboardActivityCutoff(
  lastVisitedAt: string | null | undefined,
  now: Date = new Date()
): Date {
  const parsed = parseDate(lastVisitedAt);

  if (parsed) {
    return parsed;
  }

  return new Date(now.getTime() - ACTIVITY_FALLBACK_HOURS * 60 * 60 * 1000);
}

export function buildDashboardOperationalKpis(input: {
  orders: DashboardOrderSummary[];
  purchaseOrders: DashboardPurchaseOrderSummary[];
  appointments: DashboardAppointmentSummary[];
  now?: Date;
}): DashboardOperationalKpis {
  const now = input.now ?? new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const deliveryWindowEnd = new Date(
    todayStart.getTime() + EXPECTED_DELIVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const expectedDeliveries = input.purchaseOrders
    .filter(po =>
      pendingIntakeStatuses.has((po.purchaseOrderStatus ?? "").toUpperCase())
    )
    .filter(po => {
      const deliveryDate = parseDate(po.expectedDeliveryDate);
      return (
        deliveryDate !== null &&
        deliveryDate >= todayStart &&
        deliveryDate < deliveryWindowEnd
      );
    })
    .sort((left, right) => {
      const leftTime = parseDate(left.expectedDeliveryDate)?.getTime() ?? 0;
      const rightTime = parseDate(right.expectedDeliveryDate)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

  const pendingFulfillment = input.orders.filter(order => {
    if (order.isDraft || order.orderType !== "SALE") {
      return false;
    }

    return pendingFulfillmentStatuses.has(
      (order.fulfillmentStatus ?? "").toUpperCase()
    );
  }).length;

  const appointmentsToday = input.appointments
    .filter(
      appointment =>
        !excludedAppointmentStatuses.has((appointment.status ?? "").toLowerCase())
    )
    .filter(appointment =>
      isToday(appointment.requestedSlot, todayStart, tomorrowStart)
    )
    .sort((left, right) => {
      const leftTime = parseDate(left.requestedSlot)?.getTime() ?? 0;
      const rightTime = parseDate(right.requestedSlot)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

  const nextExpectedDelivery = expectedDeliveries[0];
  const nextAppointment = appointmentsToday[0];

  return {
    expectedDeliveries: expectedDeliveries.length,
    pendingFulfillment,
    appointmentsToday: appointmentsToday.length,
    nextExpectedDeliveryLabel: nextExpectedDelivery
      ? `Next due ${formatShortDate(nextExpectedDelivery.expectedDeliveryDate)}`
      : "No deliveries due this week",
    nextAppointmentLabel: nextAppointment
      ? `Next at ${formatTime(nextAppointment.requestedSlot)}`
      : "No appointments scheduled",
  };
}

export function buildDashboardActivityFeed(input: {
  orders: DashboardOrderSummary[];
  payments: DashboardPaymentSummary[];
  purchaseOrders: DashboardPurchaseOrderSummary[];
  lastVisitedAt?: string | null;
  now?: Date;
  maxItems?: number;
}): DashboardActivityItem[] {
  const cutoff = getDashboardActivityCutoff(input.lastVisitedAt, input.now);
  const maxItems = input.maxItems ?? 6;

  const orderItems = input.orders
    .filter(order => order.orderType === "SALE" && !order.isDraft)
    .map(order => {
      const createdAt = parseDate(order.createdAt);
      if (!createdAt || createdAt < cutoff) {
        return null;
      }

      return {
        id: `order-${order.id}`,
        kind: "order" as const,
        title: `New order ${order.orderNumber ?? `#${order.id}`}`,
        detail: [
          order.client?.name?.trim() || "Client not set",
          humanizeStatus(order.fulfillmentStatus),
        ].join(" · "),
        timestamp: createdAt.toISOString(),
      };
    })
    .filter(isPresent);

  const paymentItems = input.payments
    .map(payment => {
      const activityDate = parseDate(payment.createdAt) ?? parseDate(payment.paymentDate);
      if (!activityDate || activityDate < cutoff) {
        return null;
      }

      const direction =
        (payment.paymentType ?? "").toUpperCase() === "SENT"
          ? "Payment sent"
          : "Payment received";

      return {
        id: `payment-${payment.id}`,
        kind: "payment" as const,
        title: `${direction} ${payment.paymentNumber ?? `#${payment.id}`}`,
        detail: formatCurrency(payment.amount),
        timestamp: activityDate.toISOString(),
      };
    })
    .filter(isPresent);

  const intakeItems = input.purchaseOrders
    .map(po => {
      const activityDate = parseDate(po.updatedAt) ?? parseDate(po.createdAt);
      if (!activityDate || activityDate < cutoff) {
        return null;
      }

      const status = (po.purchaseOrderStatus ?? "").toUpperCase();
      if (!pendingIntakeStatuses.has(status) && status !== "RECEIVED") {
        return null;
      }

      return {
        id: `intake-${po.id}`,
        kind: "intake" as const,
        title: `Intake activity ${po.poNumber ?? `#${po.id}`}`,
        detail:
          po.expectedDeliveryDate !== null &&
          po.expectedDeliveryDate !== undefined
            ? `${humanizeStatus(po.purchaseOrderStatus)} · due ${formatShortDate(po.expectedDeliveryDate)}`
            : humanizeStatus(po.purchaseOrderStatus),
        timestamp: activityDate.toISOString(),
      };
    })
    .filter(isPresent);

  return [...orderItems, ...paymentItems, ...intakeItems]
    .sort(
      (left, right) =>
        (parseDate(right.timestamp)?.getTime() ?? 0) -
        (parseDate(left.timestamp)?.getTime() ?? 0)
    )
    .slice(0, maxItems);
}
