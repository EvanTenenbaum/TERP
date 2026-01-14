# Date Formatting Quick Reference Guide

**Last Updated:** 2026-01-14
**Related:** UX-012 Period Display Formatting Fix

---

## Quick Start

### Import the Utility

```typescript
// Preferred - full feature set
import { formatDate, formatDateTime, formatDateRange } from "@/lib/dateFormat";

// Alternative - backward compatible
import { formatDate } from "@/lib/utils";
```

---

## Common Use Cases

### 1. **Display a Date**

```typescript
import { formatDate } from "@/lib/dateFormat";

// Medium format (default): "Jan 15, 2024"
{formatDate(invoice.invoiceDate)}

// Short format: "Jan 15"
{formatDate(invoice.invoiceDate, "short")}

// Long format: "January 15, 2024"
{formatDate(invoice.invoiceDate, "long")}

// Full format: "Monday, January 15, 2024"
{formatDate(invoice.invoiceDate, "full")}
```

### 2. **Display Date with Time**

```typescript
import { formatDateTime } from "@/lib/dateFormat";

// Medium date, short time: "Jan 15, 2024 3:45 PM"
{formatDateTime(order.createdAt)}

// Short date, short time: "Jan 15 3:45 PM"
{formatDateTime(order.createdAt, "short", "short")}

// Long date, medium time: "January 15, 2024 3:45:30 PM"
{formatDateTime(order.createdAt, "long", "medium")}
```

### 3. **Display a Date Range (Period)**

```typescript
import { formatDateRange } from "@/lib/dateFormat";

// "Jan 1, 2024 - Mar 31, 2024"
{formatDateRange(period.startDate, period.endDate)}

// With long format: "January 1, 2024 - March 31, 2024"
{formatDateRange(period.startDate, period.endDate, "long")}
```

### 4. **Display Relative Time**

```typescript
import { formatRelativeTime } from "@/lib/dateFormat";

// "2 hours ago", "3 days ago", "in 5 minutes"
{formatRelativeTime(comment.createdAt)}

// Without "ago" suffix
{formatRelativeTime(comment.createdAt, false)}
```

### 5. **Display Time Only**

```typescript
import { formatTime } from "@/lib/dateFormat";

// "3:45 PM"
{formatTime(appointment.startTime)}

// "3:45:30 PM" (with seconds)
{formatTime(appointment.startTime, "medium")}

// "15:45:30" (24-hour format)
{formatTime(appointment.startTime, "long")}
```

### 6. **Display Quarter**

```typescript
import { formatQuarter } from "@/lib/dateFormat";

// "Q1 2024"
{formatQuarter(fiscalPeriod.startDate)}
```

### 7. **Display Month and Year**

```typescript
import { formatMonthYear } from "@/lib/dateFormat";

// "January 2024"
{formatMonthYear(report.date)}

// "Jan 2024" (short)
{formatMonthYear(report.date, "short")}
```

---

## Advanced Usage

### User Preferences

```typescript
import {
  getDateFormatPreference,
  setDateFormatPreference
} from "@/lib/dateFormat";

// Get current preference
const preference = getDateFormatPreference(); // "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"

// Set user preference
setDateFormatPreference("DD/MM/YYYY");

// formatDate will automatically use the user's preference
{formatDate(date)} // Will format according to user preference
```

### API Formatting (ISO 8601)

```typescript
import { formatForAPI } from "@/lib/dateFormat";

// Convert date to ISO string for API calls
const isoString = formatForAPI(userInput); // "2024-01-15T00:00:00.000Z"
```

### Validation

```typescript
import { isValidDate } from "@/lib/dateFormat";

if (isValidDate(userInput)) {
  // Process valid date
} else {
  // Show error
}
```

### Start/End of Day

```typescript
import { getStartOfDay, getEndOfDay } from "@/lib/dateFormat";

const dayStart = getStartOfDay(date); // 2024-01-15 00:00:00
const dayEnd = getEndOfDay(date);     // 2024-01-15 23:59:59
```

---

## Migration Examples

### Example 1: Simple Date Display

**Before:**
```typescript
const formatDate = (dateStr: Date | string) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return format(date, "MMM dd, yyyy");
};

return <span>{formatDate(invoice.invoiceDate)}</span>;
```

**After:**
```typescript
import { formatDate } from "@/lib/dateFormat";

return <span>{formatDate(invoice.invoiceDate)}</span>;
```

### Example 2: Date Range

**Before:**
```typescript
const formatDateRange = (start: string | Date, end: string | Date) => {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

return <span>{formatDateRange(period.startDate, period.endDate)}</span>;
```

**After:**
```typescript
import { formatDateRange } from "@/lib/dateFormat";

return <span>{formatDateRange(period.startDate, period.endDate)}</span>;
```

### Example 3: Relative Time

**Before:**
```typescript
import { formatDistanceToNow } from "date-fns";

return (
  <span>
    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
  </span>
);
```

**After:**
```typescript
import { formatRelativeTime } from "@/lib/dateFormat";

return <span>{formatRelativeTime(comment.createdAt)}</span>;
```

### Example 4: DateTime with Custom Format

**Before:**
```typescript
const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

return <span>{formatDateTime(data.lastUpdated)}</span>;
```

**After:**
```typescript
import { formatDateTime } from "@/lib/dateFormat";

return <span>{formatDateTime(data.lastUpdated, "short", "short")}</span>;
```

---

## Style Options Reference

### DateFormatStyle

- **`"short"`** - Minimal format
  - `MM/DD/YYYY`: "01/15"
  - `DD/MM/YYYY`: "15/01"
  - `YYYY-MM-DD`: "01-15"

- **`"medium"`** - Default format (most common)
  - `MM/DD/YYYY`: "01/15/2024"
  - `DD/MM/YYYY`: "15/01/2024"
  - `YYYY-MM-DD`: "2024-01-15"

- **`"long"`** - Readable format
  - All preferences: "January 15, 2024"

- **`"full"`** - Complete format with day name
  - All preferences: "Monday, January 15, 2024"

### TimeFormatStyle

- **`"short"`** - "3:45 PM"
- **`"medium"`** - "3:45:30 PM"
- **`"long"`** - "15:45:30" (24-hour)

---

## Best Practices

### ✅ DO

- Import from `@/lib/dateFormat` for new code
- Use style parameters instead of custom formatters
- Use `formatRelativeTime` for timestamps ("2 hours ago")
- Use `formatDateRange` for periods
- Use `formatForAPI` when sending dates to backend

### ❌ DON'T

- Create local `formatDate` functions
- Use `toLocaleString()` for dates (ok for currency)
- Import `format` from date-fns directly in components
- Mix different formatting approaches in the same file
- Forget to handle null/undefined dates (utility handles it)

---

## Type Definitions

```typescript
// Date format preferences
type DateFormatPreference = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

// Style options
type DateFormatStyle = "short" | "medium" | "long" | "full";
type TimeFormatStyle = "short" | "medium" | "long";

// Input types (all functions accept these)
type DateInput = Date | string | null | undefined;
```

---

## Error Handling

All formatting functions handle errors gracefully:

```typescript
formatDate(null)           // Returns "N/A"
formatDate(undefined)      // Returns "N/A"
formatDate("invalid")      // Returns "Invalid date"
formatDate(new Date(""))   // Returns "Invalid date"
```

---

## Common Patterns

### Conditional Formatting

```typescript
// If date might be null
{formatDate(optionalDate)}  // Shows "N/A" if null

// Custom fallback
{formatDate(optionalDate) !== "N/A" ? formatDate(optionalDate) : "Not set"}
```

### Table Cells

```typescript
<TableCell>
  {formatDate(invoice.invoiceDate, "long")}
</TableCell>
<TableCell>
  {formatDateTime(order.createdAt, "medium", "short")}
</TableCell>
```

### Form Labels

```typescript
<Label>
  Period: {formatDateRange(period.startDate, period.endDate)}
</Label>
```

### Tooltips

```typescript
<Tooltip>
  <TooltipTrigger>
    {formatRelativeTime(update.timestamp)}
  </TooltipTrigger>
  <TooltipContent>
    {formatDateTime(update.timestamp, "long", "medium")}
  </TooltipContent>
</Tooltip>
```

---

## Questions?

For issues or questions about date formatting:
1. Check this guide first
2. Review `/client/src/lib/dateFormat.ts` for full API
3. See implementation examples in accounting pages
4. Refer to UX-012 implementation summary

---

**Remember:** Consistency is key! Use the centralized utility to ensure dates display uniformly across TERP.
