'use client';
import React from 'react';
import { Badge } from '../ui/Badge';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  keyExtractor?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  keyExtractor = (row) => row.id || String(Math.random()),
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Data table">
      <table className="w-full" role="table">
        <thead className="border-b border-[var(--c-border)]">
          <tr role="row">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                className="text-left px-4 py-3 text-sm font-medium text-[var(--c-mid)]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              role="row"
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              className={`border-b border-[var(--c-border)] ${
                onRowClick ? 'cursor-pointer hover:bg-[var(--c-panel)] transition-colors focus:outline-none focus:ring-2 focus:ring-c-brand' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} role="cell" className="px-4 py-3 text-sm text-[var(--c-ink)]">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
