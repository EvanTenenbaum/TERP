#!/usr/bin/env node
/**
 * Add paymentTerms column to vendors table
 * Uses Node.js and mysql2 instead of mysql CLI
 */

import mysql from 'mysql2/promise';

async function addPaymentTermsColumn() {
  console.log('Adding paymentTerms column to vendors table...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  let connection;
  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    
    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: dbUrl.port || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1).split('?')[0],
      ssl: { rejectUnauthorized: false }
    });

    console.log('✓ Connected to database');

    // Check if column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'vendors' 
         AND COLUMN_NAME = 'paymentTerms'`
    );

    if (columns.length > 0) {
      console.log('✓ paymentTerms column already exists');
    } else {
      // Add column
      await connection.query(
        `ALTER TABLE vendors 
         ADD COLUMN paymentTerms VARCHAR(100) AFTER contactPhone`
      );
      console.log('✅ paymentTerms column added successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addPaymentTermsColumn();
