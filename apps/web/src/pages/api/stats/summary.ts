import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export const config = { runtime: 'edge' };

const responseSchema = z.object({
  trips: z.number(),
  distance: z.number(),
  fare: z.number(),
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    await requireUser(req);
    const stats = { trips: 0, distance: 0, fare: 0 };

    return new Response(
      JSON.stringify(responseSchema.parse(stats)),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
