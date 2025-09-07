import { z } from 'zod';
import { requireUser } from '../../../lib/auth';

export const config = { runtime: 'edge' };

const responseSchema = z.object({
  points: z.array(
    z.object({ lat: z.number(), lng: z.number(), weight: z.number() })
  )
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
      await requireUser(req);
    const points: any[] = [];
    return new Response(
      JSON.stringify(responseSchema.parse({ points })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
