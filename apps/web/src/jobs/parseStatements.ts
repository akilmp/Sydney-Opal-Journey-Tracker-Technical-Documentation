import { inngest } from "./client";
import { cache } from "../utils/cache";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Job: parse uploaded statement files and persist transactions to the DB.
 * Triggered whenever a `statements/uploaded` event is received.
 */
export const parseStatements = inngest.createFunction(
  { id: "parse-uploaded-statements" },
  { event: "statements/uploaded" },
  async ({ event, step }) => {
    const { fileUrl, uploadId, userId, type } = event.data as {
      fileUrl: string;
      uploadId: string;
      userId: string;
      type: "csv" | "html";
    };

    try {
      // Download the raw statement file
      const raw = await step.run("download", () => fetch(fileUrl).then(r => r.text()));

      // Parse the file using the shared opal parser
      const parser = await import("opal-parser");
      const parseFn = type === "html" ? parser.parseHTML : parser.parseCSV;
      const { records } = parseFn(raw, {});

      // Persist parsed trips and update upload status
      await step.run("persist", async () => {
        if (records.length) {
          await prisma.trip.createMany({
            data: records.map((r: any) => ({
              userId,
              tapOnTime: r.tap_on_time ? new Date(r.tap_on_time) : null,
              tapOffTime: r.tap_off_time ? new Date(r.tap_off_time) : null,
              mode: r.mode || null,
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
          data: { status: "parsed", rowsParsed: records.length },
        });
      });

      // Invalidate caches only after successful persistence
      await cache.clear("statements");

      return { parsed: records.length };
    } catch (err) {
      await prisma.opalUpload
        .update({ where: { id: uploadId }, data: { status: "error" } })
        .catch(() => undefined);
      throw err;
    }
  }
);
