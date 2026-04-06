import { describe, expect, it } from "vitest";
import {
  buildConfirmedQueryInput,
  buildDraftQueryInput,
  canViewOrderCogsDetails,
  canDownloadInvoice,
  canGenerateInvoice,
  getMakePaymentRoute,
  getDisplayOrderNumber,
  parseDeepLinkedOrderId,
  resolveOrderInvoiceId,
  resolveDeepLinkedOrderSelection,
} from "./OrdersWorkSurface";

describe("buildDraftQueryInput", () => {
  it("keeps the orders draft tab constrained to sales drafts", () => {
    expect(buildDraftQueryInput()).toEqual({
      orderType: "SALE",
      isDraft: true,
    });
  });
});

describe("buildConfirmedQueryInput", () => {
  it("always constrains confirmed orders to sales", () => {
    expect(buildConfirmedQueryInput()).toEqual({
      orderType: "SALE",
      isDraft: false,
    });
  });

  it("preserves the selected fulfillment filter for sales only", () => {
    expect(buildConfirmedQueryInput("SHIPPED")).toEqual({
      orderType: "SALE",
      isDraft: false,
      fulfillmentStatus: "SHIPPED",
    });
  });
});

describe("getDisplayOrderNumber", () => {
  it("shows draft sales with a draft prefix", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "S-1773258139432",
        isDraft: true,
        orderType: "SALE",
      })
    ).toBe("D-1773258139432");
  });

  it("keeps draft quotes on a quote prefix", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "Q-1772732286605",
        isDraft: true,
        orderType: "QUOTE",
      })
    ).toBe("Q-1772732286605");
  });

  it("normalizes legacy confirmed sale prefixes to sales", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "D-1772572680223",
        isDraft: false,
        orderType: "SALE",
      })
    ).toBe("S-1772572680223");
  });
});

describe("parseDeepLinkedOrderId", () => {
  it("parses an id query param from workspace deep links", () => {
    expect(parseDeepLinkedOrderId("?tab=orders&id=618")).toBe(618);
  });

  it("falls back to orderId query params used by accounting handoffs", () => {
    expect(parseDeepLinkedOrderId("?tab=payments&orderId=77")).toBe(77);
  });

  it("rejects invalid deep-link values", () => {
    expect(parseDeepLinkedOrderId("?tab=orders&id=not-a-number")).toBeNull();
    expect(parseDeepLinkedOrderId("?tab=orders&id=0")).toBeNull();
  });
});

describe("resolveDeepLinkedOrderSelection", () => {
  it("prefers confirmed orders when the deep link matches a confirmed sale", () => {
    expect(
      resolveDeepLinkedOrderSelection({
        orderId: 618,
        draftOrders: [{ id: 12 }],
        confirmedOrders: [{ id: 618 }],
      })
    ).toEqual({
      activeTab: "confirmed",
      selectedOrderId: 618,
    });
  });

  it("opens the draft tab when the deep link matches a draft order", () => {
    expect(
      resolveDeepLinkedOrderSelection({
        orderId: 41,
        draftOrders: [{ id: 41 }],
        confirmedOrders: [{ id: 618 }],
      })
    ).toEqual({
      activeTab: "draft",
      selectedOrderId: 41,
    });
  });

  it("returns null when the deep-linked order is not present", () => {
    expect(
      resolveDeepLinkedOrderSelection({
        orderId: 999,
        draftOrders: [{ id: 41 }],
        confirmedOrders: [{ id: 618 }],
      })
    ).toBeNull();
  });
});

describe("canDownloadInvoice", () => {
  it("allows invoice download only when accounting access and an invoice id are present", () => {
    expect(canDownloadInvoice(12, true)).toBe(true);
    expect(canDownloadInvoice(null, true)).toBe(false);
    expect(canDownloadInvoice(12, false)).toBe(false);
    expect(canDownloadInvoice(null, false)).toBe(false);
  });
});

describe("resolveOrderInvoiceId", () => {
  it("prefers a direct order invoice id before linked reference fallbacks", () => {
    expect(resolveOrderInvoiceId(12, 44)).toBe(12);
  });

  it("falls back to a linked invoice id when the order record is stale", () => {
    expect(resolveOrderInvoiceId(null, 44)).toBe(44);
  });

  it("returns null when neither source provides a valid invoice id", () => {
    expect(resolveOrderInvoiceId(null, null)).toBeNull();
    expect(resolveOrderInvoiceId(0, -1)).toBeNull();
  });
});

describe("canViewOrderCogsDetails", () => {
  it("only exposes COGS inspector content when display settings confirm access", () => {
    expect(
      canViewOrderCogsDetails({
        display: { canViewCogsData: true },
      })
    ).toBe(true);
    expect(
      canViewOrderCogsDetails({
        display: { canViewCogsData: false },
      })
    ).toBe(false);
    expect(canViewOrderCogsDetails(undefined)).toBe(false);
  });
});

describe("canGenerateInvoice", () => {
  it("requires accounting create permission before surfacing invoice generation", () => {
    expect(
      canGenerateInvoice(
        {
          orderType: "SALE",
          invoiceId: null,
          fulfillmentStatus: "PACKED",
        },
        true
      )
    ).toBe(true);

    expect(
      canGenerateInvoice(
        {
          orderType: "SALE",
          invoiceId: null,
          fulfillmentStatus: "PACKED",
        },
        false
      )
    ).toBe(false);
  });

  it("blocks invoice generation when the order is not invoice-eligible", () => {
    expect(
      canGenerateInvoice(
        {
          orderType: "QUOTE",
          invoiceId: null,
          fulfillmentStatus: "PACKED",
        },
        true
      )
    ).toBe(false);
    expect(
      canGenerateInvoice(
        {
          orderType: "SALE",
          invoiceId: 17,
          fulfillmentStatus: "PACKED",
        },
        true
      )
    ).toBe(false);
    expect(
      canGenerateInvoice(
        {
          orderType: "SALE",
          invoiceId: null,
          fulfillmentStatus: "READY_FOR_PACKING",
        },
        true
      )
    ).toBe(true);
    expect(
      canGenerateInvoice(
        {
          orderType: "SALE",
          invoiceId: null,
          fulfillmentStatus: "DELIVERED",
        },
        true
      )
    ).toBe(false);
  });
});

describe("getMakePaymentRoute", () => {
  it("routes sales payment handoffs into the canonical invoice workspace", () => {
    expect(getMakePaymentRoute({ id: 18, invoiceId: 91 })).toBe(
      "/accounting?tab=invoices&invoiceId=91&orderId=18&from=sales"
    );
  });

  it("suppresses dead-end payment routing when no invoice exists yet", () => {
    expect(getMakePaymentRoute({ id: 18, invoiceId: null })).toBeNull();
    expect(getMakePaymentRoute(null)).toBeNull();
  });
});
