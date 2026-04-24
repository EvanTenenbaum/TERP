import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { convertDraftToSheet, getTemplates, saveDraft } from "./salesSheetsDb";

function createDraftRecord() {
  const now = new Date("2026-04-01T08:00:00Z");

  return {
    id: 8,
    clientId: 12,
    createdBy: 3,
    name: "April Draft",
    items: [
      {
        id: 101,
        name: "Moonrocks",
        basePrice: 100,
        retailPrice: 150,
        quantity: 2,
        priceMarkup: 50,
      },
    ],
    totalValue: "999.00",
    itemCount: 99,
    createdAt: now,
    updatedAt: now,
  };
}

describe("salesSheetsDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTemplates", () => {
    it("applies a universal-only filter when clientId is omitted", async () => {
      const orderBy = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where, orderBy });
      const select = vi.fn().mockReturnValue({ from });

      vi.mocked(getDb).mockResolvedValue({ select } as unknown as Awaited<
        ReturnType<typeof getDb>
      >);

      await getTemplates();

      expect(where).toHaveBeenCalledTimes(1);
      expect(orderBy).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveDraft", () => {
    it("throws when updating a draft that no longer matches the owner filter", async () => {
      const where = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
      const set = vi.fn().mockReturnValue({ where });
      const update = vi.fn().mockReturnValue({ set });

      vi.mocked(getDb).mockResolvedValue({ update } as unknown as Awaited<
        ReturnType<typeof getDb>
      >);

      await expect(
        saveDraft({
          draftId: 42,
          clientId: 12,
          name: "April Draft",
          items: createDraftRecord().items,
          totalValue: 300,
          createdBy: 3,
        })
      ).rejects.toThrow(
        "Draft not found or you do not have permission to update it"
      );
    });

    it("returns the draft id when the update succeeds", async () => {
      const where = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
      const set = vi.fn().mockReturnValue({ where });
      const update = vi.fn().mockReturnValue({ set });

      vi.mocked(getDb).mockResolvedValue({ update } as unknown as Awaited<
        ReturnType<typeof getDb>
      >);

      await expect(
        saveDraft({
          draftId: 42,
          clientId: 12,
          name: "April Draft",
          items: createDraftRecord().items,
          totalValue: 300,
          createdBy: 3,
        })
      ).resolves.toBe(42);
    });
  });

  describe("convertDraftToSheet", () => {
    it("throws when the draft cannot be removed after inserting the finalized sheet", async () => {
      const draft = createDraftRecord();
      const limit = vi.fn().mockResolvedValue([draft]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      const select = vi.fn().mockReturnValue({ from });
      const values = vi.fn().mockResolvedValue([{ insertId: 77 }]);
      const insert = vi.fn().mockReturnValue({ values });
      const deleteWhere = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
      const deleteDraft = vi.fn().mockReturnValue({ where: deleteWhere });
      const transaction = vi.fn().mockImplementation(async callback =>
        callback({
          select,
          insert,
          delete: deleteDraft,
        })
      );

      vi.mocked(getDb).mockResolvedValue({ transaction } as unknown as Awaited<
        ReturnType<typeof getDb>
      >);

      await expect(convertDraftToSheet(8, 3)).rejects.toThrow(
        "Draft could not be removed after conversion"
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 12,
          totalValue: "300",
          itemCount: 1,
          createdBy: 3,
        })
      );
    });

    it("returns the new sheet id when insert and delete both succeed", async () => {
      const draft = createDraftRecord();
      const limit = vi.fn().mockResolvedValue([draft]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      const select = vi.fn().mockReturnValue({ from });
      const values = vi.fn().mockResolvedValue([{ insertId: 88 }]);
      const insert = vi.fn().mockReturnValue({ values });
      const deleteWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
      const deleteDraft = vi.fn().mockReturnValue({ where: deleteWhere });
      const transaction = vi.fn().mockImplementation(async callback =>
        callback({
          select,
          insert,
          delete: deleteDraft,
        })
      );

      vi.mocked(getDb).mockResolvedValue({ transaction } as unknown as Awaited<
        ReturnType<typeof getDb>
      >);

      await expect(convertDraftToSheet(8, 3)).resolves.toBe(88);
      expect(deleteWhere).toHaveBeenCalledTimes(1);
    });
  });
});
