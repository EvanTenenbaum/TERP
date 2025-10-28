import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './server/db/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const users = await db.select().from(schema.users);
console.log('Users in database:', JSON.stringify(users, null, 2));

await connection.end();
