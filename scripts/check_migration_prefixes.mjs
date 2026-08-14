import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("supabase/migrations");
const legacyDir = path.resolve("supabase/migrations_legacy");
const files = fs.readdirSync(dir)
  .filter((file) => file.endsWith(".sql") && !file.startsWith("legacy"))
  .sort();
const groups = new Map();
const invalid = files.filter((file) => !/^\d{14}_[a-z0-9_-]+\.sql$/.test(file));

for (const file of files) {
  const match = file.match(/^(\d+)_/);
  if (!match) continue;
  const list = groups.get(match[1]) ?? [];
  list.push(file);
  groups.set(match[1], list);
}

const duplicates = [...groups.entries()].filter(([, names]) => names.length > 1);
if (invalid.length > 0 || duplicates.length > 0) {
  if (invalid.length > 0) {
    console.error("Invalid active migration filenames:");
    for (const file of invalid) console.error(file);
  }
  console.error("Duplicate migration prefixes:");
  for (const [prefix, names] of duplicates) console.error(`${prefix}: ${names.join(", ")}`);
  process.exitCode = 1;
} else {
  const legacyCount = fs.existsSync(legacyDir)
    ? fs.readdirSync(legacyDir).filter((file) => file.endsWith(".sql")).length
    : 0;
  console.log(`Migration chain is canonical (${files.length} active files; ignored legacy files: ${legacyCount}).`);
}
