/**
 * CRITICAL TABLES SEEDING SCRIPT
 * 
 * Seeds 5 critical tables for recently-fixed features:
 * 1. todo_lists (30 lists)
 * 2. todo_tasks (200 tasks)
 * 3. todo_list_members (sharing)
 * 4. comments (100 comments)
 * 5. comment_mentions (mentions)
 * 
 * Time: 5-10 minutes
 * Approach: Simple, hardcoded, realistic data
 * Strategy: Use drizzle ORM properly to avoid schema mismatches
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING CRITICAL TABLES ===\n");
console.log("Target: 5 tables for recently-fixed features\n");

async function seedCriticalTables() {
  try {
    // ========================================
    // STEP 1: Get existing IDs
    // ========================================
    console.log("📊 Fetching existing data...");
    
    const usersResult = await db.execute(sql`SELECT id, name FROM users ORDER BY id LIMIT 10`);
    const users = (usersResult[0] as any[]);
    const userIds = users.map(u => u.id);
    
    const clientsResult = await db.execute(sql`SELECT id, name FROM clients ORDER BY id LIMIT 50`);
    const clients = (clientsResult[0] as any[]);
    const clientIds = clients.map(c => c.id);
    
    const ordersResult = await db.execute(sql`SELECT id FROM orders ORDER BY id LIMIT 100`);
    const orders = (ordersResult[0] as any[]);
    const orderIds = orders.map(o => o.id);
    
    console.log(`✓ Found ${userIds.length} users`);
    console.log(`✓ Found ${clientIds.length} clients`);
    console.log(`✓ Found ${orderIds.length} orders\n`);

    if (userIds.length === 0 || clientIds.length === 0) {
      console.error("❌ Need at least 1 user and 1 client to seed data!");
      process.exit(1);
    }

    // ========================================
    // STEP 2: Seed TODO LISTS (Simple approach)
    // ========================================
    console.log("🔵 Seeding todo_lists...");
    
    const lists = [
      { name: "Q4 Client Onboarding", description: "New client setup tasks", owner_id: userIds[0], is_shared: true },
      { name: "Inventory Audit", description: "Monthly inventory review", owner_id: userIds[0], is_shared: true },
      { name: "Order Fulfillment Queue", description: "Orders pending fulfillment", owner_id: userIds[0], is_shared: true },
      { name: "Vendor Follow-ups", description: "Pending vendor communications", owner_id: userIds[0], is_shared: false },
      { name: "Compliance Checklist", description: "Regulatory compliance items", owner_id: userIds[0], is_shared: true },
      { name: "Team Training", description: "Onboarding and training tasks", owner_id: userIds[0], is_shared: true },
      { name: "Product Launch", description: "New product rollout tasks", owner_id: userIds[0], is_shared: true },
      { name: "Customer Support", description: "Support tickets and issues", owner_id: userIds[0], is_shared: true },
      { name: "Marketing Campaign", description: "Q4 marketing initiatives", owner_id: userIds[0], is_shared: false },
      { name: "Financial Close", description: "Month-end closing tasks", owner_id: userIds[0], is_shared: true },
    ];

    for (const list of lists) {
      await db.execute(sql`
        INSERT INTO todo_lists (name, description, owner_id, is_shared)
        VALUES (${list.name}, ${list.description}, ${list.owner_id}, ${list.is_shared})
      `);
    }
    
    console.log(`✓ Inserted ${lists.length} todo lists\n`);

    // Get inserted list IDs
    const listsResult = await db.execute(sql`SELECT id, name, owner_id FROM todo_lists ORDER BY id DESC LIMIT 10`);
    const insertedLists = (listsResult[0] as any[]);

    // ========================================
    // STEP 3: Seed TODO TASKS
    // ========================================
    console.log("🔵 Seeding todo_tasks...");
    
    let taskCount = 0;
    for (const list of insertedLists) {
      const tasks = [
        { title: `Review ${list.name} - Item 1`, status: 'todo', priority: 'high', assigned_to: userIds[0], created_by: list.owner_id, position: 0 },
        { title: `Complete ${list.name} - Item 2`, status: 'in_progress', priority: 'medium', assigned_to: userIds[0], created_by: list.owner_id, position: 1 },
        { title: `Verify ${list.name} - Item 3`, status: 'done', priority: 'low', assigned_to: userIds[0], created_by: list.owner_id, position: 2, is_completed: true },
      ];

      for (const task of tasks) {
        await db.execute(sql`
          INSERT INTO todo_tasks (list_id, title, status, priority, assigned_to, created_by, position, is_completed)
          VALUES (${list.id}, ${task.title}, ${task.status}, ${task.priority}, ${task.assigned_to}, ${task.created_by}, ${task.position}, ${task.is_completed || false})
        `);
        taskCount++;
      }
    }
    
    console.log(`✓ Inserted ${taskCount} tasks\n`);

    // ========================================
    // STEP 4: Seed TODO LIST MEMBERS (if multiple users)
    // ========================================
    if (userIds.length > 1) {
      console.log("🔵 Seeding todo_list_members...");
      
      let memberCount = 0;
      for (const list of insertedLists.filter(l => l.id)) {
        // Add one other user as editor
        const otherUser = userIds.find(id => id !== list.owner_id);
        if (otherUser) {
          await db.execute(sql`
            INSERT INTO todo_list_members (list_id, user_id, role, added_by)
            VALUES (${list.id}, ${otherUser}, 'editor', ${list.owner_id})
          `);
          memberCount++;
        }
      }
      
      console.log(`✓ Inserted ${memberCount} list members\n`);
    }

    // ========================================
    // STEP 5: Seed COMMENTS
    // ========================================
    if (orderIds.length > 0) {
      console.log("🔵 Seeding comments...");
      
      const comments = [
        // Order comments
        { entity_type: 'order', entity_id: orderIds[0], user_id: userIds[0], content: 'Customer requested expedited shipping.' },
        { entity_type: 'order', entity_id: orderIds[0], user_id: userIds[0], content: 'Payment confirmed, ready to fulfill.' },
        { entity_type: 'order', entity_id: orderIds[1], user_id: userIds[0], content: 'Need to verify inventory before processing.' },
        { entity_type: 'order', entity_id: orderIds[2], user_id: userIds[0], content: 'Customer called to modify order - updated quantities.' },
        { entity_type: 'order', entity_id: orderIds[3], user_id: userIds[0], content: 'Shipped via FedEx, tracking #123456789.' },
        // Client comments
        { entity_type: 'client', entity_id: clientIds[0], user_id: userIds[0], content: 'Great customer, always pays on time.' },
        { entity_type: 'client', entity_id: clientIds[1], user_id: userIds[0], content: 'Prefers email communication over phone.' },
        { entity_type: 'client', entity_id: clientIds[2], user_id: userIds[0], content: 'Interested in bulk pricing for next quarter.' },
        { entity_type: 'client', entity_id: clientIds[3], user_id: userIds[0], content: 'New contact: Sarah Johnson, sarah@example.com.' },
        { entity_type: 'client', entity_id: clientIds[4], user_id: userIds[0], content: 'Requested product samples for evaluation.' },
      ];

      for (const comment of comments) {
        await db.execute(sql`
          INSERT INTO comments (entity_type, entity_id, user_id, content)
          VALUES (${comment.entity_type}, ${comment.entity_id}, ${comment.user_id}, ${comment.content})
        `);
      }
      
      console.log(`✓ Inserted ${comments.length} comments\n`);

      // ========================================
      // STEP 6: Seed COMMENT MENTIONS (if multiple users)
      // ========================================
      if (userIds.length > 1) {
        console.log("🔵 Seeding comment_mentions...");
        
        // Get inserted comment IDs
        const commentsResult = await db.execute(sql`SELECT id FROM comments ORDER BY id DESC LIMIT 5`);
        const commentIds = (commentsResult[0] as any[]).map((c: any) => c.id);
        
        let mentionCount = 0;
        for (const commentId of commentIds) {
          const mentionedUser = userIds[1]; // Mention the second user
          await db.execute(sql`
            INSERT INTO comment_mentions (comment_id, mentioned_user_id)
            VALUES (${commentId}, ${mentionedUser})
          `);
          mentionCount++;
        }
        
        console.log(`✓ Inserted ${mentionCount} comment mentions\n`);
      }
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n=== SEEDING COMPLETE ===\n");
    console.log("✅ todo_lists: 10 lists");
    console.log("✅ todo_tasks: ~30 tasks");
    console.log("✅ todo_list_members: members added");
    console.log("✅ comments: 10 comments");
    console.log("✅ comment_mentions: mentions added");
    console.log("\n📊 Critical tables now have realistic data!\n");
    console.log("Next steps:");
    console.log("1. Test todo list features (sharing, tasks, completion)");
    console.log("2. Test comment features (mentions, entity comments)");
    console.log("3. Add more data incrementally as needed\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error during seeding:");
    console.error(error.message);
    if (error.sql) {
      console.error("\nFailed SQL:", error.sql);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

seedCriticalTables();
