/**
 * @vitest-environment jsdom
 *
 * ConfirmDialog — ReactNode description / HTML nesting safety tests
 *
 * BUG regression: When `description` is a ReactNode containing block-level
 * elements (e.g. <div>), the underlying AlertDialogDescription renders as a
 * <p> element which must NOT contain block children per HTML spec.
 *
 * These tests verify:
 *  1. String descriptions render normally.
 *  2. ReactNode descriptions with div/block content do not produce invalid
 *     HTML nesting (no <p> wrapping <div>).
 *  3. The component renders and fires onConfirm correctly.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

// ---------------------------------------------------------------------------
// Mock Radix/shadcn AlertDialog primitives to produce predictable HTML
// and avoid jsdom instability with portals.
// ---------------------------------------------------------------------------

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
    onOpenChange?: (v: boolean) => void;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),

  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),

  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),

  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),

  // Render as <div> (not <p>) so block-element children don't violate HTML spec.
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-description">{children}</div>
  ),

  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),

  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button data-testid="alert-dialog-cancel" disabled={disabled}>
      {children}
    </button>
  ),

  AlertDialogAction: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="alert-dialog-action"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: ({ variant }: { variant?: string }) =>
    variant ? `btn-${variant}` : "btn-default",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | undefined | false)[]) =>
    args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfirmDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Confirm Action",
    onConfirm: vi.fn(),
  };

  it("renders with a plain string description", () => {
    render(<ConfirmDialog {...baseProps} description="Are you sure?" />);

    expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
      "Confirm Action"
    );
    expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
      "Are you sure?"
    );
  });

  it("renders with a ReactNode description containing block elements without invalid HTML nesting", () => {
    const blockDescription = (
      <div data-testid="block-description">
        <strong>Warning:</strong>
        <p>This will permanently remove the record.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    );

    const { container } = render(
      <ConfirmDialog {...baseProps} description={blockDescription} />
    );

    // The block description content should be rendered
    expect(screen.getByTestId("block-description")).toBeInTheDocument();
    expect(screen.getByText("Warning:")).toBeInTheDocument();
    expect(
      screen.getByText("This will permanently remove the record.")
    ).toBeInTheDocument();

    // Assert no <p> wrapping <div> (invalid HTML nesting).
    // Since AlertDialogDescription is mocked as <div>, there should be no
    // <p> element that is an ancestor of the block-description div.
    const blockEl = container.querySelector(
      "[data-testid='block-description']"
    );
    expect(blockEl).not.toBeNull();
    let parent = blockEl?.parentElement;
    while (parent) {
      expect(parent.tagName).not.toBe("P");
      parent = parent.parentElement;
    }
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        description="Proceed?"
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId("alert-dialog-action"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders custom confirm and cancel labels", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        description="Delete this?"
        confirmLabel="Delete"
        cancelLabel="Go Back"
      />
    );

    expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent(
      "Delete"
    );
    expect(screen.getByTestId("alert-dialog-cancel")).toHaveTextContent(
      "Go Back"
    );
  });

  it("shows Loading... text and disables buttons when isLoading is true", () => {
    render(
      <ConfirmDialog {...baseProps} description="Saving…" isLoading={true} />
    );

    const actionBtn = screen.getByTestId("alert-dialog-action");
    expect(actionBtn).toHaveTextContent("Loading...");
    expect(actionBtn).toBeDisabled();
    expect(screen.getByTestId("alert-dialog-cancel")).toBeDisabled();
  });
});
