import { getDb } from "./db";
import { strains } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";

interface OpenTHCStrain {
  id: string;
  name: string;
  stub: string;
  type: string | null;
}

/**
 * Normalize category from OpenTHC type to TERP category
 */
function normalizeCategory(openthcType: string | null): "indica" | "sativa" | "hybrid" | null {
  if (!openthcType || openthcType === '-unknown-') {
    return null;
  }
  
  const type = openthcType.toLowerCase();
  
  if (type === 'indica') return 'indica';
  if (type === 'sativa') return 'sativa';
  if (type === 'hybrid') return 'hybrid';
  if (type.includes('indica') && type.includes('sativa')) return 'hybrid';
  if (type === 'cbd') return 'hybrid'; // CBD strains are typically hybrids
  
  return null;
}

/**
 * Standardize strain name (lowercase, trim)
 */
function standardizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

export async function importOpenTHCStrainsFromJSON() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const jsonPath = path.join(__dirname, "../openthc_strains.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.error("OpenTHC strains JSON file not found:", jsonPath);
    return { success: false, message: "JSON file not found" };
  }

  console.log("Reading OpenTHC strains JSON file...");
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const openthcStrains: OpenTHCStrain[] = JSON.parse(jsonContent);
  
  console.log(`Found ${openthcStrains.length} strains in OpenTHC VDB`);
  
  const strainsToInsert: any[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let withTypeCount = 0;
  let withoutTypeCount = 0;

  for (const strain of openthcStrains) {
    try {
      const name = strain.name.trim();
      
      if (!name) {
        skippedCount++;
        continue;
      }

      const category = normalizeCategory(strain.type);
      const standardizedName = standardizeName(name);
      
      if (category) {
        withTypeCount++;
      } else {
        withoutTypeCount++;
      }
      
      const description = strain.type ? `Type: ${strain.type}` : null;

      strainsToInsert.push({
        name: name,
        standardizedName: standardizedName,
        category: category,
        description: description,
        aliases: null,
        openthcId: strain.id,
        openthcStub: strain.stub,
      });

      processedCount++;

      // Insert in batches of 100
      if (strainsToInsert.length >= 100) {
        const batchDb = await getDb();
        if (batchDb) await batchDb.insert(strains).values(strainsToInsert);
        console.log(`Inserted ${processedCount} strains...`);
        strainsToInsert.length = 0; // Clear array
      }
    } catch (error) {
      console.error(`Error processing strain: ${strain.name}`, error);
      skippedCount++;
      continue;
    }
  }

  // Insert remaining strains
  if (strainsToInsert.length > 0) {
    const finalDb = await getDb();
    if (finalDb) await finalDb.insert(strains).values(strainsToInsert);
  }

  console.log(`✅ OpenTHC strain import complete!`);
  console.log(`   Processed: ${processedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   With type: ${withTypeCount} (${(withTypeCount / processedCount * 100).toFixed(1)}%)`);
  console.log(`   Without type: ${withoutTypeCount} (${(withoutTypeCount / processedCount * 100).toFixed(1)}%)`);

  return {
    success: true,
    processed: processedCount,
    skipped: skippedCount,
    withType: withTypeCount,
    withoutType: withoutTypeCount,
  };
}
