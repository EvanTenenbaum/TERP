/**
 * TERP Operations API
 * 
 * A secure API service running on terp-gh-runner-1 that provides:
 * - Database query execution (read-only by default)
 * - Shell command execution (restricted)
 * - Health monitoring
 * 
 * This enables Manus (or any authorized agent) to interact with
 * DigitalOcean infrastructure without IP allowlist issues.
 */

import Fastify from 'fastify';
import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

// Configuration from environment
const config = {
  port: parseInt(process.env.OPS_API_PORT || '3100'),
  apiKey: process.env.OPS_API_KEY || '',
  db: {
    host: process.env.DB_HOST || 'private-terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com',
    port: parseInt(process.env.DB_PORT || '25060'),
    user: process.env.DB_USER || 'doadmin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: true }
  },
  readOnlyMode: process.env.READ_ONLY_MODE !== 'false',
  allowedShellCommands: (process.env.ALLOWED_SHELL_COMMANDS || 'ls,cat,head,tail,grep,wc,df,free,uptime,ps,docker').split(','),
};

if (!config.apiKey || config.apiKey.length < 32) {
  console.error('ERROR: OPS_API_KEY must be set and at least 32 characters');
  process.exit(1);
}

const fastify = Fastify({ logger: true, trustProxy: true });

let dbPool: mysql.Pool | null = null;

async function getDbPool(): Promise<mysql.Pool> {
  if (!dbPool) {
    dbPool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return dbPool;
}

fastify.addHook('preHandler', async (request, reply) => {
  if (request.url === '/health') return;
  
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }
  
  const providedKey = authHeader.slice(7);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(config.apiKey)
  );
  
  if (!isValid) {
    return reply.status(403).send({ error: 'Invalid API key' });
  }
});

fastify.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    readOnlyMode: config.readOnlyMode
  };
});

fastify.get('/db/ping', async (request, reply) => {
  try {
    const pool = await getDbPool();
    const [rows] = await pool.query('SELECT 1 as ping');
    return { status: 'connected', host: config.db.host, database: config.db.database, result: rows };
  } catch (error: any) {
    return reply.status(500).send({ status: 'error', error: error.message });
  }
});

fastify.get('/db/tables', async (request, reply) => {
  try {
    const pool = await getDbPool();
    const [rows] = await pool.query(`
      SELECT table_name, table_rows, data_length, create_time, update_time
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY table_name
    `, [config.db.database]);
    return { tables: rows };
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post<{ Body: { sql: string; params?: any[] } }>('/db/query', async (request, reply) => {
  const { sql, params = [] } = request.body;
  
  if (!sql || typeof sql !== 'string') {
    return reply.status(400).send({ error: 'SQL query is required' });
  }
  
  if (config.readOnlyMode) {
    const normalizedSql = sql.trim().toUpperCase();
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'REPLACE'];
    if (writeKeywords.some(kw => normalizedSql.startsWith(kw))) {
      return reply.status(403).send({ 
        error: 'Write operations are disabled in read-only mode',
        hint: 'Set READ_ONLY_MODE=false to enable writes (not recommended)'
      });
    }
  }
  
  try {
    const pool = await getDbPool();
    const startTime = Date.now();
    const [rows, fields] = await pool.query(sql, params);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      duration_ms: duration,
      columns: fields ? (fields as any[]).map(f => f.name) : [],
      rows: rows
    };
  } catch (error: any) {
    return reply.status(500).send({ 
      success: false,
      error: error.message,
      code: error.code,
      sqlState: error.sqlState
    });
  }
});

fastify.get('/db/verify/batch-status', async (request, reply) => {
  try {
    const pool = await getDbPool();
    const [rows] = await pool.query(`
      SELECT batchStatus, COUNT(*) as count
      FROM batches
      WHERE deleted_at IS NULL
      GROUP BY batchStatus
      ORDER BY count DESC
    `);
    return { query: 'batch_status_distribution', results: rows };
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
});

fastify.get('/db/verify/live-batches', async (request, reply) => {
  try {
    const pool = await getDbPool();
    
    const [withQty] = await pool.query(`
      SELECT COUNT(*) as count FROM batches
      WHERE batchStatus IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
        AND deleted_at IS NULL AND on_hand_qty IS NOT NULL
        AND CAST(on_hand_qty AS DECIMAL(18,6)) > 0
    `);
    
    const [withCost] = await pool.query(`
      SELECT COUNT(*) as count FROM batches
      WHERE batchStatus IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
        AND deleted_at IS NULL AND unit_cogs IS NOT NULL
        AND CAST(unit_cogs AS DECIMAL(18,6)) > 0
    `);
    
    const [sample] = await pool.query(`
      SELECT id, code, batchStatus, on_hand_qty, unit_cogs
      FROM batches WHERE batchStatus = 'LIVE' AND deleted_at IS NULL LIMIT 10
    `);
    
    return {
      live_batches_with_quantity: (withQty as any[])[0]?.count || 0,
      live_batches_with_cost: (withCost as any[])[0]?.count || 0,
      sample_batches: sample
    };
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post<{ Body: { command: string; args?: string[]; cwd?: string } }>('/exec', async (request, reply) => {
  const { command, args = [], cwd } = request.body;
  
  if (!command || typeof command !== 'string') {
    return reply.status(400).send({ error: 'Command is required' });
  }
  
  const baseCommand = command.split('/').pop() || command;
  if (!config.allowedShellCommands.includes(baseCommand)) {
    return reply.status(403).send({ 
      error: `Command '${baseCommand}' is not in the allowed list`,
      allowedCommands: config.allowedShellCommands
    });
  }
  
  const safeArgs = args.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ');
  const fullCommand = `${command} ${safeArgs}`.trim();
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: cwd || '/home/ops',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    });
    const duration = Date.now() - startTime;
    
    return { success: true, command: fullCommand, duration_ms: duration, stdout, stderr };
  } catch (error: any) {
    return reply.status(500).send({
      success: false, command: fullCommand, error: error.message,
      stdout: error.stdout || '', stderr: error.stderr || '', exitCode: error.code
    });
  }
});

fastify.get('/system/info', async (request, reply) => {
  try {
    const [uptimeResult] = await Promise.all([execAsync('uptime -p').catch(() => ({ stdout: 'unknown' }))]);
    const [memResult] = await Promise.all([execAsync('free -h').catch(() => ({ stdout: 'unknown' }))]);
    const [diskResult] = await Promise.all([execAsync('df -h /').catch(() => ({ stdout: 'unknown' }))]);
    
    return {
      uptime: uptimeResult.stdout.trim(),
      memory: memResult.stdout,
      disk: diskResult.stdout,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
});

fastify.get('/runner/status', async (request, reply) => {
  try {
    const { stdout } = await execAsync('systemctl status actions.runner.* --no-pager 2>/dev/null || echo "No runner service found"');
    return { status: stdout.includes('Active: active') ? 'running' : 'stopped', details: stdout };
  } catch (error: any) {
    return { status: 'unknown', error: error.message };
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`TERP Operations API running on port ${config.port}`);
    console.log(`Read-only mode: ${config.readOnlyMode}`);
    console.log(`Allowed shell commands: ${config.allowedShellCommands.join(', ')}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();