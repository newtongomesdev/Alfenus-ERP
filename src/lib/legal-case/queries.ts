import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getLegalCaseWorkspace(lawFirmId: string, caseId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const [caseResult, partiesResult, collaboratorsResult, movementsResult, membersResult, tasksResult, deadlinesResult, contractsResult, documentsResult] = await Promise.all([
    supabase.from("legal_cases").select("id, title, case_number, case_kind, action_type, status, priority, court, district, state, client_id").eq("law_firm_id", lawFirmId).eq("id", caseId).is("archived_at", null).maybeSingle(),
    supabase.from("legal_case_parties").select("id, name, party_role, document, contact").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId).order("created_at", { ascending: true }),
    supabase.from("legal_case_collaborators").select("id, member_id, collaborator_role").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId),
    supabase.from("legal_case_movements").select("id, title, description, occurred_at").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId).order("occurred_at", { ascending: false }),
    supabase.from("law_firm_members").select("id, name, role, email").eq("law_firm_id", lawFirmId).eq("status", "ativo").order("name"),
    supabase.from("tasks").select("id, title, description, responsible_member_id, due_at, priority, status").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("deadlines").select("id, title, type, due_date, due_time, priority, status, description").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId).order("due_date", { ascending: true }),
    supabase.from("contracts").select("id, service_description, total_amount_cents, upfront_amount_cents, balance_cents, installments_count, status, payment_method, created_at").eq("law_firm_id", lawFirmId).eq("legal_case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, name, mime_type, size_bytes, entity_type, entity_id, created_at").eq("law_firm_id", lawFirmId).eq("entity_type", "legal_case").eq("entity_id", caseId).order("created_at", { ascending: false }),
  ]);
  if (caseResult.error) throw caseResult.error;
  if (!caseResult.data) return null;
  if (partiesResult.error) throw partiesResult.error;
  if (collaboratorsResult.error) throw collaboratorsResult.error;
  if (movementsResult.error) throw movementsResult.error;
  if (membersResult.error) throw membersResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (deadlinesResult.error) throw deadlinesResult.error;
  if (contractsResult.error) throw contractsResult.error;
  if (documentsResult.error) throw documentsResult.error;
  const members = (membersResult.data ?? []) as Array<{ id: string; name: string; role: string; email: string }>;
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const tasks = (tasksResult.data ?? []) as Array<{ id: string; title: string; description: string | null; responsible_member_id: string | null; due_at: string | null; priority: string; status: string }>;
  const deadlines = (deadlinesResult.data ?? []) as Array<{ id: string; title: string; type: string; due_date: string; due_time: string | null; priority: string; status: string; description: string | null }>;
  const contracts = (contractsResult.data ?? []) as Array<{ id: string; service_description: string; total_amount_cents: number; upfront_amount_cents: number; balance_cents: number; installments_count: number; status: string; payment_method: string | null; created_at: string }>;
  const documents = (documentsResult.data ?? []) as Array<{ id: string; name: string; mime_type: string | null; size_bytes: number; entity_type: string; entity_id: string | null; created_at: string }>;
  const now = Date.now();

  const caseRow = caseResult.data as { client_id: string | null };
  const clientId = caseRow.client_id;
  const contractIds = contracts.map((c) => c.id);
  let contractInstallments: Array<{ contract_id: string; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }> = [];
  let payments: Array<{ id: string; amount_cents: number; payment_method: string; paid_at: string; notes: string | null; reversed_at: string | null; contract_id: string; installment_id: string }> = [];
  if (contractIds.length > 0) {
    const [instResult, paymentsResult] = await Promise.all([
      supabase
        .from("installments")
        .select("contract_id, final_amount_cents, paid_amount_cents, due_date, status")
        .eq("law_firm_id", lawFirmId)
        .in("contract_id", contractIds)
        .neq("status", "cancelada"),
      clientId ? supabase
        .from("payments")
        .select("id, amount_cents, payment_method, paid_at, notes, reversed_at, contract_id, installment_id")
        .eq("law_firm_id", lawFirmId)
        .eq("client_id", clientId)
        .order("paid_at", { ascending: false })
        .limit(50) : Promise.resolve({ data: null, error: null }),
    ]);
    if (!instResult.error && instResult.data) {
      contractInstallments = instResult.data as Array<{ contract_id: string; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;
    }
    if (!paymentsResult.error && paymentsResult.data) {
      payments = paymentsResult.data as Array<{ id: string; amount_cents: number; payment_method: string; paid_at: string; notes: string | null; reversed_at: string | null; contract_id: string; installment_id: string }>;
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const installmentStatsMap = new Map<string, { paid: number; pending: number; overdueAmount: number; overdueCount: number }>();
  for (const inst of contractInstallments) {
    const current = installmentStatsMap.get(inst.contract_id) ?? { paid: 0, pending: 0, overdueAmount: 0, overdueCount: 0 };
    current.paid += inst.paid_amount_cents;
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    current.pending += remaining;
    if (remaining > 0 && new Date(`${inst.due_date}T00:00:00`) < today) {
      current.overdueAmount += remaining;
      current.overdueCount += 1;
    }
    installmentStatsMap.set(inst.contract_id, current);
  }
  let totalContractAmount = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let totalOverdueInstallments = 0;
  const enrichedContracts = contracts.map((c) => {
    const stats = installmentStatsMap.get(c.id) ?? { paid: 0, pending: 0, overdueAmount: 0, overdueCount: 0 };
    totalContractAmount += c.total_amount_cents;
    totalPaid += stats.paid;
    totalPending += stats.pending;
    totalOverdue += stats.overdueAmount;
    totalOverdueInstallments += stats.overdueCount;
    return {
      id: c.id,
      serviceDescription: c.service_description,
      totalAmountCents: c.total_amount_cents,
      upfrontAmountCents: c.upfront_amount_cents,
      balanceCents: c.balance_cents,
      installmentsCount: c.installments_count,
      status: c.status,
      paymentMethod: c.payment_method,
      createdAt: c.created_at,
      paidAmountCents: stats.paid,
      pendingAmountCents: stats.pending,
      overdueAmountCents: stats.overdueAmount,
    };
  });

  return {
    case: caseResult.data as Record<string, unknown>,
    parties: (partiesResult.data ?? []) as Array<Record<string, unknown>>,
    collaborators: (collaboratorsResult.data ?? []).map((item) => { const row = item as { id: string; member_id: string; collaborator_role: string }; return { id: row.id, member_id: row.member_id, collaborator_role: row.collaborator_role, member: memberMap.get(row.member_id) ?? null }; }),
    movements: (movementsResult.data ?? []) as Array<Record<string, unknown>>,
    members,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      responsibleName: t.responsible_member_id ? memberMap.get(t.responsible_member_id)?.name ?? null : null,
      dueAt: t.due_at,
      priority: t.priority,
      status: t.status,
      isOverdue: Boolean(t.due_at) && new Date(t.due_at!).getTime() < now && !["concluido", "cancelado"].includes(t.status),
    })),
    deadlines: deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      dueDate: d.due_date,
      dueTime: d.due_time,
      priority: d.priority,
      status: d.status,
      description: d.description,
      isOverdue: d.status !== "concluido" && d.status !== "cancelado" && new Date(`${d.due_date}T00:00:00`) < new Date(new Date().toDateString()),
    })),
    contracts: enrichedContracts,
    payments: payments.filter((p) => !p.reversed_at).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      paymentMethod: p.payment_method,
      paidAt: p.paid_at,
      notes: p.notes,
      contractId: p.contract_id,
      installmentId: p.installment_id,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      createdAt: d.created_at,
    })),
    financialSummary: {
      totalContractAmountCents: totalContractAmount,
      totalPaidCents: totalPaid,
      totalPendingCents: totalPending,
      totalOverdueCents: totalOverdue,
      totalOverdueInstallments,
    },
  };
}

export async function getLegalCaseForEdit(lawFirmId: string, caseId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("legal_cases")
    .select("id, client_id, title, case_number, case_kind, action_type, court, court_division, district, state, started_at, opposing_party, opposing_lawyer, strategic_notes, tags, status, priority")
    .eq("law_firm_id", lawFirmId)
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as {
    id: string;
    client_id: string | null;
    title: string;
    case_number: string | null;
    case_kind: string;
    action_type: string;
    court: string | null;
    court_division: string | null;
    district: string | null;
    state: string | null;
    started_at: string | null;
    opposing_party: string | null;
    opposing_lawyer: string | null;
    strategic_notes: string | null;
    tags: string[];
    status: string;
    priority: string;
  };

  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    caseNumber: row.case_number,
    caseKind: row.case_kind,
    actionType: row.action_type,
    court: row.court,
    courtDivision: row.court_division,
    district: row.district,
    state: row.state,
    startedAt: row.started_at,
    opposingParty: row.opposing_party,
    opposingLawyer: row.opposing_lawyer,
    strategicNotes: row.strategic_notes,
    tags: Array.isArray(row.tags) ? row.tags.join(", ") : typeof row.tags === "string" ? row.tags : "",
    status: row.status,
    priority: row.priority,
  };
}
