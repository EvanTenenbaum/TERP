import { seedStrainsFromCSV } from "../server/seedStrains";

async function main() {
  console.log("Starting strain database seeding...");
  console.log("This may take a few minutes...\n");
  
  try {
    const result = await seedStrainsFromCSV();
    
    if (result.success) {
      console.log("\n✅ SUCCESS!");
      console.log(`   Total strains processed: ${result.processed}`);
      console.log(`   Skipped: ${result.skipped}`);
    } else {
      console.error("\n❌ FAILED:", result.message);
    }
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

main();

