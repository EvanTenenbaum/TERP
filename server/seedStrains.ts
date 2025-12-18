import { getDb } from "./db";
import { strains } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./_core/logger";

interface StrainCSVRow {
  id: string;
  name: string;
  type: string;
  description: string;
  effects: string;
  ailment: string;
  flavor: string;
}

export async function seedStrainsFromCSV() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const csvPath = "/home/ubuntu/cannabis-dataset/Dataset/Strains/strains-kushy_api.2017-11-14.csv";
  
  if (!fs.existsSync(csvPath)) {
    logger.error({ csvPath }, "CSV file not found");
    return { success: false, message: "CSV file not found" };
  }

  console.log("Reading strain CSV file...");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  
  // Skip header
  const dataLines = lines.slice(1);
  
  console.log(`Found ${dataLines.length} strains in CSV`);
  
  const strainsToInsert: Array<{
    name: string;
    standardizedName: string;
    category: string;
    description: string | null;
    aliases: string | null;
  }> = [];
  let processedCount = 0;
  let skippedCount = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    try {
      // Parse CSV line (handling quoted fields)
      const fields = parseCSVLine(line);
      
      if (fields.length < 3) {
        skippedCount++;
        continue;
      }

      const name = fields[3]?.trim(); // name column
      const type = fields[7]?.trim(); // type column
      const description = fields[6]?.replace(/<[^>]*>/g, "").trim(); // description, strip HTML
      const effects = fields[10]?.trim(); // effects column
      const ailment = fields[11]?.trim(); // ailment column
      const flavor = fields[12]?.trim(); // flavor column

      if (!name || name === "NULL") {
        skippedCount++;
        continue;
      }

      // Normalize category to our enum values
      let normalizedCategory = "hybrid";
      if (type?.toLowerCase().includes("indica")) {
        normalizedCategory = "indica";
      } else if (type?.toLowerCase().includes("sativa")) {
        normalizedCategory = "sativa";
      }
      
      // Standardize the name
      const standardizedName = name.toLowerCase().trim();

      // Build description with effects and flavors
      let fullDescription = description || "";
      if (effects && effects !== "NULL") {
        fullDescription += `\n\nEffects: ${effects}`;
      }
      if (ailment && ailment !== "NULL") {
        fullDescription += `\n\nHelps with: ${ailment}`;
      }
      if (flavor && flavor !== "NULL") {
        fullDescription += `\n\nFlavors: ${flavor}`;
      }

      strainsToInsert.push({
        name: name,
        standardizedName: standardizedName,
        category: normalizedCategory,
        description: fullDescription.trim() || null,
        aliases: null,
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
      skippedCount++;
      continue;
    }
  }

  // Insert remaining strains
  if (strainsToInsert.length > 0) {
    const finalDb = await getDb();
    if (finalDb) await finalDb.insert(strains).values(strainsToInsert);
  }

  console.log(`✅ Strain seeding complete!`);
  console.log(`   Processed: ${processedCount}`);
  console.log(`   Skipped: ${skippedCount}`);

  return {
    success: true,
    processed: processedCount,
    skipped: skippedCount,
  };
}

// Helper function to parse CSV line with quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField);

  return fields;
}

