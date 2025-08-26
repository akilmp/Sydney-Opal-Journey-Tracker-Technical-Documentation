import { z } from 'zod';
import { requireUser } from '../../../../lib/auth';

export const config = { runtime: 'edge' };

const paramsSchema = z.object({ uploadId: z.string() });
const responseSchema = z.object({ parsed: z.boolean() });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    await requireUser(req);
    const { searchParams, pathname } = new URL(req.url);
    const uploadId = pathname.split('/').pop() || '';
    paramsSchema.parse({ uploadId });
    const parsed = true;
    return new Response(
      JSON.stringify(responseSchema.parse({ parsed })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
