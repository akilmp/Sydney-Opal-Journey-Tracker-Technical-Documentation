import { z } from 'zod';
import { requireUser } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { presignDownload } from '../../../../lib/storage';
import { inngest } from '../../../../jobs';

export const config = { runtime: 'edge' };

const prisma = new PrismaClient();

const paramsSchema = z.object({ uploadId: z.string() });
const bodySchema = z.object({ type: z.enum(['csv', 'html']) });
const responseSchema = z.object({ uploadId: z.string() });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser(req);
    const { pathname } = new URL(req.url);
    const uploadId = pathname.split('/').pop() || '';
    paramsSchema.parse({ uploadId });
    const body = bodySchema.parse(await req.json());

    const upload = await prisma.opalUpload.findFirst({ where: { id: uploadId, userId: user.id } });
    if (!upload) {
      return new Response('Not Found', { status: 404 });
    }
    const key = `${user.id}/${uploadId}/${upload.filename}`;
    const fileUrl = presignDownload(key);

    await inngest.send({
      name: 'statements/uploaded',
      data: { fileUrl, uploadId, userId: user.id, type: body.type },

    });

    return new Response(
      JSON.stringify(responseSchema.parse({ uploadId })),
      { status: 202, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
