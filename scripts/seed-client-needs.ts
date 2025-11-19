import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== DATA-010: Seeding Client Needs ===\n");

async function seedClientNeeds() {
  // Get some clients to assign needs to
  const clientsResult = await db.execute(
    sql.raw("SELECT id FROM clients LIMIT 20")
  );
  const clients = clientsResult[0] as { id: number }[];

  if (clients.length === 0) {
    console.log("❌ No clients found. Cannot seed client needs.");
    return;
  }

  console.log(`Found ${clients.length} clients to assign needs to\n`);

  // Product categories and strains
  const categories = [
    "Flower",
    "Concentrates",
    "Edibles",
    "Vapes",
    "Pre-Rolls",
    "Topicals",
  ];
  const strainTypes = ["INDICA", "SATIVA", "HYBRID", "CBD", "ANY"];
  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "FULFILLED", "EXPIRED"];
  const priorities = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"];

  const needs: string[] = [];

  // Create 25 client needs
  for (let i = 0; i < 25; i++) {
    const client = clients[i % clients.length];
    const category = categories[i % categories.length];
    const strainType = strainTypes[i % strainTypes.length];
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];

    const quantityMin = 100 + Math.floor(Math.random() * 400); // 100-500
    const quantityMax = quantityMin + Math.floor(Math.random() * 500); // +0-500
    const priceMax = (5 + Math.random() * 35).toFixed(2); // $5-$40 per unit

    const neededByDays = 7 + Math.floor(Math.random() * 60); // 7-67 days
    const neededBy = new Date(Date.now() + neededByDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const expiresAtDays = neededByDays + 30; // 30 days after needed_by
    const expiresAt = new Date(Date.now() + expiresAtDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const strainNames = [
      "Blue Dream",
      "OG Kush",
      "Girl Scout Cookies",
      "Sour Diesel",
      "Granddaddy Purple",
      "Jack Herer",
      "Green Crack",
      "AK-47",
      "White Widow",
      "Northern Lights",
    ];
    const strain = strainNames[i % strainNames.length];

    const notesList = [
      "Looking for premium quality",
      "Regular customer, high volume",
      "Price sensitive, willing to wait",
      "Urgent need for event",
      "Testing new product line",
      "Seasonal demand increase",
      "Bulk order for wholesale",
      "Medical patient, consistent quality needed",
      "New customer, trial order",
      "Repeat order from satisfied customer",
    ];
    const notes = notesList[i % notesList.length];

    const internalNotesList = [
      "VIP client - prioritize",
      "Check inventory before confirming",
      "May need custom packaging",
      "Price negotiable for bulk",
      "Follow up in 3 days",
      "Competitor shopping - match price",
      "Long-term contract potential",
      "Quality over price for this client",
      "Fast turnaround required",
      "Standard fulfillment process",
    ];
    const internalNotes = internalNotesList[i % internalNotesList.length];

    const fulfilledAt =
      status === "FULFILLED"
        ? `'${new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ")}'`
        : "NULL";

    needs.push(`(
      ${client.id},
      '${strain}',
      '${category} - ${strain}',
      '${category}',
      NULL,
      'Premium',
      ${quantityMin},
      ${quantityMax},
      ${priceMax},
      '${status}',
      '${priority}',
      '${neededBy}',
      '${expiresAt}',
      ${fulfilledAt},
      '${notes}',
      '${internalNotes}',
      1,
      NULL,
      '${strainType}'
    )`);
  }

  const insertQuery = `
    INSERT INTO client_needs (
      client_id,
      strain,
      product_name,
      category,
      subcategory,
      grade,
      quantity_min,
      quantity_max,
      price_max,
      status,
      priority,
      needed_by,
      expires_at,
      fulfilled_at,
      notes,
      internal_notes,
      created_by,
      strainId,
      strain_type
    ) VALUES ${needs.join(",\n")}
  `;

  try {
    await db.execute(sql.raw(insertQuery));
    console.log(`✅ Seeded 25 client needs\n`);

    // Verify
    const verifyResult = await db.execute(
      sql.raw(`
        SELECT 
          status,
          priority,
          COUNT(*) as count
        FROM client_needs
        GROUP BY status, priority
        ORDER BY status, priority
      `)
    );

    console.log("📊 Client Needs Distribution:\n");
    console.table(verifyResult[0]);

    console.log("\n✅ DATA-010 Complete!");
  } catch (error) {
    console.error("❌ Error seeding client needs:", error);
    throw error;
  }
}

seedClientNeeds()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
