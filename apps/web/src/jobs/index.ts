import { inngest } from "./client";
import { parseStatements } from "./parseStatements";
import { refreshGtfs } from "./refreshGtfs";

// Export all jobs so the rest of the app can register them
export const jobs = [parseStatements, refreshGtfs];

export { inngest };
