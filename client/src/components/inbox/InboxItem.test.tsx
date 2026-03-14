/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxItem, buildInboxEntityRoute } from "./InboxItem";

const mockSetLocation = vi.fn();
const markAsSeenMutate = vi.fn();
const markAsCompletedMutate = vi.fn();
const archiveMutate = vi.fn();
const deleteMutate = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/notifications", mockSetLocation],
}));

vi.mock("@/lib/relationshipProfile", () => ({
  buildRelationshipProfilePath: (referenceId: number) =>
    `/relationships/clients/${referenceId}`,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useContext: () => ({
      inbox: {
        getMyItems: { invalidate: vi.fn() },
        getUnread: { invalidate: vi.fn() },
        getStats: { invalidate: vi.fn() },
      },
    }),
    inbox: {
      markAsSeen: {
        useMutation: () => ({
          mutate: markAsSeenMutate,
        }),
      },
      markAsCompleted: {
        useMutation: () => ({
          mutate: markAsCompletedMutate,
        }),
      },
      archive: {
        useMutation: () => ({
          mutate: archiveMutate,
        }),
      },
      delete: {
        useMutation: () => ({
          mutate: deleteMutate,
          isPending: false,
        }),
      },
    },
  },
}));

describe("buildInboxEntityRoute", () => {
  it.each([
    ["order", 12, "/sales?tab=orders&id=12"],
    ["invoice", 21, "/accounting?tab=invoices&id=21"],
    ["payment", 34, "/accounting?tab=payments&id=34"],
    ["bill", 55, "/accounting?tab=bills&id=55"],
  ])(
    "maps %s references to canonical workspace routes",
    (referenceType, referenceId, expectedPath) => {
      expect(buildInboxEntityRoute(referenceType, referenceId)).toBe(
        expectedPath
      );
    }
  );
});

describe("InboxItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks unread items as seen and navigates payments to the accounting workspace route", () => {
    render(
      <InboxItem
        item={{
          id: 1,
          sourceType: "mention",
          sourceId: 10,
          referenceType: "payment",
          referenceId: 42,
          title: "Payment follow-up",
          description: "Check the recorded payment",
          status: "unread",
          seenAt: null,
          completedAt: null,
          isArchived: false,
          createdAt: new Date("2026-03-14T12:00:00Z"),
        }}
      />
    );

    fireEvent.click(screen.getByText("Payment follow-up"));

    expect(markAsSeenMutate).toHaveBeenCalledWith({ itemId: 1 });
    expect(mockSetLocation).toHaveBeenCalledWith(
      "/accounting?tab=payments&id=42"
    );
  });
});
