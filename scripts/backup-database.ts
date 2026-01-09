import { spawn } from 'child_process';
import { createReadStream, unlinkSync, existsSync, mkdtempSync, statSync, readFileSync, rmSync } from 'fs';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { format } from 'date-fns';

const DATABASE_URL = process.env.DATABASE_URL;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const S3_REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
const DRY_RUN = process.argv.includes('--dry-run');

// SECURITY: Validate shell-safe characters to prevent injection
function validateShellSafe(value: string, name: string): void {
  // Allow alphanumeric, dots, dashes, underscores for hostnames/usernames/databases
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid ${name}: contains disallowed characters`);
  }
}

// SECURITY: Validate port number
function validatePort(port: string): void {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('Invalid port number');
  }
}

async function main() {
  console.info('🗄️  TERP Database Backup Script');
  console.info('================================');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  // SECURITY: Create unpredictable temp directory with secure permissions
  let tmpDir: string | null = null;
  let localPath: string | null = null;

  // Cleanup function to clear sensitive data and files
  const cleanup = (removeFiles = true) => {
    // Clear password-related env vars
    if (process.env.MYSQL_PWD) delete process.env.MYSQL_PWD;
    if (process.env.PGPASSWORD) delete process.env.PGPASSWORD;

    // Clean up temp files on failure
    if (removeFiles && tmpDir && existsSync(tmpDir)) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
        console.info('🧹 Cleaned up temp directory');
      } catch {
        console.warn('⚠️  Could not clean up temp directory');
      }
    }
  };

  // Register cleanup handlers
  process.on('exit', () => cleanup(false)); // Don't remove files on normal exit
  process.on('SIGINT', () => {
    cleanup(true);
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup(true);
    process.exit(143);
  });
  process.on('uncaughtException', (err) => {
    console.error('❌ Fatal error:', err.message); // Don't log full error (might contain creds)
    cleanup(true);
    process.exit(1);
  });

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `terp-backup-${timestamp}.sql.gz`;

  try {
    // SECURITY: Create secure temp directory with unpredictable name
    tmpDir = mkdtempSync('/tmp/terp-backup-');
    localPath = join(tmpDir, filename);
  } catch (err) {
    console.error('❌ Failed to create secure temp directory');
    process.exit(1);
  }

  // Parse DATABASE_URL
  let url: URL;
  try {
    url = new URL(DATABASE_URL);
  } catch {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const isMySQL = url.protocol === 'mysql:';
  const host = url.hostname;
  const port = url.port || (isMySQL ? '3306' : '5432');
  const user = url.username;
  const password = url.password;
  const database = url.pathname.slice(1);

  // SECURITY: Validate all inputs to prevent injection
  try {
    validateShellSafe(host, 'hostname');
    validateShellSafe(user, 'username');
    validateShellSafe(database, 'database name');
    validatePort(port);
  } catch (err) {
    console.error(`❌ Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    cleanup(true);
    process.exit(1);
  }

  console.info(`📊 Database: ${database} @ ${host}`);
  console.info(`📁 Output: ${filename}`);

  if (DRY_RUN) {
    console.info('🔍 DRY RUN - No actual backup will be created');
    console.info('✅ Dry run complete - backup script validated');
    cleanup(true);
    return;
  }

  // Create dump using spawn with array arguments (prevents command injection)
  try {
    const dumpArgs = isMySQL
      ? ['-h', host, '-P', port, '-u', user, database]
      : ['-h', host, '-p', port, '-U', user, database];

    const dumpCommand = isMySQL ? 'mysqldump' : 'pg_dump';
    const env = isMySQL
      ? { ...process.env, MYSQL_PWD: password }
      : { ...process.env, PGPASSWORD: password };

    // SECURITY: Use spawn with array args (no shell interpretation)
    const dumpProcess = spawn(dumpCommand, dumpArgs, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // SECURITY: Create output file with restrictive permissions from the start (mode 0o600)
    const gzipStream = createGzip();
    const outputStream = createWriteStream(localPath, { mode: 0o600 });

    // Capture stderr for error reporting
    let stderrData = '';
    dumpProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Wait for dump to complete
    await new Promise<void>((resolve, reject) => {
      pipeline(dumpProcess.stdout, gzipStream, outputStream)
        .then(() => {
          dumpProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              // SECURITY: Don't log full stderr (might contain sensitive data)
              reject(new Error(`Dump process exited with code ${code}`));
            }
          });
        })
        .catch(reject);
    });

    console.info('✅ Database dump created');

    // SECURITY: Verify file was created and has content
    if (!existsSync(localPath)) {
      throw new Error('Backup file was not created');
    }

    const stats = statSync(localPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    console.info(`📊 Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // SECURITY: Calculate checksum for integrity verification
    const fileBuffer = readFileSync(localPath);
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const md5Base64 = createHash('md5').update(fileBuffer).digest('base64');
    console.info(`🔐 SHA-256: ${sha256}`);

    // Upload to S3 if configured
    if (S3_BUCKET) {
      console.info(`☁️  Uploading to S3: ${S3_BUCKET}`);

      const s3 = new S3Client({ region: S3_REGION });

      try {
        // SECURITY: Upload with encryption and integrity check
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: `backups/${filename}`,
          Body: fileBuffer,
          ContentType: 'application/gzip',
          ServerSideEncryption: 'AES256', // SECURITY: Enable server-side encryption
          ContentMD5: md5Base64, // SECURITY: Integrity verification
          Metadata: {
            'backup-timestamp': timestamp,
            'sha256': sha256,
          },
        }));

        // SECURITY: Verify upload succeeded
        const headResult = await s3.send(new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: `backups/${filename}`,
        }));

        if (headResult.ContentLength !== stats.size) {
          throw new Error('S3 upload size mismatch - integrity check failed');
        }

        console.info('✅ Uploaded to S3 (encrypted, verified)');

        // Clean up local file and temp directory
        cleanup(true);
        console.info('🧹 Local files cleaned up');
      } catch (err) {
        // SECURITY: Don't expose internal error details
        console.error('❌ S3 upload failed:', err instanceof Error ? err.message : 'Unknown error');
        console.info(`📁 Local backup saved at: ${localPath}`);
      }
    } else {
      console.info(`📁 No S3 configured. Backup saved at: ${localPath}`);
      // Keep the temp dir since backup is stored there
      tmpDir = null; // Prevent cleanup from removing it
    }

    console.info('✅ Backup complete!');
  } catch (err) {
    // SECURITY: Don't log full error (might contain credentials or paths)
    console.error('❌ Failed to create dump:', err instanceof Error ? err.message : 'Unknown error');
    cleanup(true);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err instanceof Error ? err.message : 'Unknown error');
  process.exit(1);
});
