-- 0037_plan_feature_overrides.sql
-- Add a JSONB column to plan_settings for per-plan feature overrides

ALTER TABLE plan_settings ADD COLUMN IF NOT EXISTS feature_overrides jsonb DEFAULT '{}'::jsonb;
