import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export const config = { runtime: 'nodejs' };

const querySchema = z.object({ limit: z.string().optional() });
const tripSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
  })
  .passthrough();
const responseSchema = z.object({ trips: z.array(tripSchema) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      orderBy: { tapOnTime: 'desc' },
      ...(limit ? { take: limit } : {}),
    });
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
