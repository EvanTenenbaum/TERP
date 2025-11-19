/**
 * Test script to see what SQL Drizzle is generating
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const { orders } = schema;

async function test() {
  // Create connection
  const connection = await mysql.createConnection({
    host: 'terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com',
    port: 25060,
    user: 'doadmin',
    password: 'AVNS_Q_RGkS7-uB3Bk7xC2am',
    database: 'defaultdb',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const db = drizzle(connection, { schema, mode: 'default', logger: true });

  console.log('\n=== Test 1: Simple select ===');
  try {
    const result1 = await db.select().from(orders).limit(3);
    console.log('Result count:', result1.length);
    console.log('First order:', result1[0]);
  } catch (error) {
    console.error('ERROR:', error);
  }

  console.log('\n=== Test 2: Select with isDraft filter ===');
  try {
    const result2 = await db.select().from(orders).where(eq(orders.isDraft, false)).limit(3);
    console.log('Result count:', result2.length);
    console.log('First order:', result2[0]);
  } catch (error) {
    console.error('ERROR:', error);
  }

  console.log('\n=== Test 3: Select specific columns ===');
  try {
    const result3 = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      isDraft: orders.isDraft,
    }).from(orders).limit(3);
    console.log('Result count:', result3.length);
    console.log('Results:', result3);
  } catch (error) {
    console.error('ERROR:', error);
  }

  await connection.end();
}

test().catch(console.error);
