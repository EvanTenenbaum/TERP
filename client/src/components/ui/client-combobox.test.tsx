import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientCombobox } from "./client-combobox";

describe("ClientCombobox", () => {
  it("shows the fallback selected label while the selected client hydrates", () => {
    render(
      <ClientCombobox
        value={7}
        onValueChange={vi.fn()}
        clients={[]}
        placeholder="Customer..."
        selectedLabel="Acme Wellness"
      />
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Acme Wellness");
    expect(screen.getByRole("combobox")).not.toHaveTextContent("Customer...");
  });

  it("prefers the loaded client name once the option list catches up", () => {
    render(
      <ClientCombobox
        value={7}
        onValueChange={vi.fn()}
        clients={[{ id: 7, name: "Acme Holdings" }]}
        selectedLabel="Acme Wellness"
      />
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Acme Holdings");
    expect(screen.getByRole("combobox")).not.toHaveTextContent("Acme Wellness");
  });
});
