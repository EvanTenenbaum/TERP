import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection({
  uri: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(connection);

console.log("🌱 Starting DATA-002: Seed Comments & Dashboard Tables\n");

// Phase 1: Verify schema
console.log("📋 Phase 1: Verifying schema...");
const tablesResult = await db.execute(sql`
  SELECT TABLE_NAME FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = 'defaultdb' 
  AND TABLE_NAME IN ('comments', 'comment_mentions', 'userDashboardPreferences', 'dashboard_widget_layouts', 'dashboard_kpi_configs')
`);
const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
  t => t.TABLE_NAME
);
console.log(
  `✓ Found ${tables.length}/5 required tables: ${tables.join(", ")}\n`
);

// Phase 2: Seed Comments
async function seedComments() {
  console.log("📝 Phase 2: Seeding comments...");

  // Get existing users
  const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 10`);
  const userIds = (usersResult[0] as { id: number }[]).map(u => u.id);

  if (userIds.length === 0) {
    console.log("⚠️  No users found, skipping comment seeding\n");
    return;
  }

  console.log(`Found ${userIds.length} users to use for comments\n`);

  // Sample comments for different commentable types
  const clientComments = [
    {
      commentable_type: "Client",
      content: "Great client, always pays on time!",
    },
    {
      commentable_type: "Client",
      content: "Needs follow-up on outstanding invoice",
    },
    {
      commentable_type: "Client",
      content: "VIP client - prioritize their orders",
    },
    {
      commentable_type: "Client",
      content: "Requested bulk discount for next order",
    },
    { commentable_type: "Client", content: "Happy with product quality" },
  ];

  const eventComments = [
    {
      commentable_type: "CalendarEvent",
      content: "Meeting went well, client is interested in new products",
    },
    { commentable_type: "CalendarEvent", content: "Rescheduled to next week" },
    {
      commentable_type: "CalendarEvent",
      content: "Client requested product samples",
    },
    {
      commentable_type: "CalendarEvent",
      content: "Follow-up needed on pricing discussion",
    },
  ];

  // Get some clients
  const clientsResult = await db.execute(sql`SELECT id FROM clients LIMIT 20`);
  const clientIds = (clientsResult[0] as { id: number }[]).map(c => c.id);

  let commentCount = 0;

  // Seed client comments
  if (clientIds.length > 0) {
    console.log("🔵 Seeding client comments...");
    for (let i = 0; i < Math.min(clientIds.length, 20); i++) {
      const comment = clientComments[i % clientComments.length];
      await db.execute(sql`
        INSERT INTO comments (commentable_type, commentable_id, user_id, content)
        VALUES (${comment.commentable_type}, ${clientIds[i]}, ${userIds[0]}, ${comment.content})
      `);
      commentCount++;
    }
  }

  // Get some calendar events
  const eventsResult = await db.execute(
    sql`SELECT id FROM calendar_events LIMIT 30`
  );
  const eventIds = (eventsResult[0] as { id: number }[]).map(e => e.id);

  // Seed event comments
  if (eventIds.length > 0) {
    console.log("🔵 Seeding calendar event comments...");
    for (let i = 0; i < Math.min(eventIds.length, 30); i++) {
      const comment = eventComments[i % eventComments.length];
      await db.execute(sql`
        INSERT INTO comments (commentable_type, commentable_id, user_id, content)
        VALUES (${comment.commentable_type}, ${eventIds[i]}, ${userIds[0]}, ${comment.content})
      `);
      commentCount++;
    }
  }

  console.log(`✓ Inserted ${commentCount} total comments\n`);

  // Seed comment mentions (if multiple users)
  if (userIds.length > 1 && commentCount > 0) {
    console.log("🔵 Seeding comment mentions...");
    const commentsResult = await db.execute(
      sql`SELECT id FROM comments ORDER BY id DESC LIMIT 20`
    );
    const commentIds = (commentsResult[0] as { id: number }[]).map(c => c.id);

    let mentionCount = 0;
    for (const commentId of commentIds) {
      const mentionedUser = userIds[1]; // Mention second user
      const mentionedByUser = userIds[0]; // Mentioned by first user
      await db.execute(sql`
        INSERT INTO comment_mentions (comment_id, mentioned_user_id, mentioned_by_user_id)
        VALUES (${commentId}, ${mentionedUser}, ${mentionedByUser})
      `);
      mentionCount++;
    }
    console.log(`✓ Inserted ${mentionCount} comment mentions\n`);
  }
}

// Phase 3: Seed Dashboard
async function seedDashboard() {
  console.log("📊 Phase 3: Seeding dashboard tables...");

  const usersResult = await db.execute(sql`SELECT id FROM users`);
  const userIds = (usersResult[0] as { id: number }[]).map(u => u.id);

  if (userIds.length === 0) {
    console.log("⚠️  No users found, skipping dashboard seeding\n");
    return;
  }

  console.log(`Found ${userIds.length} users for dashboard setup\n`);

  console.log("🔵 Seeding user dashboard preferences...");
  for (const userId of userIds) {
    // Create default dashboard preference
    const widgetConfig = JSON.stringify({
      theme: "light",
      refreshInterval: 300,
      widgets: ["revenue", "orders", "inventory"],
    });

    await db.execute(sql`
      INSERT INTO userDashboardPreferences (userId, activeLayout, widgetConfig)
      VALUES (${userId}, 'operations', ${widgetConfig})
      ON DUPLICATE KEY UPDATE activeLayout = 'operations'
    `);
  }

  console.log(`✓ Seeded dashboard preferences for ${userIds.length} users\n`);

  // Seed widget layouts for users
  console.log("🔵 Seeding dashboard widget layouts...");
  const widgetTypes = [
    { type: "revenue", position: 1, width: 2, height: 1 },
    { type: "orders", position: 2, width: 2, height: 1 },
    { type: "clients", position: 3, width: 2, height: 1 },
    { type: "inventory", position: 4, width: 2, height: 2 },
    { type: "fulfillment", position: 5, width: 2, height: 2 },
  ];

  let widgetCount = 0;
  for (const userId of userIds) {
    for (const widget of widgetTypes) {
      const config = JSON.stringify({
        title: widget.type.charAt(0).toUpperCase() + widget.type.slice(1),
        refreshInterval: 60,
      });

      await db.execute(sql`
        INSERT INTO dashboard_widget_layouts (userId, role, widgetType, position, width, height, isVisible, config)
        VALUES (${userId}, 'user', ${widget.type}, ${widget.position}, ${widget.width}, ${widget.height}, 1, ${config})
      `);
      widgetCount++;
    }
  }

  console.log(`✓ Seeded ${widgetCount} widget layouts\n`);

  // Seed KPI configs for roles
  console.log("🔵 Seeding dashboard KPI configs...");
  const kpiTypes = [
    { role: "user", type: "total_revenue", position: 1 },
    { role: "user", type: "active_orders", position: 2 },
    { role: "user", type: "inventory_value", position: 3 },
    { role: "admin", type: "total_revenue", position: 1 },
    { role: "admin", type: "active_orders", position: 2 },
    { role: "admin", type: "inventory_value", position: 3 },
    { role: "admin", type: "user_count", position: 4 },
    { role: "admin", type: "system_health", position: 5 },
  ];

  for (const kpi of kpiTypes) {
    await db.execute(sql`
      INSERT INTO dashboard_kpi_configs (role, kpiType, position, isVisible)
      VALUES (${kpi.role}, ${kpi.type}, ${kpi.position}, 1)
    `);
  }

  console.log(`✓ Seeded ${kpiTypes.length} KPI configs\n`);
}

// Execute seeding
try {
  await seedComments();
  await seedDashboard();

  console.log("✅ DATA-002 seeding completed successfully!\n");

  // Summary
  const commentsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM comments`
  );
  const mentionsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM comment_mentions`
  );
  const prefsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM userDashboardPreferences`
  );
  const layoutsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM dashboard_widget_layouts`
  );
  const kpisCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM dashboard_kpi_configs`
  );

  console.log("📊 Summary:");
  console.log(
    `  - Comments: ${(commentsCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Comment Mentions: ${(mentionsCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Dashboard Preferences: ${(prefsCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Widget Layouts: ${(layoutsCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - KPI Configs: ${(kpisCount[0] as { count: number }[])[0].count}`
  );
} catch (error) {
  console.error("❌ Error during seeding:", error);
  process.exit(1);
} finally {
  await connection.end();
}
