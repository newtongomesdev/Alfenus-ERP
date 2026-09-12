# Legacy migrations

These files are retained for audit and provenance only. They are not an active
Supabase migration chain because the historical prefixes `0007`, `0041`, and
`0042` were duplicated and the remote migration history is empty.

The active chain is the single canonical migration in `supabase/migrations/`:
`20260726200000_alfenus_canonical_baseline.sql`.

Do not apply files from this directory directly and do not insert rows manually
into `supabase_migrations.schema_migrations`.
