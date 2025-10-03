import { api } from '@/lib/api';
import { z } from 'zod';
import { getObject } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

const Input = z.object({ key: z.string().min(1) });

export const GET = api(Input, async ({ key }) => {
  // Get attachment metadata for content type
  const att = await prisma.attachment.findFirst({
    where: { key, archived: false },
  });

  const contentType = att?.contentType || 'application/octet-stream';
  const buf = await getObject(key);
  
  return new Response(buf as any, { 
    headers: { 
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${att?.name || 'download'}"`,
    } 
  });
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING','SALES']);
