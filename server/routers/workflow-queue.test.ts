/**
 * Integration Tests for Workflow Queue Router
 *
 * Tests all tRPC procedures in the workflow-queue router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/workflow-queue.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as permissionService from "../services/permissionService";
import * as workflowQueries from "../db/queries/workflow-queue";

// Mock the database queries module
vi.mock("../db/queries/workflow-queue");

// Mock permission service
vi.mock("../services/permissionService");

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  openId: "user_test123",
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

describe("Workflow Queue Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock permission checks to pass by default
    vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
    vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);
  });

  describe("Workflow Status Management", () => {
    describe("listStatuses", () => {
      it("should return all active workflow statuses", async () => {
        // Arrange
        const mockStatuses = [
          {
            id: 1,
            name: "Intake Queue",
            slug: "intake-queue",
            color: "#3B82F6",
            order: 1,
            isActive: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            name: "Quality Check",
            slug: "quality-check",
            color: "#F59E0B",
            order: 2,
            isActive: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        vi.mocked(workflowQueries.getAllActiveStatuses).mockResolvedValue(mockStatuses);

        // Act
        const result = await caller.workflowQueue.listStatuses();

        // Assert
        expect(result).toEqual(mockStatuses);
        expect(workflowQueries.getAllActiveStatuses).toHaveBeenCalledOnce();
      });

      it("should return empty array when no statuses exist", async () => {
        // Arrange
        vi.mocked(workflowQueries.getAllActiveStatuses).mockResolvedValue([]);

        // Act
        const result = await caller.workflowQueue.listStatuses();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe("getStatus", () => {
      it("should get a workflow status by ID", async () => {
        // Arrange
        const mockStatus = {
          id: 1,
          name: "Intake Queue",
          slug: "intake-queue",
          color: "#3B82F6",
          order: 1,
          isActive: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(workflowQueries.getStatusById).mockResolvedValue(mockStatus);

        // Act
        const result = await caller.workflowQueue.getStatus({ id: 1 });

        // Assert
        expect(result).toEqual(mockStatus);
        expect(workflowQueries.getStatusById).toHaveBeenCalledWith(1);
      });

      it("should throw error when status not found", async () => {
        // Arrange
        vi.mocked(workflowQueries.getStatusById).mockResolvedValue(undefined);

        // Act & Assert
        await expect(
          caller.workflowQueue.getStatus({ id: 999 })
        ).rejects.toThrow("Workflow status not found");
      });
    });

    describe("createStatus", () => {
      it("should create a new workflow status", async () => {
        // Arrange
        const newStatusData = {
          name: "Lab Testing",
          slug: "lab-testing",
          color: "#10B981",
          order: 3,
        };

        const createdStatus = {
          id: 3,
          ...newStatusData,
          isActive: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(workflowQueries.createStatus).mockResolvedValue(createdStatus);

        // Act
        const result = await caller.workflowQueue.createStatus(newStatusData);

        // Assert
        expect(result).toEqual(createdStatus);
        expect(workflowQueries.createStatus).toHaveBeenCalledWith(newStatusData);
      });
    });

    describe("updateStatus", () => {
      it("should update an existing workflow status", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Updated Name",
          color: "#EF4444",
        };

        const updatedStatus = {
          id: 1,
          name: "Updated Name",
          slug: "intake-queue",
          color: "#EF4444",
          order: 1,
          isActive: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(workflowQueries.updateStatus).mockResolvedValue(updatedStatus);

        // Act
        const result = await caller.workflowQueue.updateStatus(updateData);

        // Assert
        expect(result).toEqual(updatedStatus);
        expect(workflowQueries.updateStatus).toHaveBeenCalledWith(1, {
          name: "Updated Name",
          color: "#EF4444",
        });
      });
    });

    describe("deleteStatus", () => {
      it("should soft delete a workflow status", async () => {
        // Arrange
        vi.mocked(workflowQueries.deleteStatus).mockResolvedValue();

        // Act
        const result = await caller.workflowQueue.deleteStatus({ id: 1 });

        // Assert
        expect(result).toEqual({ success: true });
        expect(workflowQueries.deleteStatus).toHaveBeenCalledWith(1);
      });
    });

    describe("reorderStatuses", () => {
      it("should reorder workflow statuses", async () => {
        // Arrange
        const statusIds = [3, 1, 2];
        vi.mocked(workflowQueries.reorderStatuses).mockResolvedValue();

        // Act
        const result = await caller.workflowQueue.reorderStatuses({ statusIds });

        // Assert
        expect(result).toEqual({ success: true });
        expect(workflowQueries.reorderStatuses).toHaveBeenCalledWith(statusIds);
      });
    });
  });

  describe("Batch Queue Management", () => {
    describe("getQueues", () => {
      it("should get all batches grouped by workflow status", async () => {
        // Arrange
        const mockQueues = {
          1: [
            { id: 1, code: "BATCH-001", statusId: 1 },
            { id: 2, code: "BATCH-002", statusId: 1 },
          ],
          2: [
            { id: 3, code: "BATCH-003", statusId: 2 },
          ],
        };

        vi.mocked(workflowQueries.getBatchesByStatus).mockResolvedValue(mockQueues);

        // Act
        const result = await caller.workflowQueue.getQueues();

        // Assert
        expect(result).toEqual(mockQueues);
        expect(workflowQueries.getBatchesByStatus).toHaveBeenCalledOnce();
      });
    });

    describe("getBatchesByStatus", () => {
      it("should get batches for a specific status", async () => {
        // Arrange
        const mockBatches = [
          { id: 1, code: "BATCH-001", statusId: 1 },
          { id: 2, code: "BATCH-002", statusId: 1 },
        ];

        vi.mocked(workflowQueries.getBatchesByStatusId).mockResolvedValue(mockBatches);

        // Act
        const result = await caller.workflowQueue.getBatchesByStatus({ statusId: 1 });

        // Assert
        expect(result).toEqual(mockBatches);
        expect(workflowQueries.getBatchesByStatusId).toHaveBeenCalledWith(1);
      });
    });

    describe("updateBatchStatus", () => {
      it("should update a batch's workflow status and create history entry", async () => {
        // Arrange
        const updateData = {
          batchId: 1,
          toStatusId: 2,
          notes: "Moving to quality check",
        };

        vi.mocked(workflowQueries.updateBatchStatus).mockResolvedValue();

        // Act
        const result = await caller.workflowQueue.updateBatchStatus(updateData);

        // Assert
        expect(result).toEqual({ success: true });
        expect(workflowQueries.updateBatchStatus).toHaveBeenCalledWith(
          1,
          2,
          mockUser.id,
          "Moving to quality check"
        );
      });

      it("should update batch status without notes", async () => {
        // Arrange
        const updateData = {
          batchId: 1,
          toStatusId: 2,
        };

        vi.mocked(workflowQueries.updateBatchStatus).mockResolvedValue();

        // Act
        const result = await caller.workflowQueue.updateBatchStatus(updateData);

        // Assert
        expect(result).toEqual({ success: true });
        expect(workflowQueries.updateBatchStatus).toHaveBeenCalledWith(
          1,
          2,
          mockUser.id,
          undefined
        );
      });
    });
  });

  describe("Status History", () => {
    describe("getBatchHistory", () => {
      it("should get status change history for a batch", async () => {
        // Arrange
        const mockHistory = [
          {
            id: 1,
            batchId: 1,
            fromStatusId: 1,
            toStatusId: 2,
            changedBy: 1,
            notes: "Quality check complete",
            createdAt: new Date(),
          },
          {
            id: 2,
            batchId: 1,
            fromStatusId: null,
            toStatusId: 1,
            changedBy: 1,
            notes: null,
            createdAt: new Date(),
          },
        ];

        vi.mocked(workflowQueries.getBatchStatusHistory).mockResolvedValue(mockHistory);

        // Act
        const result = await caller.workflowQueue.getBatchHistory({ batchId: 1 });

        // Assert
        expect(result).toEqual(mockHistory);
        expect(workflowQueries.getBatchStatusHistory).toHaveBeenCalledWith(1);
      });
    });

    describe("getRecentChanges", () => {
      it("should get recent status changes with default limit", async () => {
        // Arrange
        const mockChanges = [
          {
            id: 1,
            batchId: 1,
            fromStatusId: 1,
            toStatusId: 2,
            changedBy: 1,
            notes: null,
            createdAt: new Date(),
          },
        ];

        vi.mocked(workflowQueries.getRecentStatusChanges).mockResolvedValue(mockChanges);

        // Act
        const result = await caller.workflowQueue.getRecentChanges({});

        // Assert
        expect(result).toEqual(mockChanges);
        expect(workflowQueries.getRecentStatusChanges).toHaveBeenCalledWith(50);
      });

      it("should get recent status changes with custom limit", async () => {
        // Arrange
        const mockChanges = [
          {
            id: 1,
            batchId: 1,
            fromStatusId: 1,
            toStatusId: 2,
            changedBy: 1,
            notes: null,
            createdAt: new Date(),
          },
        ];

        vi.mocked(workflowQueries.getRecentStatusChanges).mockResolvedValue(mockChanges);

        // Act
        const result = await caller.workflowQueue.getRecentChanges({ limit: 10 });

        // Assert
        expect(result).toEqual(mockChanges);
        expect(workflowQueries.getRecentStatusChanges).toHaveBeenCalledWith(10);
      });
    });
  });
});
