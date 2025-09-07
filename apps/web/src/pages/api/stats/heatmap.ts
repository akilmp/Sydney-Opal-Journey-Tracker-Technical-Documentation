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
    const user = await requireUser();
    const trips = await prisma.trip.findMany({ where: { userId: user.id } });
    const weightMap = new Map<string, { lat: number; lng: number; weight: number }>();
    for (const t of trips as any[]) {
      const coords: Array<[number | null | undefined, number | null | undefined]> = [
        [t.originLat, t.originLng],
        [t.destLat, t.destLng],
      ];
      for (const [lat, lng] of coords) {
        if (lat == null || lng == null) continue;
        const key = `${lat},${lng}`;
        const existing = weightMap.get(key);
        if (existing) existing.weight += 1;
        else weightMap.set(key, { lat: Number(lat), lng: Number(lng), weight: 1 });
      }
    }
    const points = Array.from(weightMap.values());
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
