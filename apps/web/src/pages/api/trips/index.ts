import { z } from 'zod';
import { requireUser } from '../../../lib/auth';

export const config = { runtime: 'edge' };

const querySchema = z.object({ limit: z.string().optional() });
const responseSchema = z.object({ trips: z.array(z.any()) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));
    const trips: any[] = [];
    return new Response(
      JSON.stringify(responseSchema.parse({ trips })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
