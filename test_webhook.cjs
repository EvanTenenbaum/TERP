const mysql = require('mysql2/promise');
const fs = require('fs');

// Parse .env file manually
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    // Remove quotes if present
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

(async () => {
  try {
    // Parse the DATABASE_URL to add SSL options
    const dbUrl = new URL(envVars.DATABASE_URL);
    const connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: dbUrl.port || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('✅ Connected to database successfully!\n');
    
    const [rows] = await connection.execute(
      'SELECT id, commitSha, commitMessage, author, createdAt FROM deployments ORDER BY createdAt DESC LIMIT 5'
    );
    
    console.log(`📊 Found ${rows.length} deployment(s):\n`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. Deployment ID: ${row.id}`);
      console.log(`   Commit: ${row.commitSha?.substring(0, 7)} - ${row.commitMessage}`);
      console.log(`   Author: ${row.author}`);
      console.log(`   Created: ${row.createdAt}`);
      console.log('');
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
