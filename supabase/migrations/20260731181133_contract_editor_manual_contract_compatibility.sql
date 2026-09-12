-- The original conversion version is always linked to a proposal. Later editor
-- versions also serve manually created contracts, where that origin is absent.
alter table public.contract_conversion_versions
  alter column source_proposal_id drop not null,
  alter column source_proposal_version_id drop not null;
