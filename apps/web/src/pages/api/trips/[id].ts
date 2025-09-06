import { z } from 'zod';
import { requireUser } from '../../../lib/auth';

export const config = { runtime: 'edge' };

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({ name: z.string().optional() });
const responseSchema = z.object({ id: z.string(), updated: z.boolean() });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'PATCH') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    await requireUser();
    const id = new URL(req.url).pathname.split('/').pop() || '';
    paramsSchema.parse({ id });
    const body = bodySchema.parse(await req.json());
    return new Response(
      JSON.stringify(responseSchema.parse({ id, updated: true })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
