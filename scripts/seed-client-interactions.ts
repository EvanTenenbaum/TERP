import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING CLIENT INTERACTIONS ===\n");

async function seedClientInteractions() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('client_communications', 'client_activity', 'clients', 'users')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/4 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const clientsResult = await db.execute(
      sql`SELECT id FROM clients LIMIT 30`
    );
    const clients = clientsResult[0] as { id: number }[];

    const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 5`);
    const users = usersResult[0] as { id: number }[];

    console.log(`✓ Found ${clients.length} clients`);
    console.log(`✓ Found ${users.length} users\n`);

    if (clients.length === 0 || users.length === 0) {
      console.error("❌ Missing required data");
      process.exit(1);
    }

    // Phase 2: Seed Client Communications
    console.log("📦 Phase 2: Seeding client communications...");

    const communicationTypes = ["CALL", "EMAIL", "MEETING", "NOTE"];
    const communicationCount = 40; // Target 40 communications

    for (let i = 0; i < communicationCount; i++) {
      const client = clients[i % clients.length];
      const user = users[i % users.length];
      const commType = communicationTypes[i % communicationTypes.length];

      // Random date in past 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const commDate = new Date();
      commDate.setDate(commDate.getDate() - daysAgo);

      // Generate subject and notes based on type
      let subject: string;
      let notes: string;

      switch (commType) {
        case "CALL":
          subject = `Phone call - ${["Follow up", "Order inquiry", "Product question", "Pricing discussion", "General inquiry"][Math.floor(Math.random() * 5)]}`;
          notes = `Discussed ${["upcoming order", "product availability", "pricing options", "delivery schedule", "payment terms"][Math.floor(Math.random() * 5)]}. ${["Action required", "No action needed", "Follow up next week", "Waiting on client response"][Math.floor(Math.random() * 4)]}.`;
          break;

        case "EMAIL":
          subject = `Email - ${["Order confirmation", "Quote request", "Product catalog", "Invoice sent", "Payment reminder"][Math.floor(Math.random() * 5)]}`;
          notes = `Sent email regarding ${["recent order", "pricing quote", "product catalog", "outstanding invoice", "payment status"][Math.floor(Math.random() * 5)]}. ${["Awaiting response", "Client acknowledged", "Follow up scheduled", "Resolved"][Math.floor(Math.random() * 4)]}.`;
          break;

        case "MEETING":
          subject = `Meeting - ${["Product demo", "Quarterly review", "Contract negotiation", "Site visit", "Strategy session"][Math.floor(Math.random() * 5)]}`;
          notes = `Met with client to discuss ${["product offerings", "pricing structure", "delivery logistics", "quality standards", "future orders"][Math.floor(Math.random() * 5)]}. ${["Very positive", "Some concerns raised", "Action items identified", "Follow up needed"][Math.floor(Math.random() * 4)]}.`;
          break;

        case "NOTE":
          subject = `Internal note - ${["Client preference", "Special request", "Account status", "Credit update", "Contact info"][Math.floor(Math.random() * 5)]}`;
          notes = `${["Client prefers", "Important to note", "Updated information", "Special consideration", "Account note"][Math.floor(Math.random() * 5)]}: ${["specific delivery times", "bulk order discounts", "payment terms", "product preferences", "contact preferences"][Math.floor(Math.random() * 5)]}.`;
          break;

        default:
          subject = "General communication";
          notes = "Standard client interaction.";
      }

      await db.execute(sql`
        INSERT INTO client_communications (
          client_id,
          communicationType,
          subject,
          notes,
          communicated_at,
          logged_by
        ) VALUES (
          ${client.id},
          ${commType},
          ${subject},
          ${notes},
          ${commDate.toISOString().slice(0, 19).replace("T", " ")},
          ${user.id}
        )
      `);
    }

    console.log(`✓ Created ${communicationCount} communications\n`);

    // Phase 3: Seed Client Activity
    console.log("📦 Phase 3: Seeding client activity...");

    const activityTypes = [
      "CREATED",
      "UPDATED",
      "TRANSACTION_ADDED",
      "NOTE_ADDED",
      "TAG_ADDED",
    ];
    const activityCount = 30; // Target 30 activities

    for (let i = 0; i < activityCount; i++) {
      const client = clients[i % clients.length];
      const user = users[i % users.length];
      const activityType = activityTypes[i % activityTypes.length];

      // Random date in past 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const activityDate = new Date();
      activityDate.setDate(activityDate.getDate() - daysAgo);

      // Generate metadata based on activity type
      let metadata: string;

      switch (activityType) {
        case "CREATED":
          metadata = JSON.stringify({
            action: "client_created",
            source: "manual",
          });
          break;

        case "UPDATED":
          metadata = JSON.stringify({
            action: "client_updated",
            fields: ["address", "phone", "email"],
          });
          break;

        case "TRANSACTION_ADDED":
          metadata = JSON.stringify({
            action: "transaction_added",
            amount: (Math.random() * 1000 + 100).toFixed(2),
            type: "order",
          });
          break;

        case "NOTE_ADDED":
          metadata = JSON.stringify({
            action: "note_added",
            note_type: "general",
          });
          break;

        case "TAG_ADDED":
          metadata = JSON.stringify({
            action: "tag_added",
            tag: ["VIP", "Wholesale", "Retail", "Medical"][
              Math.floor(Math.random() * 4)
            ],
          });
          break;

        default:
          metadata = JSON.stringify({ action: "unknown" });
      }

      await db.execute(sql`
        INSERT INTO client_activity (
          client_id,
          user_id,
          activity_type,
          metadata,
          created_at
        ) VALUES (
          ${client.id},
          ${user.id},
          ${activityType},
          ${metadata},
          ${activityDate.toISOString().slice(0, 19).replace("T", " ")}
        )
      `);
    }

    console.log(`✓ Created ${activityCount} activities\n`);

    // Phase 4: Validation
    console.log("✅ Phase 4: Validating seeded data...");

    const commsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM client_communications`
    );
    const activityCountResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM client_activity`
    );

    console.log("📊 Summary:");
    console.log(
      `  - Communications: ${(commsCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Activities: ${(activityCountResult[0] as { count: number }[])[0].count}`
    );

    // Show communication distribution
    const commTypeDist = await db.execute(sql`
      SELECT communicationType, COUNT(*) as count 
      FROM client_communications 
      GROUP BY communicationType
    `);
    console.log("\n📈 Communications by Type:");
    (commTypeDist[0] as { communicationType: string; count: number }[]).forEach(
      row => {
        console.log(`  - ${row.communicationType}: ${row.count}`);
      }
    );

    // Show activity distribution
    const activityTypeDist = await db.execute(sql`
      SELECT activity_type, COUNT(*) as count 
      FROM client_activity 
      GROUP BY activity_type
    `);
    console.log("\n📈 Activities by Type:");
    (activityTypeDist[0] as { activity_type: string; count: number }[]).forEach(
      row => {
        console.log(`  - ${row.activity_type}: ${row.count}`);
      }
    );

    // Show sample communications
    const sampleComms = await db.execute(sql`
      SELECT 
        cc.communicationType,
        cc.subject,
        c.id as client_id
      FROM client_communications cc
      JOIN clients c ON cc.client_id = c.id
      LIMIT 5
    `);
    console.log("\n📦 Sample Communications:");
    (
      sampleComms[0] as {
        communicationType: string;
        subject: string;
        client_id: number;
      }[]
    ).forEach(comm => {
      console.log(
        `  - Client ${comm.client_id}: ${comm.communicationType} - ${comm.subject}`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedClientInteractions();
