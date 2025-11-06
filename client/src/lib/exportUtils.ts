/**
 * Export utilities for TERP
 * Handles CSV export functionality
 */

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // If columns not specified, use all keys from first object
  const cols =
    columns ||
    Object.keys(data[0]).map(key => ({
      key: key as keyof T,
      label: key,
    }));

  // Create CSV header
  const header = cols.map(col => col.label).join(",");

  // Create CSV rows
  const rows = data.map(row =>
    cols
      .map(col => {
        const value = row[col.key];
        // Handle null/undefined
        if (value === null || value === undefined) return "";

        let stringValue = String(value);

        // CSV Injection Protection: Sanitize formula characters
        // If value starts with =, +, -, @, or tab, prefix with single quote
        if (/^[=+\-@\t]/.test(stringValue)) {
          stringValue = "'" + stringValue;
        }

        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  // Combine header and rows
  const csv = [header, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
