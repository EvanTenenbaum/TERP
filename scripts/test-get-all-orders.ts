import { getAllOrders } from "../server/ordersDb";

console.log("\n=== TESTING getAllOrders ===\n");

async function testGetAllOrders() {
  try {
    // Test 1: Get all orders (no filters)
    console.log("Test 1: Get all orders (no filters)");
    const allOrders = await getAllOrders();
    console.log(`Result: ${allOrders.length} orders`);
    console.log("First order:", allOrders[0]);
    
    // Test 2: Get confirmed orders (isDraft = false)
    console.log("\n\nTest 2: Get confirmed orders (isDraft = false)");
    const confirmedOrders = await getAllOrders({ isDraft: false });
    console.log(`Result: ${confirmedOrders.length} orders`);
    if (confirmedOrders.length > 0) {
      console.log("First confirmed order:", confirmedOrders[0]);
    } else {
      console.log("❌ NO CONFIRMED ORDERS RETURNED!");
    }
    
    // Test 3: Get draft orders (isDraft = true)
    console.log("\n\nTest 3: Get draft orders (isDraft = true)");
    const draftOrders = await getAllOrders({ isDraft: true });
    console.log(`Result: ${draftOrders.length} orders`);
    
    // Test 4: Get PENDING orders
    console.log("\n\nTest 4: Get PENDING orders");
    const pendingOrders = await getAllOrders({ 
      isDraft: false,
      fulfillmentStatus: "PENDING" 
    });
    console.log(`Result: ${pendingOrders.length} orders`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testGetAllOrders();
