import { describe, expect, it, vi, beforeEach } from "vitest";
import { clientsRouter } from "../../../../server/routers/clients";
import { createMockContext, createMockUser } from "../../mocks/db.mock";
import * as clientsDb from "../../../../server/clientsDb";
import * as transactionsDb from "../../../../server/transactionsDb";
import * as permissionService from "../../../../server/services/permissionService";

vi.mock("../../../../server/clientsDb");
vi.mock("../../../../server/transactionsDb");
vi.mock("../../../../server/services/permissionService");

beforeEach(() => {
  vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
  vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
  vi.mocked(permissionService.hasAllPermissions).mockResolvedValue(true);
  vi.mocked(permissionService.hasAnyPermission).mockResolvedValue(true);
});

describe("clientsRouter", () => {
  it("returns availability when TERI code is unused", async () => {
    vi.mocked(clientsDb.getClientByTeriCode).mockResolvedValueOnce(null);
    const caller = clientsRouter.createCaller(createMockContext());

    const result = await caller.checkTeriCodeAvailable({
      teriCode: "ACME-001",
    });

    expect(result).toEqual({ available: true, message: null });
  });

  it("detects duplicate TERI code when not excluded", async () => {
    vi.mocked(clientsDb.getClientByTeriCode).mockResolvedValueOnce({
      id: 42,
    } as never);
    const caller = clientsRouter.createCaller(createMockContext());

    const result = await caller.checkTeriCodeAvailable({
      teriCode: "ACME-001",
    });

    expect(result.available).toBe(false);
    expect(result.message).toContain("ACME-001");
  });

  it("creates a client with the authenticated user id", async () => {
    const user = createMockUser({ id: 7, openId: "user-7" });
    const context = createMockContext({ user });
    const caller = clientsRouter.createCaller(context);
    vi.mocked(clientsDb.createClient).mockResolvedValueOnce({
      id: 88,
      teriCode: "ACME-002",
    } as never);

    const client = await caller.create({
      teriCode: "ACME-002",
      name: "Acme",
      tags: [],
    });

    expect(clientsDb.createClient).toHaveBeenCalledWith(7, {
      teriCode: "ACME-002",
      name: "Acme",
      email: undefined,
      phone: undefined,
      address: undefined,
      isBuyer: undefined,
      isSeller: undefined,
      isBrand: undefined,
      isReferee: undefined,
      isContractor: undefined,
      tags: [],
    });
    expect(client).toEqual({ id: 88, teriCode: "ACME-002" });
  });

  it("links transactions with notes", async () => {
    vi.mocked(transactionsDb.linkTransactions).mockResolvedValueOnce({
      success: true,
    } as never);
    const context = createMockContext();
    const caller = clientsRouter.createCaller(context);

    const result = await caller.transactions.linkTransaction({
      parentTransactionId: 1,
      childTransactionId: 2,
      linkType: "RELATED_TO",
      linkAmount: "100",
      notes: "Link for refund",
    });

    expect(transactionsDb.linkTransactions).toHaveBeenCalledWith(
      1,
      2,
      "RELATED_TO",
      context.user.id,
      "100",
      "Link for refund"
    );
    expect(result).toEqual({ success: true });
  });
});