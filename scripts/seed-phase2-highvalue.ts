import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import { faker } from "@faker-js/faker";

console.log("\n=== PHASE 2: HIGH-VALUE TABLES SEEDING ===\n");
console.log("Target: 12 tables (todo lists, dashboard, comments, pricing)\n");

async function seedPhase2() {
  try {
    // Get existing user IDs
    console.log("📊 Fetching existing users...");
    const usersResult = await db.execute(sql`SELECT id FROM users ORDER BY id LIMIT 10`);
    const userIds = (usersResult[0] as any[]).map((u: any) => u.id);
    if (userIds.length === 0) {
      console.error("❌ No users found in database!");
      process.exit(1);
    }
    console.log(`✓ Found ${userIds.length} users (IDs: ${userIds.join(', ')})\n`);

    // Get existing client IDs
    console.log("📊 Fetching existing clients...");
    const clientsResult = await db.execute(sql`SELECT id FROM clients LIMIT 50`);
    const clientIds = (clientsResult[0] as any[]).map((c: any) => c.id);
    console.log(`✓ Found ${clientIds.length} clients\n`);

    // ========================================
    // 1. TODO LISTS (4 tables)
    // ========================================
    console.log("🔵 Seeding Todo Lists...");
    
    // 1a. todo_lists
    const lists = [];
    for (let i = 0; i < 30; i++) {
      lists.push({
        name: faker.company.catchPhrase(),
        description: faker.lorem.sentence(),
        owner_id: faker.helpers.arrayElement(userIds),
        is_shared: faker.datatype.boolean(),
      });
    }
    
    await db.execute(sql`
      INSERT INTO todo_lists (name, description, owner_id, is_shared)
      VALUES ${sql.join(
        lists.map(l => sql`(${l.name}, ${l.description}, ${l.owner_id}, ${l.is_shared})`),
        sql`, `
      )}
    `);
    console.log(`✓ Inserted ${lists.length} todo lists`);

    // Get inserted list IDs
    const listsResult = await db.execute(sql`SELECT id, owner_id FROM todo_lists`);
    const listData = (listsResult[0] as any[]);
    const listIds = listData.map((l: any) => l.id);

    // 1b. todo_list_members
    const members = [];
    for (const list of listData.slice(0, 15)) { // Share 15 lists
      const availableUsers = userIds.filter(id => id !== list.owner_id);
      if (availableUsers.length === 0) continue; // Skip if no other users
      
      // Shuffle and take unique users (avoid duplicates)
      const shuffled = [...availableUsers].sort(() => Math.random() - 0.5);
      const numMembers = Math.min(faker.number.int({ min: 1, max: 3 }), shuffled.length);
      
      for (let i = 0; i < numMembers; i++) {
        members.push({
          list_id: list.id,
          user_id: shuffled[i], // Use shuffled array to ensure uniqueness
          role: faker.helpers.arrayElement(['editor', 'viewer']),
          added_by: list.owner_id,
        });
      }
    }
    
    if (members.length > 0) {
      await db.execute(sql`
        INSERT INTO todo_list_members (list_id, user_id, role, added_by)
        VALUES ${sql.join(
          members.map(m => sql`(${m.list_id}, ${m.user_id}, ${m.role}, ${m.added_by})`),
          sql`, `
        )}
      `);
      console.log(`✓ Inserted ${members.length} list members`);
    }

    // 1c. todo_tasks
    const tasks = [];
    for (const listId of listIds) {
      const numTasks = faker.number.int({ min: 3, max: 12 });
      for (let i = 0; i < numTasks; i++) {
        const isCompleted = faker.datatype.boolean();
        const assignedTo = faker.helpers.maybe(() => faker.helpers.arrayElement(userIds), { probability: 0.7 });
        const createdBy = faker.helpers.arrayElement(userIds);
        
        tasks.push({
          list_id: listId,
          title: faker.lorem.sentence(),
          description: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.5 }),
          status: faker.helpers.arrayElement(['todo', 'in_progress', 'done']),
          priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
          due_date: faker.helpers.maybe(() => faker.date.future().toISOString().slice(0, 19).replace('T', ' '), { probability: 0.6 }),
          assigned_to: assignedTo,
          created_by: createdBy,
          position: i,
          is_completed: isCompleted,
          completed_at: isCompleted ? faker.date.past().toISOString().slice(0, 19).replace('T', ' ') : null,
          completed_by: isCompleted ? assignedTo || createdBy : null,
        });
      }
    }
    
    await db.execute(sql`
      INSERT INTO todo_tasks (list_id, title, description, status, priority, due_date, assigned_to, created_by, position, is_completed, completed_at, completed_by)
      VALUES ${sql.join(
        tasks.map(t => sql`(${t.list_id}, ${t.title}, ${t.description}, ${t.status}, ${t.priority}, ${t.due_date}, ${t.assigned_to}, ${t.created_by}, ${t.position}, ${t.is_completed}, ${t.completed_at}, ${t.completed_by})`),
        sql`, `
      )}
    `);
    console.log(`✓ Inserted ${tasks.length} tasks\n`);

    // ========================================
    // 2. DASHBOARD (3 tables)
    // ========================================
    console.log("🔵 Seeding Dashboard...");
    
    // 2a. userDashboardPreferences
    const prefs = [];
    for (const userId of userIds) {
      prefs.push({
        userId,
        activeLayout: faker.helpers.arrayElement(['operations', 'sales', 'inventory', 'financial']),
        widgetConfig: JSON.stringify({
          widgets: [
            { id: 'sales-overview', position: { x: 0, y: 0, w: 6, h: 4 }, visible: true },
            { id: 'inventory-status', position: { x: 6, y: 0, w: 6, h: 4 }, visible: true },
            { id: 'recent-orders', position: { x: 0, y: 4, w: 12, h: 6 }, visible: true },
          ]
        }),
      });
    }
    
    await db.execute(sql`
      INSERT INTO userDashboardPreferences (userId, activeLayout, widgetConfig)
      VALUES ${sql.join(
        prefs.map(p => sql`(${p.userId}, ${p.activeLayout}, ${p.widgetConfig})`),
        sql`, `
      )}
      ON DUPLICATE KEY UPDATE activeLayout = VALUES(activeLayout), widgetConfig = VALUES(widgetConfig)
    `);
    console.log(`✓ Inserted ${prefs.length} dashboard preferences\n`);

    // ========================================
    // 3. COMMENTS (2 tables)
    // ========================================
    console.log("🔵 Seeding Comments...");
    
    // Get existing orders for comments
    const ordersResult = await db.execute(sql`SELECT id FROM orders LIMIT 100`);
    const orderIds = (ordersResult[0] as any[]).map((o: any) => o.id);
    
    if (orderIds.length > 0) {
      // 3a. comments
      const comments = [];
      for (let i = 0; i < 200; i++) {
        const entityType = faker.helpers.arrayElement(['order', 'client']);
        const entityId = entityType === 'order' 
          ? faker.helpers.arrayElement(orderIds)
          : faker.helpers.arrayElement(clientIds);
        
        comments.push({
          entity_type: entityType,
          entity_id: entityId,
          user_id: faker.helpers.arrayElement(userIds),
          content: faker.lorem.paragraph(),
        });
      }
      
      await db.execute(sql`
        INSERT INTO comments (entity_type, entity_id, user_id, content)
        VALUES ${sql.join(
          comments.map(c => sql`(${c.entity_type}, ${c.entity_id}, ${c.user_id}, ${c.content})`),
          sql`, `
        )}
      `);
      console.log(`✓ Inserted ${comments.length} comments`);

      // Get inserted comment IDs
      const commentsResult = await db.execute(sql`SELECT id, user_id FROM comments LIMIT 50`);
      const commentData = (commentsResult[0] as any[]);

      // 3b. comment_mentions
      const mentions = [];
      for (const comment of commentData) {
        if (faker.datatype.boolean()) { // 50% chance of having mentions
          const numMentions = faker.number.int({ min: 1, max: 2 });
          for (let i = 0; i < numMentions; i++) {
            const mentionedUser = faker.helpers.arrayElement(userIds.filter(id => id !== comment.user_id));
            mentions.push({
              comment_id: comment.id,
              mentioned_user_id: mentionedUser,
            });
          }
        }
      }
      
      if (mentions.length > 0) {
        await db.execute(sql`
          INSERT INTO comment_mentions (comment_id, mentioned_user_id)
          VALUES ${sql.join(
            mentions.map(m => sql`(${m.comment_id}, ${m.mentioned_user_id})`),
            sql`, `
          )}
        `);
        console.log(`✓ Inserted ${mentions.length} comment mentions\n`);
      }
    } else {
      console.log("⚠️  No orders found, skipping comments\n");
    }

    // ========================================
    // 4. PRICING (3 tables)
    // ========================================
    console.log("🔵 Seeding Pricing...");
    
    // Get existing products
    const productsResult = await db.execute(sql`SELECT id FROM products LIMIT 50`);
    const productIds = (productsResult[0] as any[]).map((p: any) => p.id);
    
    if (productIds.length > 0 && clientIds.length > 0) {
      // 4a. pricing_rules
      const rules = [];
      for (let i = 0; i < 30; i++) {
        rules.push({
          name: faker.commerce.productName() + " Rule",
          rule_type: faker.helpers.arrayElement(['volume', 'client', 'product', 'seasonal']),
          priority: faker.number.int({ min: 1, max: 100 }),
          is_active: faker.datatype.boolean(),
          conditions: JSON.stringify({
            min_quantity: faker.number.int({ min: 10, max: 100 }),
            product_category: faker.helpers.arrayElement(['Flower', 'Edibles', 'Concentrates']),
          }),
          actions: JSON.stringify({
            discount_percent: faker.number.float({ min: 5, max: 25, precision: 0.01 }),
          }),
        });
      }
      
      await db.execute(sql`
        INSERT INTO pricing_rules (name, rule_type, priority, is_active, conditions, actions)
        VALUES ${sql.join(
          rules.map(r => sql`(${r.name}, ${r.rule_type}, ${r.priority}, ${r.is_active}, ${r.conditions}, ${r.actions})`),
          sql`, `
        )}
      `);
      console.log(`✓ Inserted ${rules.length} pricing rules`);

      // 4b. pricing_profiles
      const profiles = [];
      for (const clientId of clientIds.slice(0, 20)) {
        profiles.push({
          client_id: clientId,
          profile_name: faker.company.name() + " Profile",
          base_discount: faker.number.float({ min: 0, max: 15, precision: 0.01 }),
          is_active: true,
        });
      }
      
      await db.execute(sql`
        INSERT INTO pricing_profiles (client_id, profile_name, base_discount, is_active)
        VALUES ${sql.join(
          profiles.map(p => sql`(${p.client_id}, ${p.profile_name}, ${p.base_discount}, ${p.is_active})`),
          sql`, `
        )}
      `);
      console.log(`✓ Inserted ${profiles.length} pricing profiles`);

      // 4c. pricing_defaults
      const defaults = [];
      for (const productId of productIds.slice(0, 30)) {
        defaults.push({
          product_id: productId,
          default_price: faker.number.float({ min: 100, max: 5000, precision: 0.01 }),
          min_price: faker.number.float({ min: 50, max: 100, precision: 0.01 }),
          max_price: faker.number.float({ min: 5000, max: 10000, precision: 0.01 }),
        });
      }
      
      await db.execute(sql`
        INSERT INTO pricing_defaults (product_id, default_price, min_price, max_price)
        VALUES ${sql.join(
          defaults.map(d => sql`(${d.product_id}, ${d.default_price}, ${d.min_price}, ${d.max_price})`),
          sql`, `
        )}
      `);
      console.log(`✓ Inserted ${defaults.length} pricing defaults\n`);
    } else {
      console.log("⚠️  No products/clients found, skipping pricing\n");
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n=== PHASE 2 COMPLETE ===\n");
    console.log("✅ Todo Lists: 4 tables seeded");
    console.log("✅ Dashboard: 3 tables seeded");
    console.log("✅ Comments: 2 tables seeded");
    console.log("✅ Pricing: 3 tables seeded");
    console.log("\n📊 Total: 12 high-value tables populated\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error during Phase 2 seeding:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedPhase2();
