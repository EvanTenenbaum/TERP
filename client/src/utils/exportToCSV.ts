/**
 * Export data to CSV file
 * Handles special characters, quotes, and commas properly
 */

/**
 * Escape CSV field value
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: Record<string, unknown>[], headers: string[]): string {
  // Create header row
  const headerRow = headers.map(escapeCSVField).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => escapeCSVField(row[header])).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create a link to the file
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export data to CSV file
 * 
 * @param data - Array of objects to export
 * @param headers - Array of header names (keys from objects)
 * @param filename - Name of the file (without extension)
 */
export function exportToCSV(data: Record<string, unknown>[], headers: string[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  const csvContent = arrayToCSV(data, headers);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fullFilename = `${filename}_${timestamp}.csv`;
  
  downloadCSV(csvContent, fullFilename);
}

/**
 * Export data with custom header labels
 * 
 * @param data - Array of objects to export
 * @param columns - Array of {key: string, label: string} for mapping
 * @param filename - Name of the file (without extension)
 */
export function exportToCSVWithLabels(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  filename: string
) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  // Create header row with labels
  const headerRow = columns.map(col => escapeCSVField(col.label)).join(',');
  
  // Create data rows using keys
  const dataRows = data.map(row => {
    return columns.map(col => escapeCSVField(row[col.key])).join(',');
  });
  
  const csvContent = [headerRow, ...dataRows].join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.csv`;
  
  downloadCSV(csvContent, fullFilename);
}

