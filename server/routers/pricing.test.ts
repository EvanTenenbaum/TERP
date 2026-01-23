/**
 * Integration Tests for Pricing Router
 *
 * Tests all tRPC procedures in the pricing router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 * Demonstrates best practices for router testing.
 *
 * @module server/routers/pricing.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the pricing engine module
vi.mock("../pricingEngine");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db } from "../db";
import * as pricingEngine from "../pricingEngine";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Pricing Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("Pricing Rules", () => {
    describe("listRules", () => {
      it("should list all pricing rules", async () => {
        // Arrange
        const mockRules = [
          {
            id: 1,
            name: "VIP Discount",
            description: "10% discount for VIP clients",
            adjustmentType: "PERCENT_MARKDOWN" as const,
            adjustmentValue: 10,
            conditions: { clientType: "VIP" },
            logicType: "AND" as const,
            priority: 1,
            isActive: true,
          },
          {
            id: 2,
            name: "Bulk Markup",
            description: "5% markup for bulk orders",
            adjustmentType: "PERCENT_MARKUP" as const,
            adjustmentValue: 5,
            conditions: { quantity: { $gte: 100 } },
            logicType: "AND" as const,
            priority: 2,
            isActive: true,
          },
        ];

        vi.mocked(pricingEngine.getPricingRules).mockResolvedValue(mockRules);

        // Act
        const result = await caller.pricing.listRules();

        // Assert
        expect(result).toEqual(mockRules);
        expect(result).toHaveLength(2);
        expect(pricingEngine.getPricingRules).toHaveBeenCalledTimes(1);
      });

      it("should return empty array when no rules exist", async () => {
        // Arrange
        vi.mocked(pricingEngine.getPricingRules).mockResolvedValue([]);

        // Act
        const result = await caller.pricing.listRules();

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe("getRuleById", () => {
      it("should retrieve a specific pricing rule by ID", async () => {
        // Arrange
        const mockRule = {
          id: 1,
          name: "VIP Discount",
          description: "10% discount for VIP clients",
          adjustmentType: "PERCENT_MARKDOWN" as const,
          adjustmentValue: 10,
          conditions: { clientType: "VIP" },
          logicType: "AND" as const,
          priority: 1,
          isActive: true,
        };

        vi.mocked(pricingEngine.getPricingRuleById).mockResolvedValue(mockRule);

        // Act
        const result = await caller.pricing.getRuleById({ ruleId: 1 });

        // Assert
        expect(result).toEqual(mockRule);
        expect(pricingEngine.getPricingRuleById).toHaveBeenCalledWith(1);
      });

      it("should return null for non-existent rule", async () => {
        // Arrange
        vi.mocked(pricingEngine.getPricingRuleById).mockResolvedValue(null);

        // Act
        const result = await caller.pricing.getRuleById({ ruleId: 999 });

        // Assert
        expect(result).toBeNull();
      });
    });

    describe("createRule", () => {
      it("should create a new pricing rule with percent markup", async () => {
        // Arrange - QUAL-002: conditions must use proper schema format
        const input = {
          name: "Premium Markup",
          description: "15% markup for premium products",
          adjustmentType: "PERCENT_MARKUP" as const,
          adjustmentValue: 15,
          conditions: { productCategory: { operator: "eq" as const, value: "premium" } },
          logicType: "AND" as const,
          priority: 1,
        };

        const mockCreatedRule = {
          id: 3,
          ...input,
          isActive: true,
        };

        vi.mocked(pricingEngine.createPricingRule).mockResolvedValue(
          mockCreatedRule
        );

        // Act
        const result = await caller.pricing.createRule(input);

        // Assert
        expect(result).toEqual(mockCreatedRule);
        expect(pricingEngine.createPricingRule).toHaveBeenCalledWith(input);
      });

      it("should create a rule with dollar markdown", async () => {
        // Arrange - QUAL-002: conditions must use proper schema format
        const input = {
          name: "Clearance Discount",
          description: "$5 off clearance items",
          adjustmentType: "DOLLAR_MARKDOWN" as const,
          adjustmentValue: 5,
          conditions: { clearance: { operator: "eq" as const, value: true } },
        };

        const mockCreatedRule = {
          id: 4,
          ...input,
          isActive: true,
        };

        vi.mocked(pricingEngine.createPricingRule).mockResolvedValue(
          mockCreatedRule
        );

        // Act
        const result = await caller.pricing.createRule(input);

        // Assert
        expect(result.adjustmentType).toBe("DOLLAR_MARKDOWN");
        expect(result.adjustmentValue).toBe(5);
      });

      it("should reject invalid adjustment type", async () => {
        // Arrange
        const input = {
          name: "Invalid Rule",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adjustmentType: "INVALID_TYPE" as any,
          adjustmentValue: 10,
          conditions: {},
        };

        // Act & Assert
        await expect(caller.pricing.createRule(input)).rejects.toThrow();
      });
    });

    describe("updateRule", () => {
      it("should update an existing pricing rule", async () => {
        // Arrange
        const input = {
          ruleId: 1,
          name: "Updated VIP Discount",
          adjustmentValue: 15,
          isActive: false,
        };

        vi.mocked(pricingEngine.updatePricingRule).mockResolvedValue(undefined);

        // Act
        const result = await caller.pricing.updateRule(input);

        // Assert
        expect(result).toEqual({ success: true });
        expect(pricingEngine.updatePricingRule).toHaveBeenCalledWith(1, {
          name: "Updated VIP Discount",
          adjustmentValue: 15,
          isActive: false,
        });
      });

      it("should update only specified fields", async () => {
        // Arrange
        const input = {
          ruleId: 2,
          description: "Updated description only",
        };

        vi.mocked(pricingEngine.updatePricingRule).mockResolvedValue(undefined);

        // Act
        const result = await caller.pricing.updateRule(input);

        // Assert
        expect(result.success).toBe(true);
        expect(pricingEngine.updatePricingRule).toHaveBeenCalledWith(2, {
          description: "Updated description only",
        });
      });
    });

    describe("deleteRule", () => {
      it("should delete a pricing rule", async () => {
        // Arrange
        vi.mocked(pricingEngine.deletePricingRule).mockResolvedValue(undefined);

        // Act
        const result = await caller.pricing.deleteRule({ ruleId: 1 });

        // Assert
        expect(result).toEqual({ success: true });
        expect(pricingEngine.deletePricingRule).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("Pricing Profiles", () => {
    describe("listProfiles", () => {
      it("should list all pricing profiles", async () => {
        // Arrange
        const mockProfiles = [
          {
            id: 1,
            name: "VIP Profile",
            description: "Profile for VIP clients",
            rules: [
              { ruleId: 1, priority: 1 },
              { ruleId: 2, priority: 2 },
            ],
          },
          {
            id: 2,
            name: "Standard Profile",
            description: "Default pricing profile",
            rules: [{ ruleId: 3, priority: 1 }],
          },
        ];

        vi.mocked(pricingEngine.getPricingProfiles).mockResolvedValue(
          mockProfiles
        );

        // Act
        const result = await caller.pricing.listProfiles();

        // Assert
        expect(result).toEqual(mockProfiles);
        expect(result).toHaveLength(2);
      });
    });

    describe("getProfileById", () => {
      it("should retrieve a specific pricing profile", async () => {
        // Arrange
        const mockProfile = {
          id: 1,
          name: "VIP Profile",
          description: "Profile for VIP clients",
          rules: [
            { ruleId: 1, priority: 1 },
            { ruleId: 2, priority: 2 },
          ],
        };

        vi.mocked(pricingEngine.getPricingProfileById).mockResolvedValue(
          mockProfile
        );

        // Act
        const result = await caller.pricing.getProfileById({ profileId: 1 });

        // Assert
        expect(result).toEqual(mockProfile);
        expect(result.rules).toHaveLength(2);
      });
    });

    describe("createProfile", () => {
      it("should create a new pricing profile", async () => {
        // Arrange
        const input = {
          name: "Wholesale Profile",
          description: "Profile for wholesale clients",
          rules: [
            { ruleId: 1, priority: 1 },
            { ruleId: 3, priority: 2 },
          ],
        };

        const mockCreatedProfile = {
          id: 3,
          ...input,
          createdBy: 1,
        };

        vi.mocked(pricingEngine.createPricingProfile).mockResolvedValue(
          mockCreatedProfile
        );

        // Act
        const result = await caller.pricing.createProfile(input);

        // Assert
        expect(result).toEqual(mockCreatedProfile);
        expect(pricingEngine.createPricingProfile).toHaveBeenCalledWith({
          ...input,
          createdBy: 1,
        });
      });

      it("should create profile with multiple rules in priority order", async () => {
        // Arrange
        const input = {
          name: "Multi-Rule Profile",
          rules: [
            { ruleId: 1, priority: 1 },
            { ruleId: 2, priority: 2 },
            { ruleId: 3, priority: 3 },
          ],
        };

        const mockCreatedProfile = {
          id: 4,
          ...input,
          createdBy: 1,
        };

        vi.mocked(pricingEngine.createPricingProfile).mockResolvedValue(
          mockCreatedProfile
        );

        // Act
        const result = await caller.pricing.createProfile(input);

        // Assert
        expect(result.rules).toHaveLength(3);
        expect(result.rules[0].priority).toBe(1);
        expect(result.rules[2].priority).toBe(3);
      });
    });

    describe("updateProfile", () => {
      it("should update a pricing profile", async () => {
        // Arrange
        const input = {
          profileId: 1,
          name: "Updated VIP Profile",
          rules: [{ ruleId: 5, priority: 1 }],
        };

        vi.mocked(pricingEngine.updatePricingProfile).mockResolvedValue(
          undefined
        );

        // Act
        const result = await caller.pricing.updateProfile(input);

        // Assert
        expect(result).toEqual({ success: true });
        expect(pricingEngine.updatePricingProfile).toHaveBeenCalledWith(1, {
          name: "Updated VIP Profile",
          rules: [{ ruleId: 5, priority: 1 }],
        });
      });
    });

    describe("deleteProfile", () => {
      it("should delete a pricing profile", async () => {
        // Arrange
        vi.mocked(pricingEngine.deletePricingProfile).mockResolvedValue(
          undefined
        );

        // Act
        const result = await caller.pricing.deleteProfile({ profileId: 1 });

        // Assert
        expect(result).toEqual({ success: true });
        expect(pricingEngine.deletePricingProfile).toHaveBeenCalledWith(1);
      });
    });

    describe("applyProfileToClient", () => {
      it("should apply a pricing profile to a client", async () => {
        // Arrange
        const input = {
          clientId: 10,
          profileId: 1,
        };

        vi.mocked(pricingEngine.applyProfileToClient).mockResolvedValue(
          undefined
        );

        // Act
        const result = await caller.pricing.applyProfileToClient(input);

        // Assert
        expect(result).toEqual({ success: true });
        expect(pricingEngine.applyProfileToClient).toHaveBeenCalledWith(10, 1);
      });
    });
  });

  describe("Client Pricing", () => {
    describe("getClientPricingRules", () => {
      it("should retrieve pricing rules for a specific client", async () => {
        // Arrange
        const mockClientRules = [
          {
            id: 1,
            name: "VIP Discount",
            adjustmentType: "PERCENT_MARKDOWN" as const,
            adjustmentValue: 10,
          },
          {
            id: 2,
            name: "Bulk Markup",
            adjustmentType: "PERCENT_MARKUP" as const,
            adjustmentValue: 5,
          },
        ];

        vi.mocked(pricingEngine.getClientPricingRules).mockResolvedValue(
          mockClientRules
        );

        // Act
        const result = await caller.pricing.getClientPricingRules({
          clientId: 10,
        });

        // Assert
        expect(result).toEqual(mockClientRules);
        expect(result).toHaveLength(2);
        expect(pricingEngine.getClientPricingRules).toHaveBeenCalledWith(10);
      });

      it("should return empty array for client with no pricing rules", async () => {
        // Arrange
        vi.mocked(pricingEngine.getClientPricingRules).mockResolvedValue([]);

        // Act
        const result = await caller.pricing.getClientPricingRules({
          clientId: 999,
        });

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe("Business Logic Validation", () => {
    it("should handle concurrent rule updates correctly", async () => {
      // Arrange
      vi.clearAllMocks(); // Clear previous mock calls
      const updates = [
        { ruleId: 1, name: "Update 1" },
        { ruleId: 2, name: "Update 2" },
        { ruleId: 3, name: "Update 3" },
      ];

      vi.mocked(pricingEngine.updatePricingRule).mockResolvedValue(undefined);

      // Act
      const results = await Promise.all(
        updates.map(update => caller.pricing.updateRule(update))
      );

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(pricingEngine.updatePricingRule).toHaveBeenCalledTimes(3);
    });

    it("should validate adjustment value is positive", async () => {
      // Arrange
      const input = {
        name: "Invalid Rule",
        adjustmentType: "PERCENT_MARKUP" as const,
        adjustmentValue: -10, // Negative value
        conditions: {},
      };

      // Note: This would be validated by the pricing engine, not the router
      // The router just passes through to the engine
      vi.mocked(pricingEngine.createPricingRule).mockRejectedValue(
        new Error("Adjustment value must be positive")
      );

      // Act & Assert
      await expect(caller.pricing.createRule(input)).rejects.toThrow(
        "Adjustment value must be positive"
      );
    });
  });
});
