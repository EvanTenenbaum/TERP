import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { strains } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { requirePermission } from "../_core/permissionMiddleware";

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OpenTHCStrain {
  id: string;
  name: string;
  stub: string;
  type: string | null;
}

function normalizeCategory(
  openthcType: string | null
): "indica" | "sativa" | "hybrid" | null {
  if (!openthcType || openthcType === "-unknown-") {
    return null;
  }

  const type = openthcType.toLowerCase();

  if (type === "indica") return "indica";
  if (type === "sativa") return "sativa";
  if (type === "hybrid") return "hybrid";
  if (type.includes("indica") && type.includes("sativa")) return "hybrid";
  if (type === "cbd") return "hybrid";

  return null;
}

function standardizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Admin Import Router
 *
 * Handles background imports that can take a long time
 */
export const adminImportRouter = router({
  /**
   * Import strains in batches
   * Returns immediately with status, continues in background
   */
  importStrainsBatch: protectedProcedure
    .use(requirePermission("system:manage"))
    .input(
      z.object({
        batchSize: z.number().default(500),
        offset: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        throw new Error("Database not available");
      }

      // Find the JSON file
      const possiblePaths = [
        path.join(__dirname, "../../openthc_strains.json"),
        path.join(process.cwd(), "openthc_strains.json"),
        "/app/openthc_strains.json",
      ];

      let jsonPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          jsonPath = p;
          break;
        }
      }

      if (!jsonPath) {
        throw new Error("OpenTHC strains JSON file not found");
      }

      // Read and parse JSON
      const jsonContent = fs.readFileSync(jsonPath, "utf-8");
      const allStrains: OpenTHCStrain[] = JSON.parse(jsonContent);

      // Get the batch to import
      const batch = allStrains.slice(
        input.offset,
        input.offset + input.batchSize
      );

      if (batch.length === 0) {
        return {
          imported: 0,
          skipped: 0,
          offset: input.offset,
          total: allStrains.length,
          completed: true,
          message: "All strains imported",
        };
      }

      // Import the batch
      const strainsToInsert: Array<{
        name: string;
        standardizedName: string;
        category: "indica" | "sativa" | "hybrid" | null;
        description: string | null;
        aliases: string | null;
        openthcId: string;
        openthcStub: string;
      }> = [];
      let imported = 0;
      let skipped = 0;

      for (const strain of batch) {
        try {
          const name = strain.name.trim();

          if (!name) {
            skipped++;
            continue;
          }

          const category = normalizeCategory(strain.type);
          const standardizedName = standardizeName(name);
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
        } catch (error) {
          console.error(`Error processing strain: ${strain.name}`, error);
          skipped++;
        }
      }

      // Insert all at once, handling duplicates
      if (strainsToInsert.length > 0) {
        try {
          await db.insert(strains).values(strainsToInsert);
          imported = strainsToInsert.length;
        } catch (_error) {
          // If bulk insert fails due to duplicates, insert one by one
          console.warn("Bulk insert failed, trying individual inserts...");
          for (const strain of strainsToInsert) {
            try {
              await db.insert(strains).values([strain]);
              imported++;
            } catch (_e) {
              // Likely a duplicate, skip it
              skipped++;
            }
          }
        }
      }

      const nextOffset = input.offset + input.batchSize;
      const completed = nextOffset >= allStrains.length;

      return {
        imported,
        skipped,
        offset: nextOffset,
        total: allStrains.length,
        completed,
        message: completed
          ? `Import complete! Imported ${imported} strains`
          : `Batch complete. Progress: ${nextOffset}/${allStrains.length}`,
      };
    }),

  /**
   * Get import progress
   */
  getImportProgress: protectedProcedure
    .use(requirePermission("system:manage"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        throw new Error("Database not available");
      }

      const totalStrains = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(strains);
      const openthcStrains = await db.execute(sql`
        SELECT COUNT(*) as count FROM strains WHERE openthcId IS NOT NULL
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL raw query result lacks type info
      const openthcCount = (openthcStrains as any)[0]?.count || 0;
      return {
        totalStrains: totalStrains[0]?.count || 0,
        openthcStrains: openthcCount,
        targetStrains: 12804,
        percentComplete: Math.round((openthcCount / 12804) * 100),
      };
    }),
});
