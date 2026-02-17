/**
 * Integration Tests for Clients Router
 *
 * Tests all tRPC procedures in the clients router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/clients.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the database modules
vi.mock("../clientsDb");

import { appRouter } from "../routers";
import { createMockContext } from "../../tests/unit/mocks/db.mock";
import { db as _db } from "../db";
import * as clientsDb from "../clientsDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = () => {
  const ctx = createMockContext({ user: mockUser });
  return appRouter.createCaller(ctx);
};

describe("Clients Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  describe("list", () => {
    it("should retrieve list of clients with default pagination", async () => {
      // Arrange
      const mockClients = [
        { id: 1, teriCode: "CLI001", name: "Test Client 1", isBuyer: true },
        { id: 2, teriCode: "CLI002", name: "Test Client 2", isSeller: true },
      ];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const result = await caller.clients.list({});

      // Assert - Now returns paginated response
      expect(result.items).toHaveLength(2);
      expect(clientsDb.getClients).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it("should filter by search term", async () => {
      // Arrange
      const mockClients = [
        { id: 1, teriCode: "CLI001", name: "Acme Corp", isBuyer: true },
      ];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const result = await caller.clients.list({ search: "Acme" });

      // Assert - Now returns paginated response
      expect(result.items).toHaveLength(1);
      expect(clientsDb.getClients).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Acme" })
      );
    });

    it("should filter by client types", async () => {
      // Arrange
      const mockClients = [
        { id: 1, teriCode: "CLI001", name: "Buyer Client", isBuyer: true },
      ];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const result = await caller.clients.list({ clientTypes: ["buyer"] });

      // Assert - Now returns paginated response
      expect(result.items[0].isBuyer).toBe(true);
    });

    it("should filter by tags", async () => {
      // Arrange
      const mockClients = [
        { id: 1, teriCode: "CLI001", name: "Tagged Client", tags: ["vip"] },
      ];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const result = await caller.clients.list({ tags: ["vip"] });

      // Assert - Now returns paginated response
      expect(result.items[0].tags).toContain("vip");
    });

    it("should filter by debt status", async () => {
      // Arrange
      const mockClients = [
        { id: 1, teriCode: "CLI001", name: "Debtor", hasDebt: true },
      ];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const result = await caller.clients.list({ hasDebt: true });

      // Assert - Now returns paginated response
      expect(result.items[0].hasDebt).toBe(true);
    });

    it("should support custom pagination", async () => {
      // Arrange
      const mockClients = [{ id: 11, teriCode: "CLI011", name: "Client 11" }];

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      await caller.clients.list({ limit: 10, offset: 10 });

      // Assert
      expect(clientsDb.getClients).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 10 })
      );
    });
  });

  describe("count", () => {
    it("should return total client count", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientCount).mockResolvedValue(100);

      // Act
      const result = await caller.clients.count({});

      // Assert
      expect(result).toBe(100);
    });

    it("should count with filters", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientCount).mockResolvedValue(25);

      // Act
      const result = await caller.clients.count({ clientTypes: ["buyer"] });

      // Assert
      expect(result).toBe(25);
    });
  });

  describe("getById", () => {
    it("should retrieve client by ID", async () => {
      // Arrange
      const mockClient = {
        id: 1,
        teriCode: "CLI001",
        name: "Test Client",
        email: "test@example.com",
      };

      vi.mocked(clientsDb.getClientById).mockResolvedValue(mockClient);

      // Act
      const result = await caller.clients.getById({ clientId: 1 });

      // Assert
      expect(result).toEqual(mockClient);
      expect(clientsDb.getClientById).toHaveBeenCalledWith(1);
    });

    it("should return null for non-existent client", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientById).mockResolvedValue(null);

      // Act
      const result = await caller.clients.getById({ clientId: 999 });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getByTeriCode", () => {
    it("should retrieve client by TERI code", async () => {
      // Arrange
      const mockClient = {
        id: 1,
        teriCode: "CLI001",
        name: "Test Client",
      };

      vi.mocked(clientsDb.getClientByTeriCode).mockResolvedValue(mockClient);

      // Act
      const result = await caller.clients.getByTeriCode({ teriCode: "CLI001" });

      // Assert
      expect(result).toEqual(mockClient);
      expect(clientsDb.getClientByTeriCode).toHaveBeenCalledWith("CLI001");
    });

    it("should return null for non-existent TERI code", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientByTeriCode).mockResolvedValue(null);

      // Act
      const result = await caller.clients.getByTeriCode({
        teriCode: "INVALID",
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a new client", async () => {
      // Arrange
      const input = {
        teriCode: "CLI003",
        name: "New Client",
        email: "new@example.com",
        phone: "555-1234",
        isBuyer: true,
      };

      const mockCreatedClient = {
        id: 3,
        ...input,
        paymentTerms: 30, // Default value
        createdBy: 1,
        createdAt: new Date(),
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue(mockCreatedClient);

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result).toEqual(mockCreatedClient);
      // createClient now receives paymentTerms with default value of 30
      expect(clientsDb.createClient).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          teriCode: "CLI003",
          name: "New Client",
          paymentTerms: 30,
        })
      );
    });

    it("should create client with multiple types", async () => {
      // Arrange
      const input = {
        teriCode: "CLI004",
        name: "Multi-Type Client",
        isBuyer: true,
        isSeller: true,
      };

      const mockCreatedClient = {
        id: 4,
        ...input,
        createdBy: 1,
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue(mockCreatedClient);

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result.isBuyer).toBe(true);
      expect(result.isSeller).toBe(true);
    });

    it("should create client with tags", async () => {
      // Arrange
      const input = {
        teriCode: "CLI005",
        name: "Tagged Client",
        tags: ["vip", "priority"],
      };

      const mockCreatedClient = {
        id: 5,
        ...input,
        createdBy: 1,
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue(mockCreatedClient);

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result.tags).toEqual(["vip", "priority"]);
    });
  });

  describe("update", () => {
    it("should update client information", async () => {
      // Arrange
      const input = {
        clientId: 1,
        name: "Updated Name",
        email: "updated@example.com",
      };

      const mockUpdatedClient = {
        id: 1,
        teriCode: "CLI001",
        name: "Updated Name",
        email: "updated@example.com",
      };

      vi.mocked(clientsDb.updateClient).mockResolvedValue(mockUpdatedClient);

      // Act
      const result = await caller.clients.update(input);

      // Assert
      expect(result.name).toBe("Updated Name");
      // updateClient now takes 4 args: (clientId, userId, data, expectedVersion?)
      expect(clientsDb.updateClient).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ name: "Updated Name" }),
        undefined
      );
    });

    it("should update client types", async () => {
      // Arrange
      const input = {
        clientId: 1,
        isBuyer: false,
        isSeller: true,
      };

      const mockUpdatedClient = {
        id: 1,
        isBuyer: false,
        isSeller: true,
      };

      vi.mocked(clientsDb.updateClient).mockResolvedValue(mockUpdatedClient);

      // Act
      const result = await caller.clients.update(input);

      // Assert
      expect(result.isBuyer).toBe(false);
      expect(result.isSeller).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete a client", async () => {
      // Arrange
      vi.mocked(clientsDb.deleteClient).mockResolvedValue({ success: true });

      // Act
      const result = await caller.clients.delete({ clientId: 1 });

      // Assert
      expect(result.success).toBe(true);
      // deleteClient now takes (clientId, userId)
      expect(clientsDb.deleteClient).toHaveBeenCalledWith(1, 1);
    });
  });

  // NOTE: Removed tests for "transactions.list" sub-router.
  // The transactions sub-router is not exposed on the clients router.
  // Client transactions are accessed via the separate financials/transactions router.;

  describe("Edge Cases", () => {
    it("should handle empty client list", async () => {
      // Arrange
      vi.mocked(clientsDb.getClients).mockResolvedValue([]);

      // Act
      const result = await caller.clients.list({});

      // Assert - Now returns paginated response
      expect(result.items).toEqual([]);
    });

    it("should handle zero count", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientCount).mockResolvedValue(0);

      // Act
      const result = await caller.clients.count({});

      // Assert
      expect(result).toBe(0);
    });

    it("should handle client with no tags", async () => {
      // Arrange
      const input = {
        teriCode: "CLI006",
        name: "No Tags Client",
      };

      const mockCreatedClient = {
        id: 6,
        ...input,
        tags: [],
        createdBy: 1,
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue(mockCreatedClient);

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result.tags).toEqual([]);
    });

    it("should handle client with all types", async () => {
      // Arrange
      const input = {
        teriCode: "CLI007",
        name: "All Types Client",
        isBuyer: true,
        isSeller: true,
        isBrand: true,
        isReferee: true,
        isContractor: true,
      };

      const mockCreatedClient = {
        id: 7,
        ...input,
        createdBy: 1,
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue(mockCreatedClient);

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result.isBuyer).toBe(true);
      expect(result.isSeller).toBe(true);
      expect(result.isBrand).toBe(true);
      expect(result.isReferee).toBe(true);
      expect(result.isContractor).toBe(true);
    });
  });
});
