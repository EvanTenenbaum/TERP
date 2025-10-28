import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './server/db/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('\n=== VERIFYING SEEDED DATA ===\n');

// Check users
const users = await db.select().from(schema.users);
console.log(`✅ Users: ${users.length} found`);
users.forEach(u => console.log(`   - ${u.name} (${u.email})`));

// Check locations
const locations = await db.select().from(schema.locations);
console.log(`\n✅ Locations: ${locations.length} found`);
locations.forEach(l => console.log(`   - ${l.locationName}`));

// Check categories
const categories = await db.select().from(schema.productCategories);
console.log(`\n✅ Product Categories: ${categories.length} found`);
categories.slice(0, 10).forEach(c => console.log(`   - ${c.categoryName}`));

// Check grades
const grades = await db.select().from(schema.grades);
console.log(`\n✅ Grades: ${grades.length} found`);
grades.forEach(g => console.log(`   - ${g.gradeName}`));

// Check expense categories
const expenseCategories = await db.select().from(schema.expenseCategories);
console.log(`\n✅ Expense Categories: ${expenseCategories.length} found`);
expenseCategories.slice(0, 10).forEach(e => console.log(`   - ${e.categoryName}`));

// Check chart of accounts
const accounts = await db.select().from(schema.accounts);
console.log(`\n✅ Chart of Accounts: ${accounts.length} found`);
accounts.slice(0, 10).forEach(a => console.log(`   - ${a.accountNumber}: ${a.accountName}`));

console.log('\n=== VERIFICATION COMPLETE ===\n');

await connection.end();
