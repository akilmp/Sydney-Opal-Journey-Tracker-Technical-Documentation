import { z } from 'zod';
import { requireUser } from '../../../lib/auth';

export const config = { runtime: 'edge' };

const bodySchema = z.object({ content: z.string() });
const responseSchema = z.object({ uploadId: z.string() });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await req.json());
    const uploadId = `${user.id}-${Date.now()}`;
    return new Response(
      JSON.stringify(responseSchema.parse({ uploadId })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
