import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

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
    const user = await requireUser(req);
    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      select: { originLat: true, originLng: true, destLat: true, destLng: true },
    });

    const map = new Map<string, { lat: number; lng: number; weight: number }>();
    for (const t of trips) {
      const coords = [
        [t.originLat, t.originLng],
        [t.destLat, t.destLng],
      ];
      for (const [lat, lng] of coords) {
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        const key = `${lat},${lng}`;
        const existing = map.get(key);
        if (existing) existing.weight += 1;
        else map.set(key, { lat, lng, weight: 1 });
      }
    }
    const points = Array.from(map.values());

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
