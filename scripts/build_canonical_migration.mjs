import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const legacyDir = path.join(root, "supabase", "migrations_legacy");
const outputPath = path.join(migrationsDir, "20260726200000_alfenus_canonical_baseline.sql");

const migrationOrder = (file) => {
  const [, version] = file.match(/^(\d+)_/) ?? [];
  const tieBreakers = {
    "0007_lgpd_privacy.sql": 1,
    "0007_admin_panel.sql": 2,
    "0041_onboarding_invites.sql": 1,
    "0041_solo_mode.sql": 2,
    "0042_document_access_logs.sql": 1,
    "0042_solo_pro.sql": 2,
  };
  return [Number(version ?? Number.MAX_SAFE_INTEGER), tieBreakers[file] ?? 0, file];
};

const migrations = fs.readdirSync(legacyDir)
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => {
    const left = migrationOrder(a);
    const right = migrationOrder(b);
    return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2]);
  });

function normalizeForwardDelta(file, source) {
  if (file === "0041_solo_mode.sql") {
    return source
      .replace(
      /-- Helper function for firm access[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;\s*/i,
      "-- has_law_firm_access is defined by 0001_foundation.sql in the canonical chain.\n",
      )
      .replace(
        /-- =============================================================================\s*-- PART 6: Insert Solo Plan[\s\S]*?(?=-- =============================================================================\s*-- PART 7: Insert Solo Feature Flags)/i,
        "-- PART 6 omitted: this project uses public.plan_settings, not the undefined public.plans table.\n\n",
      )
      .replace(
        /INSERT INTO public\.feature_flags \(id, key, name, description, enabled_by_default, created_at, updated_at\)/i,
        "INSERT INTO public.feature_flags (key, name, description, enabled_by_default, created_at, updated_at)",
      )
      .replace(/\('(solo_(?:mode|templates|receipts|proposals|intake|follow_ups))', '\1'/g, (_match, id) => `('${id}'`);
  }
  if (file === "0050_fix_pricing_idempotency.sql") {
    return source.replace(
      /CREATE TYPE IF NOT EXISTS public\.pricing_idempotency_status AS ENUM \(\s*'processing',\s*'completed',\s*'failed'\s*\);/i,
      "-- pricing_idempotency_status is created by 0049_pricing_idempotency.sql in the canonical chain.",
    );
  }
  return source;
}

const sections = [
  "-- Alfenus canonical baseline. Generated from the ordered legacy migration chain.",
  "-- This is the only migration discovered by Supabase CLI after legacy files are archived.",
  ...migrations.map((file) => `\n-- >>> canonical source: ${file}\n${normalizeForwardDelta(file, fs.readFileSync(path.join(legacyDir, file), "utf8")).trim()}\n-- <<< canonical source: ${file}`),
];

fs.writeFileSync(outputPath, `${sections.join("\n\n")}\n`, "utf8");
console.log(`Generated ${path.relative(root, outputPath)} from ${migrations.length} ordered sources.`);
