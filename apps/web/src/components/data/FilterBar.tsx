'use client';
import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Filter {
  key: string;
  label: string;
  type: 'select' | 'search';
  options?: { label: string; value: string }[];
}

interface FilterBarProps {
  filters: Filter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, values, onChange, onClear }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {filters.map((filter) => (
        <div key={filter.key} className="flex-1 min-w-[200px]">
          {filter.type === 'search' ? (
            <Input
              placeholder={filter.label}
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
            />
          ) : (
            <Select
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      ))}
      {onClear && (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
};
