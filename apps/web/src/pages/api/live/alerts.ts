import { z } from 'zod';
import { requireUser } from '../../../lib/auth';

export const config = { runtime: 'edge' };

const responseSchema = z.object({ alerts: z.array(z.any()) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    await requireUser(req);
    const alerts: any[] = [];
    return new Response(
      JSON.stringify(responseSchema.parse({ alerts })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
