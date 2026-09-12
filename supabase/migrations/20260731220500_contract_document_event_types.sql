alter table public.contract_editor_events
  drop constraint if exists contract_editor_events_event_type_check;

alter table public.contract_editor_events
  add constraint contract_editor_events_event_type_check
  check (event_type in (
    'metadata_updated','version_created','version_activated','marked_ready',
    'returned_to_draft','archived','restored','contract_document_generated',
    'contract_document_generation_failed'
  ));
