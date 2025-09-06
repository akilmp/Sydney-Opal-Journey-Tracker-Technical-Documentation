import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { getAlerts } from '../../../lib/transportNSW';

export const config = { runtime: 'edge' };

const querySchema = z.object({
  routeId: z.string(),
  line: z.string().optional(),
});
const responseSchema = z.object({ alerts: z.array(z.any()) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));
    const alerts = await getAlerts(query.routeId, query.line);
    return new Response(
      JSON.stringify(responseSchema.parse({ alerts })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    const status =
      typeof err.message === 'string' &&
      (err.message.includes('Transport NSW') ||
        err.message.includes('circuit breaker'))
        ? 503
        : 400;
    return new Response(status === 503 ? 'Service Unavailable' : 'Bad Request', {
      status,
    });
  }
}
