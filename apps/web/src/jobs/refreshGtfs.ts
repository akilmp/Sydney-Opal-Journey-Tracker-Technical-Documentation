import { inngest } from "./client";
import { cache } from "../utils/cache";

/**
 * Nightly job to refresh GTFS static data and invalidate caches.
 */
export const refreshGtfs = inngest.createFunction(
  { id: "refresh-gtfs-static" },
  // Run every night at 2am
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const url = process.env.GTFS_URL || "";

    // Download latest GTFS archive
    const data = await step.run("download", () => fetch(url).then(r => r.arrayBuffer()));

    // Persist archive somewhere (placeholder)
    await step.run("store", async () => {
      console.log(`retrieved ${data.byteLength} bytes of GTFS data`);
    });

    // Invalidate caches
    await cache.clear("gtfs");

    return { refreshed: true };
  }
);
