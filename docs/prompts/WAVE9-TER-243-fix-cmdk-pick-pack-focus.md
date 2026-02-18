# TER-243: Pick & Pack Cmd+K Focus Fix

## Task Summary

Pressing Cmd+K on `/pick-pack` opens the global command palette instead of focusing the local search input because the PickPackWorkSurface's handler doesn't call `e.preventDefault()`.

## Verification Mode: STRICT

## Root Cause

Two competing Cmd+K handlers:

### Handler 1: Local (PickPackWorkSurface.tsx ~lines 707-712) — BROKEN
```typescript
'cmd+k': () => {           // <-- Takes NO event param
  searchInputRef.current?.focus();
},
'ctrl+k': () => {
  searchInputRef.current?.focus();
},
```

### Handler 2: Global (App.tsx ~line 648, via useKeyboardShortcuts)
```typescript
{ key: "k", ctrl: true, callback: () => setShowCommandPalette(true) }
```

**What happens**: Local handler fires but doesn't prevent propagation → global handler also fires → command palette opens over the search input.

**Why other WorkSurfaces work**: Every other WorkSurface calls `e.preventDefault()`. Example from OrdersWorkSurface:
```typescript
"cmd+k": e => { e.preventDefault(); searchInputRef.current?.focus(); }
```

## Changes Required

### Change 1 (PRIMARY): `client/src/components/work-surface/PickPackWorkSurface.tsx`

**Find** (~lines 707-712, inside `keyboardConfig` useMemo):
```typescript
'cmd+k': () => {
  searchInputRef.current?.focus();
},
'ctrl+k': () => {
  searchInputRef.current?.focus();
},
```

**Replace with**:
```typescript
'cmd+k': (e: React.KeyboardEvent) => {
  e.preventDefault();
  searchInputRef.current?.focus();
},
'ctrl+k': (e: React.KeyboardEvent) => {
  e.preventDefault();
  searchInputRef.current?.focus();
},
```

### Change 2 (AUDIT): `client/src/components/work-surface/ClientLedgerWorkSurface.tsx`

Check lines 750-753 for the same bug pattern. If cmd+k handler takes no event param, apply the same fix.

### Change 3 (DEFENSIVE): `client/src/components/CommandPalette.tsx`

**Line 218** — Add `autoFocus` to CommandInput:
```typescript
// BEFORE
<CommandInput placeholder="Type a command or search..." />
// AFTER
<CommandInput autoFocus placeholder="Type a command or search..." />
```

## Files NOT to Modify
- `useKeyboardShortcuts.ts` — global handler is correct
- `useWorkSurfaceKeyboard.tsx` — hook correctly passes `e` to handlers
- `App.tsx` — global Cmd+K should still open palette on pages without local override
- Do NOT use `stopPropagation()` — `preventDefault()` is sufficient

## Verification Protocol

```bash
pnpm check   # TypeScript — must pass
pnpm lint    # ESLint — must pass
pnpm test    # Unit tests — must pass
pnpm build   # Build — must succeed
```

## Manual Verification

After deployment:
1. Navigate to `/pick-pack`, press Cmd+K → search input should focus, palette should NOT open
2. Navigate to `/` (Dashboard), press Cmd+K → command palette should open with input focused

## Commit Format

```
fix(pick-pack): prevent Cmd+K from opening command palette over search focus (TER-243)
```
