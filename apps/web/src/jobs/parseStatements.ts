import { inngest } from "./client";
import { cache } from "../utils/cache";

/**
 * Job: parse uploaded statement files and persist transactions to the DB.
 * Triggered whenever a `statements/uploaded` event is received.
 */
export const parseStatements = inngest.createFunction(
  { id: "parse-uploaded-statements" },
  { event: "statements/uploaded" },
  async ({ event, step }) => {
    const { fileUrl } = event.data;

    // Download the raw statement file
    const raw = await step.run("download", () => fetch(fileUrl).then(r => r.text()));

    // Parse each line into a statement record
    const lines = raw.split("\n").filter(Boolean);
    const records = lines.map(line => {
      const [date, description, amount] = line.split(",");
      return { date, description, amount: Number(amount) };
    });

    // Persist parsed records to the database (placeholder)
    await step.run("save", async () => {
      // replace with real DB logic
      console.log(`saving ${records.length} records`);
    });

    // Invalidate related caches
    await cache.clear("statements");

    return { parsed: records.length };
  }
);
