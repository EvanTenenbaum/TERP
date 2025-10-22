import { createHash } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs/promises';
import path from 'node:path';

type Backend = 's3' | 'local';

const backend: Backend = process.env.OBJECT_STORAGE_ENDPOINT ? 's3' : 'local';

const bucket = process.env.OBJECT_STORAGE_BUCKET || 'attachments';
const uploadDir = process.env.UPLOAD_DIR || '.uploads';

function s3() {
  return new S3Client({
    region: process.env.OBJECT_STORAGE_REGION || 'auto',
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET ? {
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
    } : undefined,
  });
}

export async function putObject(key: string, content: Buffer, contentType = 'application/octet-stream') {
  if (backend === 's3') {
    const client = s3();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: content, ContentType: contentType }));
    return { key };
  } else {
    const full = path.join(uploadDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
    return { key };
  }
}

export async function getSignedReadUrl(key: string, expiresSeconds = 300) {
  if (backend === 's3') {
    const client = s3();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(client, command, { expiresIn: expiresSeconds });
  } else {
    return `/api/attachments/file?key=${encodeURIComponent(key)}`;
  }
}

export async function getObject(key: string): Promise<Buffer> {
  if (backend === 's3') {
    const client = s3();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } else {
    const full = path.join(uploadDir, key);
    return await fs.readFile(full);
  }
}

export async function deleteObject(key: string) {
  if (backend === 's3') {
    const client = s3();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } else {
    const full = path.join(uploadDir, key);
    await fs.rm(full, { force: true });
  }
}

export function hashName(name: string) {
  const h = createHash('sha256').update(name + ':' + Date.now()).digest('hex').slice(0, 32);
  return `${h}_${name.replace(/\s+/g, '_')}`;
}
