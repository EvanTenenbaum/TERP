/**
 * ActiveFiltersIndicator - INV-FILTER-004
 * Displays a prominent banner when inventory filters are active
 * Helps users understand why they may not see expected items
 */
import React from "react";

type ActiveFilters = {
  status?: string[];
  category?: string | null;
  subcategory?: string | null;
  vendor?: string[];
  brand?: string[];
  grade?: string[];
  search?: string | null;
};

type ActiveFiltersIndicatorProps = {
  filters: ActiveFilters;
  onClearAll: () => void;
};

const ActiveFiltersIndicator: React.FC<ActiveFiltersIndicatorProps> = ({
  filters,
  onClearAll,
}) => {
  const activeFilters: { label: string; value: string }[] = [];

  const addFilter = (label: string, value?: string | null) => {
    if (value && value.trim().length > 0) {
      activeFilters.push({ label, value: value.trim() });
    }
  };

  addFilter(
    "Status",
    filters.status && filters.status.length > 0
      ? filters.status.join(", ")
      : null
  );
  addFilter("Category", filters.category);
  addFilter("Subcategory", filters.subcategory);
  addFilter(
    "Vendor",
    filters.vendor && filters.vendor.length > 0
      ? filters.vendor.join(", ")
      : null
  );
  addFilter(
    "Brand",
    filters.brand && filters.brand.length > 0 ? filters.brand.join(", ") : null
  );
  addFilter(
    "Grade",
    filters.grade && filters.grade.length > 0 ? filters.grade.join(", ") : null
  );
  addFilter("Search", filters.search);

  if (activeFilters.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-amber-900">
            !
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Filters Active
            </p>
            <p className="text-sm leading-relaxed text-amber-900">
              {activeFilters.map((item, idx) => (
                <React.Fragment key={`${item.label}-${item.value}`}>
                  <span className="font-semibold">{item.label}:</span>{" "}
                  {item.value}
                  {idx < activeFilters.length - 1 && (
                    <span className="mx-2 text-amber-700">|</span>
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
};

export default ActiveFiltersIndicator;
