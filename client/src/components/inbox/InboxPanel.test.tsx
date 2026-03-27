/**
 * InboxPanel interaction tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InboxPanel } from "./InboxPanel";

const mockInvalidate = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useContext: () => ({
      inbox: {
        getMyItems: { invalidate: mockInvalidate },
        getUnread: { invalidate: mockInvalidate },
        getStats: { invalidate: mockInvalidate },
      },
    }),
    inbox: {
      getMyItems: {
        useQuery: () => ({
          data: {
            items: [
              { id: 1, title: "Visible item", isArchived: false },
              { id: 2, title: "Archived item", isArchived: true },
            ],
          },
          isLoading: false,
        }),
      },
      getUnread: {
        useQuery: () => ({
          items: [{ id: 3, title: "Unread item", isArchived: false }],
        }),
      },
      getStats: {
        useQuery: () => ({
          total: 2,
          unread: 1,
          archived: 1,
        }),
      },
      bulkMarkAsSeen: {
        useMutation: () => ({
          isPending: false,
          mutate: mockMarkAllRead,
        }),
      },
    },
  },
}));

vi.mock("./InboxItem", () => ({
  InboxItem: ({
    item,
  }: {
    item: { title?: string; subject?: string; id: number };
  }) => <div>{item.title ?? item.subject ?? `Item ${item.id}`}</div>,
}));

describe("InboxPanel", () => {
  beforeEach(() => {
    mockInvalidate.mockClear();
    mockMarkAllRead.mockClear();
  });

  it("uses pressed-button filters instead of incomplete tab semantics", () => {
    render(<InboxPanel />);

    const archivedButton = screen.getByRole("button", { name: /archived/i });
    expect(archivedButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    fireEvent.click(archivedButton);

    expect(archivedButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Archived item")).toBeInTheDocument();
    expect(screen.queryByText("Visible item")).not.toBeInTheDocument();
  });
});
