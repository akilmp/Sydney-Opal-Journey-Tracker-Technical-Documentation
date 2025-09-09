-- Align Setting table with updated settings fields
ALTER TABLE "public"."Setting" RENAME TO "settings";

ALTER TABLE "public"."settings" RENAME COLUMN "userId" TO "user_id";

ALTER TABLE "public"."settings"
    ADD COLUMN     "collect_metrics" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN     "share_anonymized_metrics" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "public"."settings" DROP COLUMN "privacyOptOut";
ALTER TABLE "public"."settings" DROP COLUMN "metricsOptIn";
