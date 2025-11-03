# Dashboard Preferences - Database Schema Design

**Date:** November 3, 2025  
**Feature:** Cross-Device Dashboard Preferences Synchronization  
**Status:** Design Phase

---

## Overview

This document outlines the database schema design for persisting user dashboard preferences to enable cross-device synchronization. The design follows TERP's existing Drizzle ORM patterns and MySQL conventions.

---

## Requirements

### Functional Requirements
1. Store user-specific dashboard preferences
2. Support multiple widget visibility configurations
3. Track active layout preset selection
4. Enable cross-device synchronization
5. Maintain backward compatibility with localStorage
6. Support future extensibility (custom layouts, widget settings)

### Non-Functional Requirements
1. Fast read/write performance (< 100ms)
2. Minimal database overhead
3. Type-safe with Drizzle ORM
4. Automatic timestamps for audit trail
5. JSON storage for flexible widget configuration

---

## Database Schema

### Table: `userDashboardPreferences`

**Purpose:** Store user-specific dashboard customization preferences

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| `userId` | INT | NOT NULL, UNIQUE, FOREIGN KEY → users(id) | Reference to user |
| `activeLayout` | VARCHAR(50) | NOT NULL, DEFAULT 'operations' | Active preset: 'executive', 'operations', 'sales', 'custom' |
| `widgetConfig` | JSON | NOT NULL | Array of widget visibility states |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `userId` (one preference record per user)

**Foreign Keys:**
- `userId` → `users.id` (CASCADE on delete)

---

## JSON Schema: `widgetConfig`

The `widgetConfig` column stores an array of widget objects with the following structure:

```typescript
interface WidgetConfig {
  id: string;              // Unique widget identifier
  isVisible: boolean;      // Visibility state
  order?: number;          // Display order (future use)
  settings?: {             // Widget-specific settings (future use)
    [key: string]: any;
  };
}
```

**Example JSON:**
```json
[
  {
    "id": "sales-by-client",
    "isVisible": true,
    "order": 1
  },
  {
    "id": "cash-flow",
    "isVisible": false,
    "order": 2
  },
  {
    "id": "transaction-snapshot",
    "isVisible": true,
    "order": 3
  }
]
```

---

## Drizzle Schema Definition

```typescript
// File: drizzle/schema.ts

export const userDashboardPreferences = mysqlTable("userDashboardPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  activeLayout: varchar("activeLayout", { length: 50 })
    .notNull()
    .default("operations"),
  widgetConfig: json("widgetConfig").$type<WidgetConfig[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserDashboardPreferences = typeof userDashboardPreferences.$inferSelect;
export type InsertUserDashboardPreferences = typeof userDashboardPreferences.$inferInsert;

// Relations
export const userDashboardPreferencesRelations = relations(
  userDashboardPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userDashboardPreferences.userId],
      references: [users.id],
    }),
  })
);
```

---

## Migration Strategy

### Phase 1: Schema Creation
1. Create migration file: `0002_dashboard_preferences.sql`
2. Add `userDashboardPreferences` table
3. Test migration on development database

### Phase 2: Backend Implementation
1. Add tRPC router endpoints:
   - `getPreferences` - Fetch user preferences
   - `updatePreferences` - Update user preferences
   - `resetPreferences` - Reset to default

### Phase 3: Frontend Integration
1. Update `DashboardPreferencesContext` to sync with backend
2. Implement auto-save on preference changes
3. Load preferences from backend on mount
4. Fallback to localStorage if backend unavailable

### Phase 4: Data Migration
1. No data migration needed (new feature)
2. Users will start with default preferences
3. First customization will create database record

---

## API Design

### tRPC Router: `dashboardPreferences`

```typescript
// File: server/routers/dashboardPreferences.ts

export const dashboardPreferencesRouter = router({
  // Get user's dashboard preferences
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const preferences = await ctx.db.query.userDashboardPreferences.findFirst({
        where: eq(userDashboardPreferences.userId, ctx.user.id),
      });
      
      return preferences || getDefaultPreferences();
    }),

  // Update user's dashboard preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      activeLayout: z.enum(['executive', 'operations', 'sales', 'custom']),
      widgetConfig: z.array(z.object({
        id: z.string(),
        isVisible: z.boolean(),
        order: z.number().optional(),
        settings: z.record(z.any()).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.userDashboardPreferences.findFirst({
        where: eq(userDashboardPreferences.userId, ctx.user.id),
      });

      if (existing) {
        // Update existing record
        await ctx.db
          .update(userDashboardPreferences)
          .set({
            activeLayout: input.activeLayout,
            widgetConfig: input.widgetConfig,
          })
          .where(eq(userDashboardPreferences.userId, ctx.user.id));
      } else {
        // Create new record
        await ctx.db.insert(userDashboardPreferences).values({
          userId: ctx.user.id,
          activeLayout: input.activeLayout,
          widgetConfig: input.widgetConfig,
        });
      }

      return { success: true };
    }),

  // Reset to default preferences
  resetPreferences: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db
        .delete(userDashboardPreferences)
        .where(eq(userDashboardPreferences.userId, ctx.user.id));

      return { success: true };
    }),
});
```

---

## Frontend Integration

### Context Updates

```typescript
// File: client/src/contexts/DashboardPreferencesContext.tsx

export function DashboardPreferencesProvider({ children }: Props) {
  const { data: serverPreferences, isLoading } = trpc.dashboardPreferences.getPreferences.useQuery();
  const updateMutation = trpc.dashboardPreferences.updatePreferences.useMutation();

  // Load from server, fallback to localStorage
  useEffect(() => {
    if (serverPreferences) {
      setWidgets(serverPreferences.widgetConfig);
      setActiveLayout(serverPreferences.activeLayout);
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('dashboardPreferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setWidgets(parsed.widgets);
        setActiveLayout(parsed.activeLayout);
      }
    }
  }, [serverPreferences]);

  // Auto-save to server (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateMutation.mutate({
        activeLayout,
        widgetConfig: widgets,
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [widgets, activeLayout]);

  // ...rest of context
}
```

---

## Data Flow

### Read Flow (Page Load)
1. User navigates to dashboard
2. Frontend queries `dashboardPreferences.getPreferences`
3. Backend fetches from `userDashboardPreferences` table
4. If found, return preferences; else return defaults
5. Frontend applies preferences to dashboard

### Write Flow (User Customization)
1. User toggles widget visibility or changes preset
2. Frontend updates local state immediately (optimistic update)
3. Debounced auto-save triggers after 1 second
4. Frontend calls `dashboardPreferences.updatePreferences`
5. Backend upserts to `userDashboardPreferences` table
6. Success confirmation (silent, no UI feedback needed)

### Sync Flow (Cross-Device)
1. User customizes dashboard on Device A
2. Preferences saved to database
3. User opens dashboard on Device B
4. Backend returns saved preferences
5. Dashboard on Device B matches Device A

---

## Default Preferences

```typescript
function getDefaultPreferences(): UserDashboardPreferences {
  return {
    activeLayout: 'operations',
    widgetConfig: [
      { id: 'sales-by-client', isVisible: true, order: 1 },
      { id: 'cash-flow', isVisible: true, order: 2 },
      { id: 'transaction-snapshot', isVisible: true, order: 3 },
      { id: 'inventory-snapshot', isVisible: true, order: 4 },
      { id: 'total-debt', isVisible: true, order: 5 },
      { id: 'sales-comparison', isVisible: true, order: 6 },
      { id: 'profitability', isVisible: true, order: 7 },
      { id: 'matchmaking-opportunities', isVisible: true, order: 8 },
    ],
  };
}
```

---

## Performance Considerations

### Optimization Strategies
1. **Single Record Per User:** Unique constraint on `userId` ensures one row per user
2. **JSON Storage:** Flexible and efficient for widget configuration
3. **Debounced Saves:** Prevent excessive database writes (1 second debounce)
4. **Optimistic Updates:** UI responds instantly, sync happens in background
5. **Query Caching:** tRPC caches preferences, reduces database hits

### Expected Performance
- **Read:** < 10ms (indexed query on userId)
- **Write:** < 50ms (single row upsert)
- **Storage:** ~1KB per user (minimal overhead)

---

## Security Considerations

1. **Authentication:** All endpoints use `protectedProcedure` (requires auth)
2. **Authorization:** Users can only access their own preferences
3. **Input Validation:** Zod schemas validate all inputs
4. **SQL Injection:** Drizzle ORM prevents SQL injection
5. **Data Privacy:** Preferences contain no sensitive data

---

## Testing Strategy

### Unit Tests
- [ ] Test default preferences generation
- [ ] Test preference serialization/deserialization
- [ ] Test widget config validation

### Integration Tests
- [ ] Test tRPC endpoint: `getPreferences`
- [ ] Test tRPC endpoint: `updatePreferences`
- [ ] Test tRPC endpoint: `resetPreferences`
- [ ] Test foreign key cascade on user deletion

### E2E Tests
- [ ] Test preference save on widget toggle
- [ ] Test preference load on page refresh
- [ ] Test cross-device sync (two browser windows)
- [ ] Test fallback to localStorage when offline

---

## Rollout Plan

### Phase 1: Backend (This Phase)
- [x] Design schema
- [ ] Create migration
- [ ] Implement tRPC router
- [ ] Test endpoints

### Phase 2: Frontend Integration
- [ ] Update DashboardPreferencesContext
- [ ] Implement auto-save
- [ ] Add loading states
- [ ] Test sync behavior

### Phase 3: Production Deployment
- [ ] Run migration on production database
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor for errors

### Phase 4: Validation
- [ ] Verify cross-device sync
- [ ] Monitor performance metrics
- [ ] Collect user feedback

---

## Future Enhancements

### Short-Term
1. **Multiple Custom Layouts:** Allow users to save multiple named layouts
2. **Widget Settings:** Per-widget configuration (e.g., default time periods)
3. **Import/Export:** Allow users to export/import configurations

### Long-Term
1. **Team Sharing:** Share dashboard configurations with team members
2. **Templates:** Pre-built dashboard templates for different roles
3. **Analytics:** Track which widgets are most/least used

---

## Appendix: SQL Migration Script

```sql
-- File: drizzle/migrations/0002_dashboard_preferences.sql

CREATE TABLE `userDashboardPreferences` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `activeLayout` VARCHAR(50) NOT NULL DEFAULT 'operations',
  `widgetConfig` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_userDashboardPreferences_userId`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_userDashboardPreferences_userId` ON `userDashboardPreferences`(`userId`);
```

---

**Design Status:** ✅ COMPLETE  
**Next Phase:** Implementation (Migration + tRPC Router)  
**Estimated Effort:** 2-3 hours
