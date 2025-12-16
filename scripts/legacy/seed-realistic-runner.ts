/**
 * CLI entrypoint for realistic data seeding.
 *
 * IMPORTANT:
 * - This file exists to prevent the seed script from auto-running when bundled into the server.
 * - The actual seeding logic lives in `seed-realistic-main.ts` and must remain library-only.
 *
 * Usage:
 *   pnpm seed
 *   pnpm seed light|full|edgeCases|chaos
 */

import { seedRealisticData } from "./seed-realistic-main.js";

seedRealisticData()
  .then(() => {
    console.log("✅ Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });


