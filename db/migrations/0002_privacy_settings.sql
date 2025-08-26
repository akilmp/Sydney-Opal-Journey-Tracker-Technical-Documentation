-- Add privacy and metrics configuration options
ALTER TABLE settings
    ADD COLUMN collect_metrics boolean DEFAULT true,
    ADD COLUMN share_anonymized_metrics boolean DEFAULT true;
