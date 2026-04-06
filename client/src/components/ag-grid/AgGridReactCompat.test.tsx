import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgGridReactCompat } from "./AgGridReactCompat";

const mockAgGridReact = vi.fn(() => null);

vi.mock("ag-grid-react", () => ({
  AgGridReact: (props: Record<string, unknown>) => mockAgGridReact(props),
}));

describe("AgGridReactCompat", () => {
  it("strips jsx location props before forwarding to AG Grid", () => {
    render(
      <AgGridReactCompat
        data-loc="client/src/example.tsx:10"
        rowData={[]}
        columnDefs={[]}
      />
    );

    expect(mockAgGridReact).toHaveBeenCalledWith(
      expect.not.objectContaining({ "data-loc": expect.anything() })
    );
  });
});
