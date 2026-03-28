import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderAdjustmentsBar } from "./OrderAdjustmentsBar";

vi.mock("./ReferredBySelector", () => ({
  ReferredBySelector: ({
    onSelect,
  }: {
    onSelect: (value: number | null) => void;
  }) => (
    <button type="button" onClick={() => onSelect(44)}>
      Mock Referred By Selector
    </button>
  ),
}));

describe("OrderAdjustmentsBar", () => {
  it("renders status badges and actions", () => {
    render(
      <OrderAdjustmentsBar
        referredByClientId={null}
        onReferredByChange={vi.fn()}
        clientId={12}
        notes="Leave at reception"
        onNotesChange={vi.fn()}
        activeDraftId={88}
        isSaving={false}
        hasUnsavedChanges
        onSaveDraft={vi.fn()}
        onFinalize={vi.fn()}
        isFinalizePending={false}
        isSeededFromCatalogue
        orderType="SALE"
      />
    );

    expect(screen.getByText("Draft #88")).toBeInTheDocument();
    expect(screen.getByText("Seeded from catalogue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Order" })).toBeInTheDocument();
  });

  it("propagates note edits and finalize action", () => {
    const onNotesChange = vi.fn();
    const onFinalize = vi.fn();

    render(
      <OrderAdjustmentsBar
        referredByClientId={null}
        onReferredByChange={vi.fn()}
        clientId={12}
        notes=""
        onNotesChange={onNotesChange}
        activeDraftId={null}
        isSaving={false}
        hasUnsavedChanges={false}
        onSaveDraft={vi.fn()}
        onFinalize={onFinalize}
        isFinalizePending={false}
        isSeededFromCatalogue={false}
        orderType="QUOTE"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Notes, handling guidance/i), {
      target: { value: "Watch delivery window" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Quote" }));

    expect(onNotesChange).toHaveBeenCalledWith("Watch delivery window");
    expect(onFinalize).toHaveBeenCalledTimes(1);
  });
});
