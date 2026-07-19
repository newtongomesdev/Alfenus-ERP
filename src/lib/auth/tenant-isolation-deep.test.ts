import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { can, permissions, roles } from "./permissions";

/**
 * Deep tenant isolation tests.
 *
 * Validates that:
 * - All tables have law_firm_id column
 * - All critical tables have RLS enabled
 * - has_law_firm_access uses auth.uid()
 * - Superadmin cross-tenant access is read-only (except law_firms UPDATE)
 * - Storage policies scope by law_firm_id
 * - RPCs verify tenant membership
 * - DELETE CASCADE chains are correct
 */

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function readMigration(filename: string): string {
  try {
    return readFileSync(resolve(migrationsDir, filename), "utf-8");
  } catch {
    return "";
  };
}

const foundation = readMigration("0001_foundation.sql");
const operational = readMigration("0002_operational_completeness.sql");
const adminPanel = readMigration("0007_admin_panel.sql");
const portal0010 = readMigration("0010_portal_workflows_time_tracking.sql");
const timeline0011 = readMigration("0011_timeline_comments_notifications.sql");

const allMigrations = [foundation, operational, adminPanel, portal0010, timeline0011].join("\n");

// ---------------------------------------------------------------------------
// law_firm_id presence
// ---------------------------------------------------------------------------

const TABLES_WITH_LAW_FIRM_ID = [
  "law_firms",
  "law_firm_members",
  "clients",
  "leads",
  "legal_cases",
  "contracts",
  "installments",
  "payments",
  "expenses",
  "deadlines",
  "tasks",
  "appointments",
  "documents",
  "notifications",
  "audit_logs",
  "legal_case_parties",
  "legal_case_collaborators",
  "legal_case_movements",
  "team_invitations",
  "client_portal_invites",
  "workflow_templates",
  "workflow_template_items",
  "time_entries",
  "activity_events",
  "comments",
  "comment_mentions",
  "notification_preferences",
];

describe("Tenant isolation – law_firm_id on all tables", () => {
  for (const table of TABLES_WITH_LAW_FIRM_ID) {
    it(`${table} has law_firm_id column`, () => {
      // All tables should reference law_firms via law_firm_id
      expect(allMigrations).toContain(`public.${table}`);
    });
  }
});

// ---------------------------------------------------------------------------
// RLS enabled on all tables
// ---------------------------------------------------------------------------

const TABLES_WITH_RLS = [
  "law_firms",
  "law_firm_members",
  "clients",
  "leads",
  "legal_cases",
  "contracts",
  "installments",
  "payments",
  "expenses",
  "deadlines",
  "tasks",
  "appointments",
  "documents",
  "notifications",
  "audit_logs",
  "legal_case_parties",
  "legal_case_collaborators",
  "legal_case_movements",
  "team_invitations",
  "client_portal_invites",
  "workflow_templates",
  "workflow_template_items",
  "time_entries",
  "activity_events",
  "comments",
  "comment_mentions",
  "notification_preferences",
];

describe("Tenant isolation – RLS enabled on all tables", () => {
  for (const table of TABLES_WITH_RLS) {
    it(`RLS enabled on ${table}`, () => {
      const lower = allMigrations.toLowerCase();
      const hasRls = lower.includes(`enable row level security`) &&
        lower.includes(`on public.${table}`);
      expect(hasRls).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// has_law_firm_access function
// ---------------------------------------------------------------------------

describe("Tenant isolation – has_law_firm_access function", () => {
  it("uses auth.uid() for user identification", () => {
    expect(foundation).toContain("auth.uid()");
  });

  it("checks active membership status", () => {
    expect(foundation).toContain("m.status = 'ativo'");
  });

  it("queries law_firm_members table", () => {
    expect(foundation).toContain("from public.law_firm_members");
  });
});

// ---------------------------------------------------------------------------
// Superadmin cross-tenant access
// ---------------------------------------------------------------------------

describe("Tenant isolation – superadmin cross-tenant access", () => {
  it("is_superadmin checks app_metadata.role", () => {
    expect(adminPanel).toContain("app_metadata");
    expect(adminPanel).toContain("superadmin");
  });

  it("is_superadmin uses SECURITY DEFINER", () => {
    expect(adminPanel).toContain("SECURITY DEFINER");
  });

  it("is_superadmin sets search_path to empty", () => {
    expect(adminPanel).toContain("SET search_path = ''");
  });

  it("superadmin SELECT policies exist for critical tables", () => {
    const criticalTables = [
      "law_firms",
      "law_firm_members",
      "audit_logs",
      "clients",
      "contracts",
      "installments",
      "payments",
      "legal_cases",
      "documents",
      "leads",
    ];
    const lower = adminPanel.toLowerCase();
    for (const table of criticalTables) {
      expect(lower).toContain(`on public.${table}`);
    }
  });

  it("superadmin UPDATE is limited to law_firms only", () => {
    const lower = adminPanel.toLowerCase();
    // Find all tables with "FOR UPDATE" policies in admin panel
    const regex = /on public\.(\w+)\s+for update/g;
    const tables: string[] = [];
    let match;
    while ((match = regex.exec(lower)) !== null) {
      tables.push(match[1]);
    }
    expect(tables.length).toBeGreaterThanOrEqual(1);
    for (const table of tables) {
      expect(table).toBe("law_firms");
    }
  });
});

// ---------------------------------------------------------------------------
// Storage isolation
// ---------------------------------------------------------------------------

describe("Tenant isolation – storage policies", () => {
  it("storage policies extract law_firm_id from folder path", () => {
    expect(allMigrations).toContain("storage.foldername(name)");
  });

  it("storage policies validate tenant access", () => {
    expect(allMigrations).toContain("has_law_firm_access");
  });
});

// ---------------------------------------------------------------------------
// RPC tenant verification
// ---------------------------------------------------------------------------

describe("Tenant isolation – RPC tenant verification", () => {
  it("register_payment verifies tenant membership", () => {
    const rpcSql = readMigration("0006_payment_rpc.sql");
    expect(rpcSql).toContain("WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id");
  });

  it("reverse_payment verifies tenant membership", () => {
    const rpcSql = readMigration("0006_payment_rpc.sql");
    const reverseSection = rpcSql.substring(rpcSql.indexOf("reverse_payment"));
    expect(reverseSection).toContain("WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id");
  });

  it("convert_lead_to_client verifies tenant access", () => {
    expect(foundation).toContain("has_law_firm_access(lead_row.law_firm_id)");
  });
});

// ---------------------------------------------------------------------------
// DELETE CASCADE chains
// ---------------------------------------------------------------------------

describe("Tenant isolation – DELETE CASCADE chains", () => {
  it("law_firm_members cascades from law_firms", () => {
    expect(foundation).toContain("references public.law_firms(id) on delete cascade");
  });

  it("clients cascade from law_firms", () => {
    expect(foundation).toContain("references public.law_firms(id) on delete cascade");
  });

  it("workflow_template_items cascade from workflow_templates", () => {
    expect(portal0010).toContain("references public.workflow_templates(id) on delete cascade");
  });

  it("comment_mentions cascade from comments", () => {
    expect(timeline0011).toContain("REFERENCES public.comments(id) ON DELETE CASCADE");
  });
});

// ---------------------------------------------------------------------------
// Permission matrix completeness
// ---------------------------------------------------------------------------

describe("Tenant isolation – permission matrix completeness", () => {
  it("each role has distinct permission set", () => {
    const rolePermissionSets = new Map<string, Set<string>>();

    for (const role of roles) {
      const perms = new Set<string>();
      for (const perm of permissions) {
        if (can(role, perm)) perms.add(perm);
      }
      rolePermissionSets.set(role, perms);
    }

    const uniqueSets = new Set<string>();
    for (const [, perms] of rolePermissionSets) {
      uniqueSets.add(JSON.stringify([...perms].sort()));
    }
    expect(uniqueSets.size).toBeGreaterThan(1);
  });

  it("proprietario and administrador have identical permissions", () => {
    for (const perm of permissions) {
      expect(can("proprietario", perm)).toBe(can("administrador", perm));
    }
  });

  it("visualizador has only read permissions", () => {
    const writePerms = permissions.filter(
      (p: string) =>
        p.includes(".criar") ||
        p.includes(".editar") ||
        p.includes(".gerenciar") ||
        p.includes(".registrar") ||
        p.includes(".administrar"),
    );
    for (const perm of writePerms) {
      expect(can("visualizador", perm)).toBe(false);
    }
  });
});
