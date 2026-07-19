-- =============================================================================
-- Migration 0011: Activity Timeline, Comments, Notifications & Full-Text Search
-- =============================================================================
-- Adds:
--   1. Activity Timeline (activity_events table)
--   2. Comments System (comments + comment_mentions)
--   3. Notification Preferences + Enhanced Notifications
--   4. Full-Text Search Enhancement (tsvector + GIN indexes)
-- =============================================================================

-- =============================================================================
-- 1. Activity Timeline
-- =============================================================================

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  actor_name text,
  event_type text NOT NULL,  -- 'created', 'updated', 'status_changed', 'comment', 'document', 'payment', 'deadline', 'task', 'workflow', 'mention', 'import', 'bulk_action'
  entity_type text NOT NULL, -- 'client', 'lead', 'legal_case', 'contract', 'installment', 'payment', 'task', 'deadline', 'document', 'expense', 'time_entry', 'workflow', 'comment'
  entity_id uuid NOT NULL,
  entity_title text,         -- denormalized title for display
  description text,          -- human-readable description
  metadata jsonb DEFAULT '{}', -- extra data (old_value, new_value, etc)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_events_law_firm ON public.activity_events(law_firm_id, created_at DESC);
CREATE INDEX idx_activity_events_entity ON public.activity_events(entity_type, entity_id);
CREATE INDEX idx_activity_events_type ON public.activity_events(law_firm_id, event_type);

-- RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own firm events" ON public.activity_events FOR SELECT USING (public.has_law_firm_access(law_firm_id));
CREATE POLICY "System can insert events" ON public.activity_events FOR INSERT WITH CHECK (public.has_law_firm_access(law_firm_id));

-- =============================================================================
-- 2. Comments System
-- =============================================================================

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  author_name text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE, -- threading
  content text NOT NULL,
  is_private boolean DEFAULT false, -- internal only, not visible in client portal
  is_deleted boolean DEFAULT false, -- soft delete
  edited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id, created_at);
CREATE INDEX idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_law_firm ON public.comments(law_firm_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view comments on own firm" ON public.comments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
CREATE POLICY "Members can insert comments" ON public.comments FOR INSERT WITH CHECK (public.has_law_firm_access(law_firm_id));
CREATE POLICY "Authors can update own comments" ON public.comments FOR UPDATE USING (author_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = comments.law_firm_id AND status = 'ativo'));
CREATE POLICY "Authors can soft-delete own comments" ON public.comments FOR UPDATE USING (author_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = comments.law_firm_id AND status = 'ativo'));

-- Comment mentions (who was @mentioned)
CREATE TABLE public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.law_firm_members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, member_id)
);

CREATE INDEX idx_comment_mentions_member ON public.comment_mentions(member_id);

-- RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mentions in own firm" ON public.comment_mentions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id AND public.has_law_firm_access(c.law_firm_id))
);
CREATE POLICY "System can manage mentions" ON public.comment_mentions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id AND public.has_law_firm_access(c.law_firm_id))
);

-- =============================================================================
-- 3. Notification Preferences + Enhanced Notifications
-- =============================================================================

-- Notification preferences per member
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.law_firm_members(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'deadline_reminder', 'deadline_overdue', 'task_assigned', 'task_overdue', 'payment_received', 'payment_overdue', 'document_received', 'mention', 'workflow_update', 'client_portal_access'
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id, member_id, notification_type)
);

CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own preferences" ON public.notification_preferences FOR ALL USING (
  member_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = notification_preferences.law_firm_id AND status = 'ativo')
);

-- Add archived_at to notifications for archive feature
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- =============================================================================
-- 4. Full-Text Search Enhancement
-- =============================================================================

-- Add tsvector columns for full-text search
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update client search vector
CREATE OR REPLACE FUNCTION public.update_clients_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.document, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.whatsapp, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_search_vector_trigger BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_clients_search_vector();

-- Function to update leads search vector
CREATE OR REPLACE FUNCTION public.update_leads_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.interest, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_search_vector_trigger BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_leads_search_vector();

-- Function to update legal_cases search vector
CREATE OR REPLACE FUNCTION public.update_legal_cases_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.case_number, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.action_type, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.court, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.opposing_party, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.opposing_lawyer, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.strategic_notes, '')), 'D') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_cases_search_vector_trigger BEFORE INSERT OR UPDATE ON public.legal_cases FOR EACH ROW EXECUTE FUNCTION public.update_legal_cases_search_vector();

-- Function to update contracts search vector
CREATE OR REPLACE FUNCTION public.update_contracts_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.service_description, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_search_vector_trigger BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_contracts_search_vector();

-- Function to update tasks search vector
CREATE OR REPLACE FUNCTION public.update_tasks_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_tasks_search_vector();

-- GIN indexes for full-text search
CREATE INDEX idx_clients_search ON public.clients USING GIN(search_vector);
CREATE INDEX idx_leads_search ON public.leads USING GIN(search_vector);
CREATE INDEX idx_legal_cases_search ON public.legal_cases USING GIN(search_vector);
CREATE INDEX idx_contracts_search ON public.contracts USING GIN(search_vector);
CREATE INDEX idx_tasks_search ON public.tasks USING GIN(search_vector);
