
'use client';

import React, { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';

export interface RadioOption<T extends string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string | number> {
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  label?: string;
}

export function RadioGroup<T extends string | number>({
  name,
  options,
  value,
  onChange,
  orientation = 'vertical',
  disabled = false,
  label,
}: RadioGroupProps<T>) {
  const radioRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const currentIdx = options.findIndex(option => option.value === value);
    let nextIdx = -1;

    if (orientation === 'vertical') {
      if (event.key === 'ArrowDown') {
        nextIdx = (currentIdx + 1) % options.length;
      } else if (event.key === 'ArrowUp') {
        nextIdx = (currentIdx - 1 + options.length) % options.length;
      }
    } else { // horizontal
      if (event.key === 'ArrowRight') {
        nextIdx = (currentIdx + 1) % options.length;
      } else if (event.key === 'ArrowLeft') {
        nextIdx = (currentIdx - 1 + options.length) % options.length;
      }
    }

    if (nextIdx !== -1 && nextIdx !== currentIdx) {
      event.preventDefault();
      const nextOption = options[nextIdx];
      if (!nextOption.disabled) {
        onChange(nextOption.value);
        radioRefs.current[nextIdx]?.focus();
      }
    }
  }, [options, value, onChange, orientation]);

  const containerClasses = `flex ${orientation === 'vertical' ? 'flex-col space-y-2' : 'space-x-2'}`;

  return (
    <div
      role="radiogroup"
      aria-labelledby={label ? `${name}-label` : undefined}
      onKeyDown={handleKeyDown}
      className={containerClasses}
    >
      {label && <span id={`${name}-label`} className="text-c-ink text-sm font-medium mb-1">{label}</span>}
      {options.map((option, index) => (
        <label
          key={String(option.value)}
          className={`
            relative flex items-center cursor-pointer select-none
            ${option.disabled || disabled ? 'opacity-50 cursor-not-allowed' : ''}
            min-h-[44px] min-w-[44px] p-2 rounded-md
            focus-within:ring-2 focus-within:ring-c-brand focus-within:ring-offset-2 focus-within:ring-offset-c-bg
          `}
        >
          <input
            type="radio"
            name={name}
            value={String(option.value)}
            checked={value === option.value}
            onChange={() => !option.disabled && !disabled && onChange(option.value)}
            disabled={option.disabled || disabled}
            ref={el => { radioRefs.current[index] = el; }}
            className="
              absolute opacity-0 w-0 h-0
              peer
            "
            aria-labelledby={`${name}-${String(option.value)}-label`}
          />
          <div
            className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${option.disabled || disabled ? 'border-c-mid bg-c-panel' : 'border-c-border bg-c-panel peer-checked:border-c-brand'}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full
                ${value === option.value && !option.disabled && !disabled ? 'bg-c-brand' : 'bg-transparent'}
              `}
            />
          </div>
          <span id={`${name}-${String(option.value)}-label`} className="ml-2 text-c-ink text-base">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
