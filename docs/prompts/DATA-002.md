# DATA-002: Seed Comments and Dashboard Tables

**Task ID:** DATA-002  
**Priority:** P2 (Medium)  
**Estimate:** 2-4 hours  
**Status:** ready  
**Depends On:** INFRA-003 (must complete first)

---

## Objective

Seed 5 high-value tables with realistic data for recently-fixed features:

1. `comments` - 100+ comments on orders, clients, events
2. `comment_mentions` - @mentions in comments
3. `userDashboardPreferences` - User dashboard settings
4. `dashboard_widget_layouts` - Custom dashboard layouts
5. `dashboard_kpi_configs` - KPI widget configurations

---

## Context

**Why This Matters:**

- Comments feature just fixed (QA-012: Comment display, QA-013: Comment mentions)
- Dashboard widgets just fixed (QA-002: Widget visibility, QA-004: Dashboard buttons, QA-034: Widget disappearing)
- These features currently have NO DATA, making them untestable and un-demoable

**Current State:**

- Comments tables: EMPTY (0 records)
- Dashboard tables: EMPTY (0 records)
- Users: 4 users exist
- Clients: 50 clients exist
- Orders: 0 orders (were cleared during seeding attempts)
- Events: 329 events exist

---

## Deliverables

1. ✅ `scripts/seed-comments-dashboard.ts` - Simple, working seed script
2. ✅ 100+ comments seeded across entities
3. ✅ Comment mentions configured for all users
4. ✅ Dashboard preferences for all users
5. ✅ Custom dashboard layouts (2-3 per user)
6. ✅ KPI widget configs (5-10 per user)
7. ✅ Validation that features work with seeded data
8. ✅ Roadmap updated to complete

---

## Implementation Protocol

### ⚠️ PREREQUISITE: Wait for INFRA-003

**DO NOT START until INFRA-003 is complete!**

Check that INFRA-003 has:

- ✅ Fixed schema sync issues
- ✅ Run migrations successfully
- ✅ Schema validation passing

If INFRA-003 is not complete, WAIT. Starting early will cause schema errors.

---

### Phase 1: Setup & Validation (15 min)

**Step 1.1: Register session**

```bash
cd /home/ubuntu/TERP
echo "- DATA-002: Session-$(date +%Y%m%d)-DATA-002-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-002 session"
git push origin main
```

**Step 1.2: Verify schema is ready**

```bash
# Run schema validation (created by INFRA-003)
pnpm exec tsx scripts/validate-schema-sync.ts

# Should output: ✅ Schema is in sync!
# If not, STOP and wait for INFRA-003
```

**Step 1.3: Check existing data**

```typescript
// Quick check script
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

const users = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
const clients = await db.execute(sql`SELECT COUNT(*) as count FROM clients`);
const events = await db.execute(
  sql`SELECT COUNT(*) as count FROM calendar_events`
);

console.log(`Users: ${users[0][0].count}`);
console.log(`Clients: ${clients[0][0].count}`);
console.log(`Events: ${events[0][0].count}`);
```

---

### Phase 2: Seed Comments (45-60 min)

**Step 2.1: Create seed script**

```typescript
// scripts/seed-comments-dashboard.ts
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING COMMENTS & DASHBOARD ===\n");

async function seedCommentsAndDashboard() {
  // Get existing IDs
  const usersResult = await db.execute(
    sql`SELECT id, name FROM users LIMIT 10`
  );
  const users = usersResult[0] as any[];
  const userIds = users.map(u => u.id);

  const clientsResult = await db.execute(
    sql`SELECT id, name FROM clients LIMIT 50`
  );
  const clients = clientsResult[0] as any[];
  const clientIds = clients.map(c => c.id);

  const eventsResult = await db.execute(
    sql`SELECT id, title FROM calendar_events LIMIT 100`
  );
  const events = eventsResult[0] as any[];
  const eventIds = events.map(e => e.id);

  console.log(`✓ Found ${userIds.length} users`);
  console.log(`✓ Found ${clientIds.length} clients`);
  console.log(`✓ Found ${eventIds.length} events\n`);

  // Seed comments on clients
  console.log("🔵 Seeding client comments...");
  const clientComments = [
    { entity_type: "client", content: "Great customer, always pays on time." },
    {
      entity_type: "client",
      content: "Prefers email communication over phone.",
    },
    {
      entity_type: "client",
      content: "Interested in bulk pricing for next quarter.",
    },
    {
      entity_type: "client",
      content: "New contact: Sarah Johnson, sarah@example.com.",
    },
    {
      entity_type: "client",
      content: "Requested product samples for evaluation.",
    },
    { entity_type: "client", content: "VIP customer - priority service." },
    { entity_type: "client", content: "Payment terms: Net 30, prefers ACH." },
    { entity_type: "client", content: "Annual contract renewal due in Q1." },
  ];

  let commentCount = 0;
  for (let i = 0; i < Math.min(clientIds.length, 20); i++) {
    const comment = clientComments[i % clientComments.length];
    await db.execute(sql`
      INSERT INTO comments (entity_type, entity_id, user_id, content)
      VALUES (${comment.entity_type}, ${clientIds[i]}, ${userIds[0]}, ${comment.content})
    `);
    commentCount++;
  }
  console.log(`✓ Inserted ${commentCount} client comments\n`);

  // Seed comments on events
  console.log("🔵 Seeding event comments...");
  const eventComments = [
    {
      entity_type: "event",
      content: "Confirmed attendance, will bring samples.",
    },
    {
      entity_type: "event",
      content: "Rescheduled to next week due to conflict.",
    },
    {
      entity_type: "event",
      content: "Client requested virtual meeting instead.",
    },
    { entity_type: "event", content: "Agenda sent, waiting for confirmation." },
    { entity_type: "event", content: "Follow-up scheduled for next month." },
  ];

  for (let i = 0; i < Math.min(eventIds.length, 30); i++) {
    const comment = eventComments[i % eventComments.length];
    await db.execute(sql`
      INSERT INTO comments (entity_type, entity_id, user_id, content)
      VALUES (${comment.entity_type}, ${eventIds[i]}, ${userIds[0]}, ${comment.content})
    `);
    commentCount++;
  }
  console.log(`✓ Inserted ${commentCount} total comments\n`);

  // Seed comment mentions (if multiple users)
  if (userIds.length > 1) {
    console.log("🔵 Seeding comment mentions...");
    const commentsResult = await db.execute(
      sql`SELECT id FROM comments ORDER BY id DESC LIMIT 20`
    );
    const commentIds = (commentsResult[0] as any[]).map(c => c.id);

    let mentionCount = 0;
    for (const commentId of commentIds) {
      const mentionedUser = userIds[1]; // Mention second user
      await db.execute(sql`
        INSERT INTO comment_mentions (comment_id, mentioned_user_id)
        VALUES (${commentId}, ${mentionedUser})
      `);
      mentionCount++;
    }
    console.log(`✓ Inserted ${mentionCount} comment mentions\n`);
  }
}
```

**Step 2.2: Run comment seeding**

```bash
pnpm exec tsx scripts/seed-comments-dashboard.ts
```

**Step 2.3: Verify comments**

```sql
SELECT COUNT(*) FROM comments;
SELECT COUNT(*) FROM comment_mentions;
SELECT entity_type, COUNT(*) FROM comments GROUP BY entity_type;
```

---

### Phase 3: Seed Dashboard Tables (45-60 min)

**Step 3.1: Add dashboard seeding to script**

```typescript
// Add to seed-comments-dashboard.ts

async function seedDashboard() {
  const usersResult = await db.execute(sql`SELECT id FROM users`);
  const userIds = (usersResult[0] as any[]).map(u => u.id);

  console.log("🔵 Seeding user dashboard preferences...");

  for (const userId of userIds) {
    // Create default dashboard preference
    await db.execute(sql`
      INSERT INTO userDashboardPreferences (user_id, default_view, theme, refresh_interval)
      VALUES (${userId}, 'overview', 'light', 300)
    `);

    // Create custom layouts
    const layouts = [
      {
        name: "Sales Overview",
        layout_config: JSON.stringify({
          widgets: ["revenue", "orders", "clients"],
        }),
      },
      {
        name: "Operations Dashboard",
        layout_config: JSON.stringify({
          widgets: ["inventory", "fulfillment", "quality"],
        }),
      },
    ];

    for (const layout of layouts) {
      await db.execute(sql`
        INSERT INTO dashboard_widget_layouts (user_id, name, layout_config)
        VALUES (${userId}, ${layout.name}, ${layout.layout_config})
      `);
    }

    // Create KPI configs
    const kpis = [
      {
        widget_type: "revenue",
        config: JSON.stringify({ period: "month", target: 100000 }),
      },
      {
        widget_type: "orders",
        config: JSON.stringify({ period: "week", target: 50 }),
      },
      {
        widget_type: "clients",
        config: JSON.stringify({ period: "month", target: 10 }),
      },
      {
        widget_type: "inventory",
        config: JSON.stringify({ threshold: "low", alert: true }),
      },
      {
        widget_type: "fulfillment",
        config: JSON.stringify({ status: "pending", limit: 20 }),
      },
    ];

    for (const kpi of kpis) {
      await db.execute(sql`
        INSERT INTO dashboard_kpi_configs (user_id, widget_type, config)
        VALUES (${userId}, ${kpi.widget_type}, ${kpi.config})
      `);
    }
  }

  console.log(`✓ Seeded dashboard for ${userIds.length} users\n`);
}
```

**Step 3.2: Run dashboard seeding**

```bash
pnpm exec tsx scripts/seed-comments-dashboard.ts
```

**Step 3.3: Verify dashboard data**

```sql
SELECT COUNT(*) FROM userDashboardPreferences;
SELECT COUNT(*) FROM dashboard_widget_layouts;
SELECT COUNT(*) FROM dashboard_kpi_configs;
```

---

### Phase 4: Testing & Validation (30 min)

**Step 4.1: Test comments feature**

1. Open the app
2. Navigate to a client page
3. Verify comments appear
4. Check that @mentions work
5. Try adding a new comment

**Step 4.2: Test dashboard**

1. Open dashboard
2. Verify widgets appear
3. Check custom layouts
4. Verify KPI configs work
5. Try customizing dashboard

**Step 4.3: Validate data quality**

```bash
# Check comment distribution
SELECT entity_type, COUNT(*) as count
FROM comments
GROUP BY entity_type;

# Check dashboard coverage
SELECT COUNT(DISTINCT user_id) as users_with_dashboards
FROM userDashboardPreferences;

# Verify mentions
SELECT COUNT(*) as mentions
FROM comment_mentions;
```

---

### Phase 5: Documentation & Completion (15 min)

**Step 5.1: Update roadmap**

Edit `docs/roadmaps/MASTER_ROADMAP.md`:

```markdown
### DATA-002: Seed Comments and Dashboard Tables

**Status:** ✅ Complete (2025-11-17)

**Resolution:** Successfully seeded 5 tables with realistic data:

- comments: 50+ comments on clients and events
- comment_mentions: 20+ mentions configured
- userDashboardPreferences: 4 user preferences
- dashboard_widget_layouts: 8 custom layouts
- dashboard_kpi_configs: 20 KPI widgets

Comments and dashboard features now have data for testing and demos. See scripts/seed-comments-dashboard.ts for implementation.
```

**Step 5.2: Archive session**

```bash
# Move session file
mv docs/sessions/active/Session-*-DATA-002-*.md docs/sessions/completed/

# Remove from ACTIVE_SESSIONS.md
# (edit the file to remove the DATA-002 line)

# Commit
git add -A
git commit -m "Complete DATA-002: Seed comments and dashboard tables

- Seeded 50+ comments on clients and events
- Configured comment mentions for all users
- Created dashboard preferences for 4 users
- Added 8 custom dashboard layouts
- Configured 20 KPI widgets
- All features now testable with realistic data"
git push origin main
```

---

## Success Criteria

- [ ] 50+ comments seeded across clients and events
- [ ] Comment mentions configured
- [ ] Dashboard preferences for all users
- [ ] 2+ custom layouts per user
- [ ] 5+ KPI configs per user
- [ ] Comments feature works in app
- [ ] Dashboard features work in app
- [ ] Roadmap updated to complete
- [ ] Session archived

---

## Important Notes

⚠️ **Wait for INFRA-003 to complete before starting!**

If you start before INFRA-003, you may encounter:

- Schema mismatch errors
- Missing columns
- Failed inserts

**Coordination with DATA-003:**

- DATA-002 and DATA-003 can run in parallel
- No conflicts (different tables)
- Both should start AFTER INFRA-003 completes

---

## Estimated Time

- Phase 1: 15 min (setup)
- Phase 2: 45-60 min (seed comments)
- Phase 3: 45-60 min (seed dashboard)
- Phase 4: 30 min (testing)
- Phase 5: 15 min (documentation)

**Total: 2-4 hours**

---

Good luck! This will make the recently-fixed comment and dashboard features fully testable and demoable.
