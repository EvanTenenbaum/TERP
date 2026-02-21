import {
  createProductIntakeDraftFromPO,
  getProductIntakeDraft,
  listProductIntakeDrafts,
  markProductIntakeDraftReceived,
  markProductIntakeDraftVoided,
  setProductIntakeDraftError,
  upsertProductIntakeDraft,
} from "@/lib/productIntakeDrafts";

describe("productIntakeDrafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const buildDraft = () =>
    createProductIntakeDraftFromPO({
      poId: 1001,
      poNumber: "PO-1001",
      vendorId: 15,
      vendorName: "Golden Supplier",
      warehouseId: 3,
      warehouseName: "Main Warehouse",
      lines: [
        {
          id: "line-1",
          poItemId: 5001,
          productId: 301,
          productName: "Blue Dream 3.5g",
          brandName: "Golden Supplier",
          strainName: "Blue Dream",
          category: "Flower",
          subcategory: "Jar",
          packaging: "Jar",
          quantityOrdered: 10,
          quantityReceived: 0,
          intakeQty: 8,
          unitCost: 5,
          locationId: 3,
          locationName: "Main Warehouse",
          grade: "A",
        },
      ],
    });

  it("creates and persists a draft", () => {
    const draft = buildDraft();
    upsertProductIntakeDraft(draft, 8);

    const saved = getProductIntakeDraft(draft.id, 8);
    expect(saved).not.toBeNull();
    expect(saved?.status).toBe("DRAFT");
    expect(saved?.idempotencyKey).toContain(`receive-${draft.id}`);
  });

  it("increments version on each upsert", () => {
    const draft = buildDraft();
    const first = upsertProductIntakeDraft(draft, 8);
    const second = upsertProductIntakeDraft(first, 8);

    expect(first.version).toBe(2);
    expect(second.version).toBe(3);
  });

  it("marks draft as received and records lines", () => {
    const draft = buildDraft();
    upsertProductIntakeDraft(draft, 8);

    const received = markProductIntakeDraftReceived(
      draft.id,
      {
        lines: [
          {
            ...draft.lines[0],
            batchId: 777,
            sku: "BD-20260219-001",
          },
        ],
      },
      8
    );

    expect(received?.status).toBe("RECEIVED");
    expect(received?.receivedAt).toBeTruthy();
    expect(received?.lines[0]?.batchId).toBe(777);
  });

  it("marks draft as voided", () => {
    const draft = buildDraft();
    upsertProductIntakeDraft(draft, 8);

    const voided = markProductIntakeDraftVoided(draft.id, 8);

    expect(voided?.status).toBe("VOIDED");
    expect(voided?.voidedAt).toBeTruthy();
  });

  it("stores last error for a draft", () => {
    const draft = buildDraft();
    upsertProductIntakeDraft(draft, 8);

    const withError = setProductIntakeDraftError(draft.id, "Receive failed", 8);

    expect(withError?.lastError).toBe("Receive failed");
  });

  it("isolates draft storage by user", () => {
    const draftA = buildDraft();
    const draftB = buildDraft();

    upsertProductIntakeDraft(draftA, 1);
    upsertProductIntakeDraft({ ...draftB, id: `${draftB.id}-other` }, 2);

    expect(listProductIntakeDrafts(1)).toHaveLength(1);
    expect(listProductIntakeDrafts(2)).toHaveLength(1);
    expect(listProductIntakeDrafts(1)[0]?.id).not.toBe(listProductIntakeDrafts(2)[0]?.id);
  });
});
