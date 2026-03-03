/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarginInput } from "./MarginInput";

describe("MarginInput", () => {
  it("uses dollar-first mode and converts dollar edits to percent", () => {
    const onChange = vi.fn();

    render(
      <MarginInput
        marginPercent={20}
        marginDollar={2}
        cogsPerUnit={10}
        source="CUSTOMER_PROFILE"
        isOverridden={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("20.0%"));
    fireEvent.change(screen.getByLabelText("Margin ($)"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith(50, true);
  });
});
