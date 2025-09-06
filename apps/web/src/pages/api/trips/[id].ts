import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export const config = { runtime: 'nodejs' };

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
const tripSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
  })
  .passthrough();
const responseSchema = tripSchema;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'PATCH') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).pathname.split('/').pop() || '';
    paramsSchema.parse({ id });
    const body = bodySchema.parse(await req.json());

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return new Response('Not Found', { status: 404 });
    }

    const trip = await prisma.trip.update({ where: { id }, data: body });

    return new Response(
      JSON.stringify(responseSchema.parse(trip)),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
