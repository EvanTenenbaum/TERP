/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarginInput } from "./MarginInput";

describe("MarginInput", () => {
  it("uses dollar-first mode and converts dollar edits to gross margin percent", () => {
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
    fireEvent.change(screen.getByLabelText("Gross Margin ($)"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]).toEqual([33.33, true, 15]);
  });

  it("converts percent edits to the matching dollar margin", () => {
    render(
      <MarginInput
        marginPercent={20}
        marginDollar={2.5}
        cogsPerUnit={10}
        source="CUSTOMER_PROFILE"
        isOverridden={false}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("20.0%"));
    fireEvent.click(screen.getByRole("radio", { name: "Percent" }));
    fireEvent.change(screen.getByLabelText("Gross Margin (%)"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Dollar" }));

    expect(screen.getByLabelText("Gross Margin ($)")).toHaveValue(10);
  });

  it("preserves exact cents when toggling untouched profile-driven values", () => {
    render(
      <MarginInput
        marginPercent={33.33}
        marginDollar={380.66}
        cogsPerUnit={761.32}
        source="CUSTOMER_PROFILE"
        isOverridden={false}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("33.3%"));
    fireEvent.click(screen.getByRole("radio", { name: "Percent" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dollar" }));

    expect(screen.getByLabelText("Gross Margin ($)")).toHaveValue(380.66);
  });

  it("shows field/rule/fix validation guidance when value is invalid", () => {
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
    fireEvent.change(screen.getByLabelText("Gross Margin ($)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Cannot save margin")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Field: Gross Margin \(\$\)\. Rule: value is required\./
      )
        .length
    ).toBeGreaterThan(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("explains when a row is following the pricing profile", () => {
    render(
      <MarginInput
        marginPercent={20}
        marginDollar={2}
        cogsPerUnit={10}
        source="CUSTOMER_PROFILE"
        isOverridden={false}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("20.0%"));

    expect(screen.getByText("Source: Profile-priced")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This row is currently priced from the relationship profile. The value shown here is the resulting gross margin for this row's exact cost and price. The profile rule result is shown separately on the row, and the two numbers can differ because markup and gross margin use different formulas."
      )
    ).toBeInTheDocument();
  });

  it("preserves the exact unit price when saving from dollar mode", () => {
    const onChange = vi.fn();

    render(
      <MarginInput
        marginPercent={33.33}
        marginDollar={380.66}
        cogsPerUnit={761.32}
        source="CUSTOMER_PROFILE"
        isOverridden={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("33.3%"));
    fireEvent.change(screen.getByLabelText("Gross Margin ($)"), {
      target: { value: "380.66" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]).toEqual([33.33, true, 1141.98]);
  });
});
