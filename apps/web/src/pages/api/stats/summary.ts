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
    const user = await requireUser(req);
    const agg = await prisma.trip.aggregate({

      where: { userId: user.id },
      _count: { _all: true },
      _sum: { distanceKm: true, fareCents: true },
    });
    const stats = {
      trips: agg._count._all ?? 0,
      distance: Number(agg._sum.distanceKm) || 0,
      fare: agg._sum.fareCents ?? 0,
    };

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
