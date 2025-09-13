import { z } from 'zod';
import { requireUser } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { presignDownload } from '../../../../lib/storage';
import { inngest } from '../../../../jobs';

export const config = { runtime: 'edge' };

const prisma = new PrismaClient();

const paramsSchema = z.object({ uploadId: z.string() });
const bodySchema = z.object({ type: z.enum(['csv', 'html']) });
const warningSchema = z.object({ index: z.number(), message: z.string() });
const responseSchema = z.object({ uploadId: z.string(), rowsParsed: z.number(), warnings: z.array(warningSchema) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const user = await requireUser(req);
    const { pathname } = new URL(req.url);
    const uploadId = pathname.split('/').pop() || '';
    paramsSchema.parse({ uploadId });
    const body = bodySchema.parse(await req.json());

    const upload = await prisma.opalUpload.findFirst({ where: { id: uploadId, userId: user.id } });
    if (!upload) {
      return new Response('Not Found', { status: 404 });
    }
    const key = `${user.id}/${uploadId}/${upload.filename}`;
    const fileUrl = presignDownload(key);
    const rawRes = await fetch(fileUrl);
    const raw = await rawRes.text();

    const parser = await import('../../../../../../../packages/opal-parser/src');
    const parseFn = body.type === 'html' ? parser.parseHTML : parser.parseCSV;
    const { records, warnings } = parseFn(raw, {});

    if (records.length) {
      await prisma.trip.createMany({
        data: records.map((r: any) => ({
          userId: user.id,
          tapOnTime: r.tap_on_time ? new Date(r.tap_on_time) : null,
          tapOffTime: r.tap_off_time ? new Date(r.tap_off_time) : null,
          mode: r.line || null,
          line: r.line || null,
          originName: r.from_stop || null,
          originLat: r.from_lat ?? null,
          originLng: r.from_lng ?? null,
          destName: r.to_stop || null,
          destLat: r.to_lat ?? null,
          destLng: r.to_lng ?? null,
          fareCents: r.fare_cents ?? null,
          defaultFare: r.is_default_fare ?? false,
          source: uploadId,
        })),
      });
    }

    await prisma.opalUpload.update({
      where: { id: uploadId },
      data: { status: 'parsed', rowsParsed: records.length },
    });

    await inngest.send({ name: 'statements/uploaded', data: { fileUrl } });

    return new Response(
      JSON.stringify(responseSchema.parse({ uploadId, rowsParsed: records.length, warnings })),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return err instanceof Response
      ? err
      : new Response('Bad Request', { status: 400 });
  }
}
