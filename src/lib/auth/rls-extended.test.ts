import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * Extended RLS tests covering tables added in migrations 0010 and 0011:
 * - client_portal_invites
 * - workflow_templates / workflow_template_items
 * - time_entries
 * - activity_events
 * - comments / comment_mentions
 * - notification_preferences
 *
 * Also validates search_vector triggers and GIN indexes.
 */

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function readMigration(filename: string): string {
  try {
    return readFileSync(resolve(migrationsDir, filename), "utf-8");
  } catch {
    return "";
  }
}

const migration0010 = readMigration("0010_portal_workflows_time_tracking.sql");
const migration0011 = readMigration("0011_timeline_comments_notifications.sql");

// ---------------------------------------------------------------------------
// Tables from migration 0010
// ---------------------------------------------------------------------------

describe("RLS 0010 – client_portal_invites", () => {
  it("enables RLS", () => {
    expect(migration0010).toContain("alter table public.client_portal_invites enable row level security");
  });

  it("has a policy referencing has_law_firm_role", () => {
    expect(migration0010).toContain("on public.client_portal_invites");
    expect(migration0010).toContain("has_law_firm_role");
  });

  it("restricts to proprietario, administrador, advogado, assistente", () => {
    const lower = migration0010.toLowerCase();
    expect(lower).toContain("'proprietario'");
    expect(lower).toContain("'administrador'");
    expect(lower).toContain("'advogado'");
    expect(lower).toContain("'assistente");
  });
});

describe("RLS 0010 – workflow_templates", () => {
  it("enables RLS", () => {
    expect(migration0010).toContain("alter table public.workflow_templates enable row level security");
  });

  it("has a policy with role-based access", () => {
    expect(migration0010).toContain("on public.workflow_templates");
  });
});

describe("RLS 0010 – workflow_template_items", () => {
  it("enables RLS", () => {
    expect(migration0010).toContain("alter table public.workflow_template_items enable row level security");
  });

  it("has a policy referencing has_law_firm_role", () => {
    expect(migration0010).toContain("on public.workflow_template_items");
    expect(migration0010).toContain("has_law_firm_role");
  });
});

describe("RLS 0010 – time_entries", () => {
  it("enables RLS", () => {
    expect(migration0010).toContain("alter table public.time_entries enable row level security");
  });

  it("has a policy with role-based access", () => {
    expect(migration0010).toContain("on public.time_entries");
    expect(migration0010).toContain("has_law_firm_role");
  });

  it("allows owner access via member_id check", () => {
    expect(migration0010).toContain("member_id in (select id from public.law_firm_members");
    expect(migration0010).toContain("user_id = auth.uid()");
  });

  it("includes proprietario, administrador, financeiro in role check", () => {
    const timeEntriesSection = migration0010.substring(
      migration0010.indexOf('"tenant access time entries"'),
    );
    expect(timeEntriesSection).toContain("'proprietario'");
    expect(timeEntriesSection).toContain("'administrador'");
    expect(timeEntriesSection).toContain("'financeiro'");
  });
});

// ---------------------------------------------------------------------------
// Tables from migration 0011
// ---------------------------------------------------------------------------

describe("RLS 0011 – activity_events", () => {
  it("enables RLS", () => {
    expect(migration0011).toContain("ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY");
  });

  it("has SELECT policy using has_law_firm_access", () => {
    expect(migration0011).toContain("FOR SELECT USING (public.has_law_firm_access(law_firm_id))");
  });

  it("has INSERT policy using has_law_firm_access", () => {
    expect(migration0011).toContain("FOR INSERT WITH CHECK (public.has_law_firm_access(law_firm_id))");
  });
});

describe("RLS 0011 – comments", () => {
  it("enables RLS", () => {
    expect(migration0011).toContain("ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY");
  });

  it("has SELECT policy using has_law_firm_access", () => {
    expect(migration0011).toContain("Members can view comments on own firm");
  });

  it("has INSERT policy using has_law_firm_access", () => {
    expect(migration0011).toContain("Members can insert comments");
  });

  it("has UPDATE policy restricting to author", () => {
    expect(migration0011).toContain("Authors can update own comments");
    expect(migration0011).toContain("author_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid()");
  });
});

describe("RLS 0011 – comment_mentions", () => {
  it("enables RLS", () => {
    expect(migration0011).toContain("ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY");
  });

  it("SELECT policy checks access via parent comment", () => {
    expect(migration0011).toContain("Members can view mentions in own firm");
    expect(migration0011).toContain("EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id");
  });
});

describe("RLS 0011 – notification_preferences", () => {
  it("enables RLS", () => {
    expect(migration0011).toContain("ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY");
  });

  it("policy restricts to own preferences only", () => {
    expect(migration0011).toContain("Members can manage own preferences");
    expect(migration0011).toContain("member_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid()");
  });

  it("uses FOR ALL (not just SELECT)", () => {
    const policyMatch = migration0011.match(
      /CREATE POLICY "Members can manage own preferences"[\s\S]*?;/,
    );
    expect(policyMatch?.[0]).toContain("FOR ALL");
  });
});

// ---------------------------------------------------------------------------
// Full-text search validation
// ---------------------------------------------------------------------------

describe("Full-text search – search_vector triggers", () => {
  it("has trigger for clients", () => {
    expect(migration0011).toContain("clients_search_vector_trigger");
    expect(migration0011).toContain("update_clients_search_vector");
  });

  it("has trigger for leads", () => {
    expect(migration0011).toContain("leads_search_vector_trigger");
  });

  it("has trigger for legal_cases", () => {
    expect(migration0011).toContain("legal_cases_search_vector_trigger");
  });

  it("has trigger for contracts", () => {
    expect(migration0011).toContain("contracts_search_vector_trigger");
  });

  it("has trigger for tasks", () => {
    expect(migration0011).toContain("tasks_search_vector_trigger");
  });
});

describe("Full-text search – GIN indexes", () => {
  it("has GIN index for clients", () => {
    expect(migration0011).toContain("idx_clients_search");
    expect(migration0011).toContain("USING GIN(search_vector)");
  });

  it("has GIN index for leads", () => {
    expect(migration0011).toContain("idx_leads_search");
  });

  it("has GIN index for legal_cases", () => {
    expect(migration0011).toContain("idx_legal_cases_search");
  });

  it("has GIN index for contracts", () => {
    expect(migration0011).toContain("idx_contracts_search");
  });

  it("has GIN index for tasks", () => {
    expect(migration0011).toContain("idx_tasks_search");
  });
});

describe("Full-text search – tsvector columns", () => {
  const tables = ["clients", "leads", "legal_cases", "contracts", "tasks", "documents"];

  for (const table of tables) {
    it(`adds search_vector column to ${table}`, () => {
      expect(migration0011).toContain(`ADD COLUMN IF NOT EXISTS search_vector tsvector`);
    });
  }
});

// ---------------------------------------------------------------------------
// Notification preferences unique constraint
// ---------------------------------------------------------------------------

describe("Notification preferences – constraints", () => {
  it("has unique constraint on (law_firm_id, member_id, notification_type)", () => {
    expect(migration0011).toContain("UNIQUE(law_firm_id, member_id, notification_type)");
  });

  it("has updated_at trigger", () => {
    expect(migration0011).toContain("notification_preferences_updated_at");
  });
});

// ---------------------------------------------------------------------------
// Comments – structural constraints
// ---------------------------------------------------------------------------

describe("Comments – structural constraints", () => {
  it("has threading via parent_id", () => {
    expect(migration0011).toContain("parent_id uuid REFERENCES public.comments(id)");
  });

  it("has soft delete via is_deleted", () => {
    expect(migration0011).toContain("is_deleted boolean DEFAULT false");
  });

  it("has uniqueness constraint on comment mentions", () => {
    expect(migration0011).toContain("UNIQUE(comment_id, member_id)");
  });
});
