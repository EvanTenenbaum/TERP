# table.tsx — Exact Diff

The single highest-impact change in the entire evolution. These 4 lines cascade density to all 11 Work Surfaces.

## Current (`client/src/components/ui/table.tsx`)

```tsx
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}
```

## Evolved

```tsx
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-[var(--density-row-h)] px-[var(--density-cell-px)] text-left align-middle font-medium text-[length:var(--density-font-size)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-[var(--density-cell-px)] py-[var(--density-cell-py)] align-middle text-[length:var(--density-font-size)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}
```

## Why It Works

The `:root` block in `index.css` defines comfortable defaults (`--density-row-h: 2.5rem`, etc.) that match the current hardcoded values exactly. When the `.density-compact` class is absent, the UI is pixel-identical to today. When DensityContext adds the class, the compact overrides activate and every table in the app tightens simultaneously.

The `text-[length:var(--density-font-size)]` syntax uses Tailwind's arbitrary value with the `length:` type hint, which is required because Tailwind can't infer the type from a CSS variable.
