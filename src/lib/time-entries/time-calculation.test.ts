import { describe, expect, it } from "vitest";

/**
 * Unit tests for time entry calculation logic.
 *
 * Mirrors the business logic in time-entries/queries.ts: amount calculation,
 * billable filtering, and totals aggregation.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface TimeEntry {
  id: string;
  description: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  hourlyRateCents: number;
  amountCents: number;
  billable: boolean;
  status: string;
  memberName: string;
  clientName: string | null;
  caseTitle: string | null;
}

interface TimeTotals {
  minutes: number;
  billableMinutes: number;
  amountCents: number;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring time-entries/queries.ts
// ---------------------------------------------------------------------------

function calculateAmountCents(durationMinutes: number, hourlyRateCents: number): number {
  return Math.round((durationMinutes / 60) * hourlyRateCents);
}

function calculateTotals(entries: TimeEntry[]): TimeTotals {
  return entries.reduce(
    (acc, entry) => {
      acc.minutes += entry.durationMinutes;
      if (entry.billable && entry.status !== "cancelado") {
        acc.billableMinutes += entry.durationMinutes;
        acc.amountCents += entry.amountCents;
      }
      return acc;
    },
    { minutes: 0, billableMinutes: 0, amountCents: 0 },
  );
}

function mapDbRowToEntry(row: {
  id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  hourly_rate_cents: number;
  billable: boolean;
  status: string;
  law_firm_members: { name: string } | null;
  clients: { name: string } | null;
  legal_cases: { title: string } | null;
}): TimeEntry {
  return {
    id: row.id,
    description: row.description,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    hourlyRateCents: row.hourly_rate_cents,
    amountCents: calculateAmountCents(row.duration_minutes, row.hourly_rate_cents),
    billable: row.billable,
    status: row.status,
    memberName: row.law_firm_members?.name ?? "Equipe",
    clientName: row.clients?.name ?? null,
    caseTitle: row.legal_cases?.title ?? null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Time calculation – amount computation", () => {
  it("calculates amount for 1 hour at R$100/h", () => {
    expect(calculateAmountCents(60, 100_00)).toBe(100_00);
  });

  it("calculates amount for 30 minutes at R$200/h", () => {
    expect(calculateAmountCents(30, 200_00)).toBe(100_00);
  });

  it("calculates amount for 15 minutes at R$150/h", () => {
    // 15/60 * 15000 = 3750
    expect(calculateAmountCents(15, 150_00)).toBe(3750);
  });

  it("rounds to nearest cent", () => {
    // 10 min at R$133.33/h = 10/60 * 13333 = 2222.166... → 2222
    expect(calculateAmountCents(10, 13333)).toBe(2222);
  });

  it("returns 0 for zero duration", () => {
    expect(calculateAmountCents(0, 100_00)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(calculateAmountCents(60, 0)).toBe(0);
  });

  it("handles large durations", () => {
    // 480 minutes (8h) at R$500/h = 8 * 50000 = 400000
    expect(calculateAmountCents(480, 500_00)).toBe(4_000_00);
  });
});

describe("Time calculation – totals aggregation", () => {
  it("sums all minutes including non-billable", () => {
    const entries: TimeEntry[] = [
      { id: "1", description: "A", startedAt: "", endedAt: null, durationMinutes: 60, hourlyRateCents: 100_00, billable: true, status: "faturado", memberName: "", clientName: null, caseTitle: null, amountCents: 100_00 },
      { id: "2", description: "B", startedAt: "", endedAt: null, durationMinutes: 30, hourlyRateCents: 100_00, billable: false, status: "rascunho", memberName: "", clientName: null, caseTitle: null, amountCents: 50_00 },
    ];

    const totals = calculateTotals(entries);
    expect(totals.minutes).toBe(90);
  });

  it("only counts billable entries in billableMinutes", () => {
    const entries: TimeEntry[] = [
      { id: "1", description: "A", startedAt: "", endedAt: null, durationMinutes: 60, hourlyRateCents: 100_00, billable: true, status: "faturado", memberName: "", clientName: null, caseTitle: null, amountCents: 100_00 },
      { id: "2", description: "B", startedAt: "", endedAt: null, durationMinutes: 30, hourlyRateCents: 100_00, billable: false, status: "rascunho", memberName: "", clientName: null, caseTitle: null, amountCents: 50_00 },
    ];

    const totals = calculateTotals(entries);
    expect(totals.billableMinutes).toBe(60);
  });

  it("excludes cancelled entries from billable totals", () => {
    const entries: TimeEntry[] = [
      { id: "1", description: "A", startedAt: "", endedAt: null, durationMinutes: 60, hourlyRateCents: 100_00, billable: true, status: "cancelado", memberName: "", clientName: null, caseTitle: null, amountCents: 100_00 },
    ];

    const totals = calculateTotals(entries);
    expect(totals.billableMinutes).toBe(0);
    expect(totals.amountCents).toBe(0);
    expect(totals.minutes).toBe(60); // still counts in total minutes
  });

  it("calculates correct amountCents for mixed entries", () => {
    const entries: TimeEntry[] = [
      { id: "1", description: "A", startedAt: "", endedAt: null, durationMinutes: 60, hourlyRateCents: 100_00, billable: true, status: "faturado", memberName: "", clientName: null, caseTitle: null, amountCents: 100_00 },
      { id: "2", description: "B", startedAt: "", endedAt: null, durationMinutes: 120, hourlyRateCents: 200_00, billable: true, status: "faturado", memberName: "", clientName: null, caseTitle: null, amountCents: 400_00 },
      { id: "3", description: "C", startedAt: "", endedAt: null, durationMinutes: 30, hourlyRateCents: 100_00, billable: false, status: "rascunho", memberName: "", clientName: null, caseTitle: null, amountCents: 50_00 },
    ];

    const totals = calculateTotals(entries);
    expect(totals.amountCents).toBe(500_00); // 100 + 400, not including 50
  });

  it("returns zeros for empty entries", () => {
    const totals = calculateTotals([]);
    expect(totals.minutes).toBe(0);
    expect(totals.billableMinutes).toBe(0);
    expect(totals.amountCents).toBe(0);
  });
});

describe("Time calculation – DB row mapping", () => {
  it("maps database row to entry with computed amountCents", () => {
    const row = {
      id: "entry-1",
      description: "Reunião com cliente",
      started_at: "2025-06-15T10:00:00Z",
      ended_at: "2025-06-15T11:00:00Z",
      duration_minutes: 60,
      hourly_rate_cents: 200_00,
      billable: true,
      status: "faturado",
      law_firm_members: { name: "Dr. João" },
      clients: { name: "Empresa XYZ" },
      legal_cases: { title: "Processo Trabalhista" },
    };

    const entry = mapDbRowToEntry(row);
    expect(entry.amountCents).toBe(200_00);
    expect(entry.memberName).toBe("Dr. João");
    expect(entry.clientName).toBe("Empresa XYZ");
    expect(entry.caseTitle).toBe("Processo Trabalhista");
  });

  it("handles null relations gracefully", () => {
    const row = {
      id: "entry-2",
      description: "Trabalho interno",
      started_at: "2025-06-15T10:00:00Z",
      ended_at: null,
      duration_minutes: 30,
      hourly_rate_cents: 100_00,
      billable: false,
      status: "rascunho",
      law_firm_members: null,
      clients: null,
      legal_cases: null,
    };

    const entry = mapDbRowToEntry(row);
    expect(entry.memberName).toBe("Equipe");
    expect(entry.clientName).toBeNull();
    expect(entry.caseTitle).toBeNull();
  });
});
