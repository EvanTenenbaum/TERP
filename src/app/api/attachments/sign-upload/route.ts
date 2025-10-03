import { api } from '@/lib/api';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';

const Input = z.object({
  name: z.string().min(1),
  contentType: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
});

function s3() {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const region = process.env.OBJECT_STORAGE_REGION || 'us-east-1';
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('S3 env not configured');
  return new S3Client({ endpoint, region, forcePathStyle: false, credentials: { accessKeyId, secretAccessKey } });
}

export const POST = api(Input, async ({ name, contentType, entity, entityId }) => {
  const bucket = process.env.OBJECT_STORAGE_BUCKET!;
  const key = `${entity || 'misc'}/${entityId || 'general'}/${crypto.createHash('sha256').update(name + Date.now()).digest('hex')}`;
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType || 'application/octet-stream' }), { expiresIn: 900 });
  return { ok: true, key, url };
}, ['SALES','ACCOUNTING','SUPER_ADMIN']);
