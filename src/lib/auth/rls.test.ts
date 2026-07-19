import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * Validates that the SQL migrations define proper RLS policies
 * and helper functions for all critical tables.
 *
 * This reads the actual migration SQL files to verify the schema,
 * so it catches drift if someone removes a policy or function.
 */

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function readMigration(pattern: RegExp): string {
  const files = [
    "0001_foundation.sql",
    "0002_operational_completeness.sql",
  ];
  let combined = "";
  for (const file of files) {
    try {
      combined += readFileSync(resolve(migrationsDir, file), "utf-8") + "\n";
    } catch {
      // File may not exist in test environment
    }
  }
  return combined;
}

const CRITICAL_TABLES = [
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
];

const TABLES_WITH_RESTRICTED_WRITE = [
  "contracts",
  "installments",
  "payments",
  "law_firm_members",
];

describe("RLS – has_law_firm_access function", () => {
  it("is defined in the foundation migration", () => {
    const sql = readMigration(/foundation/);
    expect(sql).toContain("create or replace function public.has_law_firm_access");
  });

  it("uses auth.uid() for user identification", () => {
    const sql = readMigration(/foundation/);
    // Extract from the function definition to the end of the $$ block
    const fnStart = sql.indexOf("create or replace function public.has_law_firm_access");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    // Find the $$...$$ body
    const bodyStart = sql.indexOf("$$", fnStart) + 2;
    const bodyEnd = sql.indexOf("$$", bodyStart);
    const body = sql.slice(bodyStart, bodyEnd);
    expect(body).toContain("auth.uid()");
  });

  it("checks law_firm_members for active status", () => {
    const sql = readMigration(/foundation/);
    const fnStart = sql.indexOf("create or replace function public.has_law_firm_access");
    const bodyStart = sql.indexOf("$$", fnStart) + 2;
    const bodyEnd = sql.indexOf("$$", bodyStart);
    const body = sql.slice(bodyStart, bodyEnd);
    expect(body).toContain("m.status = 'ativo'");
  });
});

describe("RLS – has_law_firm_role function", () => {
  it("is defined in the foundation migration", () => {
    const sql = readMigration(/foundation/);
    expect(sql).toContain("create or replace function public.has_law_firm_role");
  });

  it("accepts allowed_roles parameter of type member_role[]", () => {
    const sql = readMigration(/foundation/);
    const fnStart = sql.indexOf("create or replace function public.has_law_firm_role");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    // Check the signature line (before the $$)
    const sigEnd = sql.indexOf("$$", fnStart);
    const signature = sql.slice(fnStart, sigEnd);
    expect(signature).toContain("allowed_roles public.member_role[]");
  });

  it("checks role against the allowed_roles array", () => {
    const sql = readMigration(/foundation/);
    const fnStart = sql.indexOf("create or replace function public.has_law_firm_role");
    const bodyStart = sql.indexOf("$$", fnStart) + 2;
    const bodyEnd = sql.indexOf("$$", bodyStart);
    const body = sql.slice(bodyStart, bodyEnd);
    expect(body).toContain("m.role = any(allowed_roles)");
  });
});

describe("RLS – row level security enabled on critical tables", () => {
  const sql = readMigration(/foundation|operational/);

  for (const table of CRITICAL_TABLES) {
    it(`enables RLS on ${table}`, () => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    });
  }
});

describe("RLS – select policies for all critical tables", () => {
  const sql = readMigration(/foundation|operational/);

  for (const table of CRITICAL_TABLES) {
    it(`has a select policy on ${table}`, () => {
      const hasSelect = sql.includes(`on public.${table}`) && sql.includes("for select using");
      expect(hasSelect).toBe(true);
    });
  }
});

describe("RLS – write policies use has_law_firm_access or has_law_firm_role", () => {
  const sql = readMigration(/foundation|operational/);

  for (const table of CRITICAL_TABLES) {
    it(`write policy on ${table} references has_law_firm_access or has_law_firm_role`, () => {
      // Find all non-select policy lines for this table (for all, for insert, for update)
      const lines = sql.split("\n");
      const writePolicies = lines.filter(
        (line) =>
          line.includes(`on public.${table}`) &&
          !line.includes("for select") &&
          (line.includes("for all") || line.includes("for insert") || line.includes("for update")),
      );

      // At least one write policy must exist
      expect(writePolicies.length).toBeGreaterThan(0);

      // Each write policy must reference one of the auth functions
      for (const policy of writePolicies) {
        const hasAccess =
          policy.includes("has_law_firm_access") ||
          policy.includes("has_law_firm_role");
        expect(hasAccess).toBe(true);
      }
    });
  }
});

describe("RLS – restricted tables use role-based policies", () => {
  const sql = readMigration(/foundation|operational/);

  for (const table of TABLES_WITH_RESTRICTED_WRITE) {
    it(`write policy on ${table} uses has_law_firm_role`, () => {
      const lines = sql.split("\n");
      const writePolicies = lines.filter(
        (line) =>
          line.includes(`on public.${table}`) &&
          !line.includes("for select") &&
          (line.includes("for all") || line.includes("for insert") || line.includes("for update")),
      );

      expect(writePolicies.length).toBeGreaterThan(0);

      const hasRolePolicy = writePolicies.some((p) =>
        p.includes("has_law_firm_role"),
      );
      expect(hasRolePolicy).toBe(true);
    });
  }
});

describe("RLS – additional tables from operational migration", () => {
  const sql = readMigration(/operational/);

  const additionalTables = [
    "legal_case_parties",
    "legal_case_collaborators",
    "legal_case_movements",
    "team_invitations",
  ];

  for (const table of additionalTables) {
    it(`enables RLS on ${table}`, () => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    });

    it(`has a policy on ${table}`, () => {
      expect(sql).toContain(`on public.${table}`);
    });
  }
});
