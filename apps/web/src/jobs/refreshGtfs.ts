import { inngest } from "./client";
import { cache } from "../utils/cache";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Nightly job to refresh GTFS static data and invalidate caches.
 */
export const refreshGtfs = inngest.createFunction(
  { id: "refresh-gtfs-static" },
  // Run every night at 2am
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const url = process.env.GTFS_URL || "";
    const storageDir =
      process.env.GTFS_STORAGE_DIR || path.join(process.cwd(), "db", "gtfs");

    try {
      // Download latest GTFS archive
      const buffer = await step.run("download", async () => {
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
      });

      const hash = createHash("sha256").update(buffer).digest("hex");

      // Persist archive to storage and record hash
      await step.run("store", async () => {
        try {
          await fs.mkdir(storageDir, { recursive: true });
          await fs.writeFile(path.join(storageDir, `${hash}.zip`), buffer);
          await fs.writeFile(
            path.join(storageDir, "latest.json"),
            JSON.stringify({ hash }, null, 2)
          );
          console.info(
            { bytes: buffer.byteLength, hash },
            "gtfs archive persisted"
          );
        } catch (err) {
          console.error({ err, hash }, "failed to persist gtfs archive");
          throw err;
        }
      });

      // Invalidate caches
      await cache.clear("gtfs");

      return { refreshed: true, hash };
    } catch (err) {
      console.error({ err }, "refresh GTFS job failed");
      throw err;
    }
  }
);
