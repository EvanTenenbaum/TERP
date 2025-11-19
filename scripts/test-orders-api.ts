/**
 * Test Orders API - Direct database query
 * Tests if the getAllOrders function returns confirmed orders
 */

import { getAllOrders } from '../server/ordersDb';

async function testOrdersAPI() {
  console.log('='.repeat(60));
  console.log('Testing Orders API');
  console.log('='.repeat(60));

  try {
    // Test 1: Get all orders (no filter)
    console.log('\n1. Getting ALL orders (no filter)...');
    const allOrders = await getAllOrders({});
    console.log(`   Found ${allOrders.length} orders`);
    console.log(`   First 3:`, allOrders.slice(0, 3).map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      isDraft: o.isDraft,
      orderType: o.orderType,
    })));

    // Test 2: Get only confirmed orders (isDraft: false)
    console.log('\n2. Getting CONFIRMED orders (isDraft: false)...');
    const confirmedOrders = await getAllOrders({ isDraft: false });
    console.log(`   Found ${confirmedOrders.length} confirmed orders`);
    console.log(`   First 3:`, confirmedOrders.slice(0, 3).map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      isDraft: o.isDraft,
      orderType: o.orderType,
    })));

    // Test 3: Get only draft orders (isDraft: true)
    console.log('\n3. Getting DRAFT orders (isDraft: true)...');
    const draftOrders = await getAllOrders({ isDraft: true });
    console.log(`   Found ${draftOrders.length} draft orders`);

    // Test 4: Count by isDraft status
    console.log('\n4. Breakdown by isDraft status:');
    const draftCount = allOrders.filter(o => o.isDraft === true).length;
    const confirmedCount = allOrders.filter(o => o.isDraft === false).length;
    const nullCount = allOrders.filter(o => o.isDraft === null).length;
    console.log(`   isDraft = true:  ${draftCount}`);
    console.log(`   isDraft = false: ${confirmedCount}`);
    console.log(`   isDraft = null:  ${nullCount}`);

    // Test 5: Check if any orders have boolean vs number issue
    console.log('\n5. Checking data types...');
    allOrders.slice(0, 5).forEach(o => {
      console.log(`   Order ${o.id}: isDraft = ${o.isDraft} (type: ${typeof o.isDraft})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error testing orders API:', error);
    throw error;
  }
}

testOrdersAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
