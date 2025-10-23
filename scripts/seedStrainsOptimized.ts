import { getDb } from "../server/db";
import { strains } from "../drizzle/schema";
import * as fs from "fs";

async function main() {
  console.log("🌿 Starting optimized strain database seeding...\n");
  
  const csvPath = "/home/ubuntu/cannabis-dataset/Dataset/Strains/strains-kushy_api.2017-11-14.csv";
  
  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV file not found:", csvPath);
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  console.log("📖 Reading CSV file...");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").slice(1); // Skip header
  
  console.log(`📊 Found ${lines.length} lines to process\n`);
  
  let processed = 0;
  let skipped = 0;
  let inserted = 0;
  const batchSize = 50; // Smaller batch size for better performance
  let batch: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const fields = parseCSVLine(line);
      if (fields.length < 8) {
        skipped++;
        continue;
      }

      const name = fields[3]?.trim();
      if (!name || name === "NULL" || name === "") {
        skipped++;
        continue;
      }

      const type = fields[7]?.trim();
      const description = fields[6]?.replace(/<[^>]*>/g, "").trim();
      
      let category = "hybrid";
      if (type?.toLowerCase().includes("indica")) category = "indica";
      else if (type?.toLowerCase().includes("sativa")) category = "sativa";

      batch.push({
        name: name,
        standardizedName: name.toLowerCase().trim(),
        category: category,
        description: description || null,
        aliases: null,
      });

      processed++;

      // Insert when batch is full
      if (batch.length >= batchSize) {
        try {
          await db.insert(strains).values(batch).onDuplicateKeyUpdate({
            set: { standardizedName: name.toLowerCase().trim() }
          });
          inserted += batch.length;
          console.log(`✅ Inserted ${inserted} strains (${Math.round((i/lines.length)*100)}% complete)`);
          batch = [];
        } catch (error: any) {
          console.error(`⚠️  Batch insert error: ${error.message}`);
          // Try inserting one by one
          for (const strain of batch) {
            try {
              await db.insert(strains).values(strain).onDuplicateKeyUpdate({
                set: { standardizedName: strain.standardizedName }
              });
              inserted++;
            } catch (e) {
              skipped++;
            }
          }
          batch = [];
        }
      }
    } catch (error) {
      skipped++;
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    try {
      await db.insert(strains).values(batch).onDuplicateKeyUpdate({
        set: { standardizedName: batch[0].standardizedName }
      });
      inserted += batch.length;
    } catch (error: any) {
      console.error(`⚠️  Final batch error: ${error.message}`);
      for (const strain of batch) {
        try {
          await db.insert(strains).values(strain);
          inserted++;
        } catch (e) {
          skipped++;
        }
      }
    }
  }

  console.log("\n🎉 Seeding complete!");
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📊 Processed: ${processed}`);
  
  process.exit(0);
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(currentField);
      currentField = "";
    } else {
      currentField += char;
    }
  }

  fields.push(currentField);
  return fields;
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

