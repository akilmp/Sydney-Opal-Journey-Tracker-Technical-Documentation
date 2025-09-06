import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { presignUpload } from '../../../lib/storage';
import { PrismaClient } from '@prisma/client';

export const config = { runtime: 'edge' };

const prisma = new PrismaClient();

const bodySchema = z.object({ filename: z.string(), mime: z.string() });
const responseSchema = z.object({ uploadId: z.string(), url: z.string() });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await req.json());
    const uploadId = crypto.randomUUID();
    const key = `${user.id}/${uploadId}/${body.filename}`;
    const url = presignUpload(key, body.mime);
    await prisma.opalUpload.create({
      data: {
        id: uploadId,
        userId: user.id,
        filename: body.filename,
        mime: body.mime,
        status: 'pending',
        rowsParsed: 0,
      },
    });
    return new Response(
      JSON.stringify(responseSchema.parse({ uploadId, url })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
