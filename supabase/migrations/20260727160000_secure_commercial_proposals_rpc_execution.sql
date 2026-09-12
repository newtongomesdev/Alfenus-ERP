-- RPCs transacionais validam auth/membership/tenant/papel e precisam gravar
-- varias tabelas sem abrir DML direto para a Data API.
alter function public.create_commercial_proposal_manual(text,char(3),integer,text) security definer;
alter function public.create_commercial_proposal_from_pricing_version(uuid,uuid,text,uuid,uuid,integer,text,text) security definer;
alter function public.duplicate_commercial_proposal(uuid,text,boolean,text,text) security definer;
alter function public.update_commercial_proposal_metadata(uuid,timestamptz,text,text,timestamptz,text) security definer;
alter function public.get_commercial_proposals_secure(public.proposal_status) security definer;
alter function public.get_commercial_proposal_secure(uuid) security definer;
alter function public.get_commercial_proposal_version_secure(uuid,uuid) security definer;
alter function public.create_commercial_proposal_manual(text,char(3),integer,text) set search_path = public, extensions;
alter function public.create_commercial_proposal_from_pricing_version(uuid,uuid,text,uuid,uuid,integer,text,text) set search_path = public, extensions;
alter function public.duplicate_commercial_proposal(uuid,text,boolean,text,text) set search_path = public, extensions;
alter function public.update_commercial_proposal_metadata(uuid,timestamptz,text,text,timestamptz,text) set search_path = public, extensions;
alter function public.get_commercial_proposals_secure(public.proposal_status) set search_path = public, extensions;
alter function public.get_commercial_proposal_secure(uuid) set search_path = public, extensions;
alter function public.get_commercial_proposal_version_secure(uuid,uuid) set search_path = public, extensions;
revoke insert, update, delete on public.commercial_proposals, public.commercial_proposal_versions, public.commercial_proposal_sections, public.commercial_proposal_items, public.commercial_proposal_recipients, public.commercial_proposal_events, public.commercial_proposal_idempotency_operations from authenticated, anon;
