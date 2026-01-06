import { execSync } from 'child_process';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { format } from 'date-fns';

const DATABASE_URL = process.env.DATABASE_URL;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const S3_REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🗄️  TERP Database Backup Script');
  console.log('================================');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `terp-backup-${timestamp}.sql.gz`;
  const localPath = `/tmp/${filename}`;

  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  const isMySQL = url.protocol === 'mysql:';
  const host = url.hostname;
  const port = url.port || (isMySQL ? '3306' : '5432');
  const user = url.username;
  const password = url.password;
  const database = url.pathname.slice(1);

  console.log(`📊 Database: ${database} @ ${host}`);
  console.log(`📁 Output: ${filename}`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No actual backup will be created');
    console.log('✅ Dry run complete - backup script validated');
    return;
  }

  // Create dump
  try {
    if (isMySQL) {
      execSync(
        `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} | gzip > ${localPath}`,
        { stdio: 'inherit' }
      );
    } else {
      execSync(
        `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${user} ${database} | gzip > ${localPath}`,
        { stdio: 'inherit' }
      );
    }
    console.log('✅ Database dump created');
  } catch (error) {
    console.error('❌ Failed to create dump:', error);
    process.exit(1);
  }

  // Upload to S3 if configured
  if (S3_BUCKET) {
    console.log(`☁️  Uploading to S3: ${S3_BUCKET}`);

    const s3 = new S3Client({ region: S3_REGION });
    const fileStream = createReadStream(localPath);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `backups/${filename}`,
        Body: fileStream,
        ContentType: 'application/gzip',
      }));
      console.log('✅ Uploaded to S3');

      // Clean up local file
      unlinkSync(localPath);
      console.log('🧹 Local file cleaned up');
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      console.log(`📁 Local backup saved at: ${localPath}`);
    }
  } else {
    console.log(`📁 No S3 configured. Backup saved at: ${localPath}`);
  }

  console.log('✅ Backup complete!');
}

main().catch(console.error);
