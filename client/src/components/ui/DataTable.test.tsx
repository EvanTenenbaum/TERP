/**
 * Enhanced DataTable component tests
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { ThemeProvider } from "@/contexts/ThemeContext";

interface Person {
  id: string;
  name: string;
  role: string;
  age: number;
}

const columns: Array<DataTableColumn<Person>> = [
  {
    id: "name",
    header: "Name",
    accessor: row => row.name,
    valueAccessor: row => row.name,
    filterOptions: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ],
  },
  {
    id: "role",
    header: "Role",
    accessor: row => row.role,
    valueAccessor: row => row.role,
    filterOptions: [
      { label: "Manager", value: "manager" },
      { label: "Rep", value: "rep" },
    ],
  },
  {
    id: "age",
    header: "Age",
    accessor: row => row.age,
    valueAccessor: row => row.age,
  },
];

const data: Person[] = [
  { id: "1", name: "Alice", role: "Manager", age: 32 },
  { id: "2", name: "Bob", role: "Rep", age: 24 },
  { id: "3", name: "Charlie", role: "Manager", age: 28 },
];

describe("DataTable", () => {
  const renderTable = (
    overrideProps: Partial<React.ComponentProps<typeof DataTable<Person>>> = {}
  ) =>
    render(
      <ThemeProvider>
        <DataTable<Person>
          data={data}
          columns={columns}
          enableSorting
          enableColumnFilters
          enableGlobalSearch
          enablePagination
          enableColumnVisibility
          enableRowSelection
          initialPageSize={2}
          {...overrideProps}
        />
      </ThemeProvider>
    );

  it("sorts rows when header is clicked", async () => {
    renderTable();

    const nameHeader = screen.getByRole("button", { name: /^Name$/ });
    fireEvent.click(nameHeader);

    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(within(rows[0]).getByText("Alice")).toBeInTheDocument();
    });

    fireEvent.click(nameHeader);

    await waitFor(() => {
      const descRows = screen.getAllByRole("row").slice(1);
      expect(within(descRows[0]).getByText("Charlie")).toBeInTheDocument();
    });
  });

  it("filters by column option", async () => {
    renderTable();

    const roleFilterToggle = screen.getByRole("button", {
      name: /Role filters/,
    });
    fireEvent.pointerDown(roleFilterToggle);
    fireEvent.click(roleFilterToggle);

    const managerOption = await screen.findByRole("menuitemcheckbox", {
      name: /Manager/,
    });
    fireEvent.click(managerOption);

    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows).toHaveLength(2);
    });
  });

  it("applies global search across visible columns", () => {
    vi.useFakeTimers();
    renderTable();

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: "Charlie" } });

    act(() => {
      vi.runAllTimers();
    });

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("Charlie")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("handles pagination and page size changes", async () => {
    renderTable({ pageSizes: [2, 3] });

    expect(screen.getAllByRole("row").slice(1)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Next page/i }));
    await waitFor(() =>
      expect(screen.getAllByRole("row").slice(1)).toHaveLength(1)
    );

    fireEvent.click(screen.getByRole("button", { name: /Previous page/i }));
    await waitFor(() =>
      expect(screen.getAllByRole("row").slice(1)).toHaveLength(2)
    );
  });

  it("toggles column visibility", async () => {
    renderTable();

    const columnsToggle = screen.getByRole("button", { name: /Columns/i });
    fireEvent.pointerDown(columnsToggle);
    fireEvent.click(columnsToggle);
    const ageToggle = await screen.findByRole("menuitemcheckbox", {
      name: /Age/,
    });
    fireEvent.click(ageToggle);

    expect(screen.queryByText(/Age/)).not.toBeInTheDocument();
  });

  it("supports row selection via checkboxes", () => {
    const handleSelection = vi.fn();

    renderTable({ onSelectionChange: handleSelection });

    const selectAll = screen.getByRole("checkbox", { name: /Select all rows/ });
    fireEvent.click(selectAll);

    expect(handleSelection).toHaveBeenCalledWith(data);

    const firstRowCheckbox = screen.getAllByRole("checkbox", {
      name: /Select row/,
    })[0];
    fireEvent.click(firstRowCheckbox);

    expect(handleSelection).toHaveBeenCalledWith([data[1], data[2]]);
  });
});
