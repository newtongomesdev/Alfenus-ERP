import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ModuleSegment = "pipeline" | "atendimentos" | "origem-dos-clientes" | "casos-extrajudiciais" | "audiencias" | "agenda" | "honorarios" | "parcelas" | "despesas" | "fluxo-de-caixa" | "inadimplencia" | "documentos" | "equipe" | "relatorios" | "notificacoes";

export type ModuleRow = { id: string; primary: string; secondary: string | null; status: string | null; date: string | null; amountCents: number | null };
export type ModuleMetric = { label: string; value: number; format: "integer" | "currency"; detail: string };
export type ModuleOverview = { title: string; description: string; metrics: ModuleMetric[]; rows: ModuleRow[]; empty: string; totalCount: number };

type QueryResult = { data: unknown[] | null; error: unknown; count: number | null };
type ChainedQuery = Promise<QueryResult> & {
  eq(column: string, value: string): ChainedQuery;
  in(column: string, values: string[]): ChainedQuery;
  neq(column: string, value: string): ChainedQuery;
  is(column: string, value: null): ChainedQuery;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ChainedQuery;
  limit(value: number): Promise<QueryResult>;
  range(from: number, to: number): Promise<QueryResult>;
};
type ModuleClient = { from(table: string): { select(columns: string, options?: { count?: "exact"; head?: boolean }): ChainedQuery } };

const configs: Record<ModuleSegment, Pick<ModuleOverview, "title" | "description" | "empty">> = {
  pipeline: { title: "Pipeline", description: "Acompanhe oportunidades por etapa e valor estimado.", empty: "Nenhum lead disponível para o pipeline." },
  atendimentos: { title: "Atendimentos", description: "Registre e acompanhe reuniões, retornos e compromissos do escritório.", empty: "Nenhum atendimento agendado." },
  "origem-dos-clientes": { title: "Origem dos clientes", description: "Entenda de onde vêm os clientes ativos do Alfenus.", empty: "Nenhum cliente com origem cadastrada." },
  "casos-extrajudiciais": { title: "Casos extrajudiciais", description: "Acompanhe demandas extrajudiciais sem exigir número judicial.", empty: "Nenhum caso extrajudicial cadastrado." },
  audiencias: { title: "Audiências", description: "Consulte audiências e compromissos jurídicos do escritório.", empty: "Nenhuma audiência cadastrada." },
  agenda: { title: "Agenda", description: "Visão consolidada dos compromissos do escritório.", empty: "Nenhum compromisso agendado." },
  honorarios: { title: "Honorários", description: "Acompanhe a carteira contratada e os valores de honorários.", empty: "Nenhum contrato de honorários cadastrado." },
  parcelas: { title: "Parcelas", description: "Consulte vencimentos, pagamentos e saldos de parcelas.", empty: "Nenhuma parcela cadastrada." },
  despesas: { title: "Despesas", description: "Controle custos vinculados ao escritório, clientes e processos.", empty: "Nenhuma despesa cadastrada." },
  "fluxo-de-caixa": { title: "Fluxo de caixa", description: "Veja entradas e saídas registradas no tenant.", empty: "Nenhum movimento financeiro cadastrado." },
  inadimplencia: { title: "Inadimplência", description: "Identifique parcelas vencidas e saldos que exigem cobrança.", empty: "Nenhuma parcela em atraso." },
  documentos: { title: "Documentos", description: "Consulte documentos armazenados e seus vínculos por tenant.", empty: "Nenhum documento armazenado." },
  equipe: { title: "Equipe", description: "Consulte membros, papéis e status de acesso do escritório.", empty: "Nenhum membro cadastrado." },
  relatorios: { title: "Relatórios", description: "Indicadores consolidados para decisões financeiras e jurídicas.", empty: "Ainda não há dados suficientes para os relatórios." },
  notificacoes: { title: "Notificações", description: "Acompanhe alertas internos sobre prazos, pagamentos e processos.", empty: "Nenhuma notificação para este escritório." },
};

function rows(data: unknown[] | null) { return (data ?? []) as Array<Record<string, unknown>>; }
function text(value: unknown) { return typeof value === "string" ? value : null; }
function number(value: unknown) { return typeof value === "number" ? value : Number(value ?? 0); }
function errorOrThrow(error: unknown) { if (error) throw error; }

export async function getModuleOverview(lawFirmId: string, segment: ModuleSegment, memberId: string, page?: number, limit?: number): Promise<ModuleOverview> {
  const supabase = await getSupabaseServerClient();
  const base = configs[segment];
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;
  if (!supabase) return { ...base, metrics: [], rows: [], totalCount: 0 };
  const client = supabase as unknown as ModuleClient;
  let data: unknown[] | null = [];
  let metrics: ModuleMetric[] = [];

  if (segment === "pipeline" || segment === "origem-dos-clientes") {
    const table = segment === "pipeline" ? "leads" : "clients";
    const cols = segment === "pipeline" ? "id, name, interest, funnel_stage, estimated_value_cents, next_contact_at, status" : "id, name, source, status, created_at";
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    // Count total for accurate pagination
    const { count: total } = await client.from(table).select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    const totalCount = total ?? 0;

    const result = await client.from(table).select(cols).eq("law_firm_id", lawFirmId).order("created_at", { ascending: false }).range(from, to);
    errorOrThrow(result.error); data = result.data;
    const items = rows(data);

    // For metrics we need full dataset – fetch all rows for accurate aggregation
    const { data: allData } = await client.from(table).select(cols.split(",").map((c) => c.trim().split(" ")[0]).join(", ")).eq("law_firm_id", lawFirmId).range(0, 9999);
    const allItems = rows(allData);

    metrics = segment === "pipeline" ? [
      { label: "Leads ativos", value: allItems.filter((item) => item.status !== "convertido" && item.status !== "perdido").length, format: "integer", detail: "Oportunidades em andamento" },
      { label: "Valor estimado", value: allItems.reduce((sum, item) => sum + number(item.estimated_value_cents), 0), format: "currency", detail: "Carteira em prospecção" },
    ] : [
      { label: "Clientes", value: totalCount, format: "integer", detail: "Registros consultados" },
      { label: "Com origem", value: allItems.filter((item) => Boolean(item.source)).length, format: "integer", detail: "Origem preenchida" },
    ];

    return {
      ...base, metrics,
      rows: items.map((item) => ({ id: String(item.id), primary: String(item.name ?? "Registro"), secondary: segment === "pipeline" ? `${String(item.interest ?? "Sem interesse")} · ${String(item.funnel_stage ?? "novo")}` : String(item.source ?? "Origem não informada"), status: text(item.status), date: text(segment === "pipeline" ? item.next_contact_at : item.created_at), amountCents: segment === "pipeline" ? number(item.estimated_value_cents) : null })),
      totalCount,
    };
  }

  if (["atendimentos", "audiencias", "agenda"].includes(segment)) {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    let countQuery = client.from("appointments").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    let query = client.from("appointments").select("id, title, type, starts_at, status, client_id, legal_case_id").eq("law_firm_id", lawFirmId).order("starts_at", { ascending: true });
    if (segment === "audiencias") {
      countQuery = countQuery.eq("type", "audiencia");
      query = query.eq("type", "audiencia");
    }
    const { count } = await countQuery;
    const totalCount = count ?? 0;
    const result = await query.range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    metrics = [{ label: "Compromissos", value: totalCount, format: "integer", detail: segment === "audiencias" ? "Audiências cadastradas" : "Itens na agenda" }, { label: "Agendados", value: items.filter((item) => item.status === "agendado").length, format: "integer", detail: "Status agendado" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.title ?? "Compromisso"), secondary: String(item.type ?? "reunião"), status: text(item.status), date: text(item.starts_at), amountCents: null })), totalCount };
  }

  if (segment === "casos-extrajudiciais") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("legal_cases").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId).eq("case_kind", "extrajudicial");
    const totalCount = count ?? 0;
    const result = await client.from("legal_cases").select("id, title, action_type, status, priority, created_at").eq("law_firm_id", lawFirmId).eq("case_kind", "extrajudicial").order("created_at", { ascending: false }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    metrics = [{ label: "Casos", value: totalCount, format: "integer", detail: "Casos extrajudiciais" }, { label: "Em andamento", value: items.filter((item) => item.status === "em_andamento").length, format: "integer", detail: "Status em andamento" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.title ?? "Caso"), secondary: String(item.action_type ?? "Assunto não informado"), status: text(item.status), date: text(item.created_at), amountCents: null })), totalCount };
  }

  if (segment === "honorarios") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("contracts").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    const totalCount = count ?? 0;
    const result = await client.from("contracts").select("id, service_description, total_amount_cents, status, created_at").eq("law_firm_id", lawFirmId).order("created_at", { ascending: false }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    // For metrics, sum from the full dataset
    const { data: allContracts } = await client.from("contracts").select("total_amount_cents").eq("law_firm_id", lawFirmId).range(0, 9999);
    const allContractRows = rows(allContracts);
    const total = allContractRows.reduce((sum, item) => sum + number(item.total_amount_cents), 0);
    metrics = [{ label: "Contratos", value: totalCount, format: "integer", detail: "Contratos de honorários" }, { label: "Carteira", value: total, format: "currency", detail: "Valor total contratado" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.service_description ?? "Contrato"), secondary: "Honorários", status: text(item.status), date: text(item.created_at), amountCents: number(item.total_amount_cents) })), totalCount };
  }

  if (["parcelas", "inadimplencia"].includes(segment)) {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    let countQuery = client.from("installments").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    let query = client.from("installments").select("id, number, final_amount_cents, paid_amount_cents, due_date, status, contract_id").eq("law_firm_id", lawFirmId).order("due_date", { ascending: true });
    if (segment === "inadimplencia") {
      countQuery = countQuery.in("status", ["atrasada", "parcialmente_paga", "pendente"]);
      query = query.in("status", ["atrasada", "parcialmente_paga", "pendente"]);
    }
    const { count } = await countQuery;
    const totalCount = count ?? 0;
    const result = await query.range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    const open = items.reduce((sum, item) => sum + Math.max(number(item.final_amount_cents) - number(item.paid_amount_cents), 0), 0);
    metrics = [{ label: "Parcelas", value: totalCount, format: "integer", detail: segment === "inadimplencia" ? "Parcelas para cobrança" : "Parcelas cadastradas" }, { label: "Saldo", value: open, format: "currency", detail: "Valor ainda em aberto" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: `Parcela #${String(item.number ?? "")}`, secondary: `Contrato ${String(item.contract_id ?? "").slice(0, 8)}`, status: text(item.status), date: text(item.due_date), amountCents: Math.max(number(item.final_amount_cents) - number(item.paid_amount_cents), 0) })), totalCount };
  }

  if (segment === "despesas") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("expenses").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    const totalCount = count ?? 0;
    const result = await client.from("expenses").select("id, description, category, amount_cents, due_date, status").eq("law_firm_id", lawFirmId).order("due_date", { ascending: true }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    const { data: allExpenses } = await client.from("expenses").select("amount_cents").eq("law_firm_id", lawFirmId).range(0, 9999);
    const total = rows(allExpenses).reduce((sum, item) => sum + number(item.amount_cents), 0);
    metrics = [{ label: "Despesas", value: totalCount, format: "integer", detail: "Lançamentos cadastrados" }, { label: "Total", value: total, format: "currency", detail: "Valor lançado" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.description ?? "Despesa"), secondary: String(item.category ?? "Sem categoria"), status: text(item.status), date: text(item.due_date), amountCents: number(item.amount_cents) })), totalCount };
  }

  if (segment === "fluxo-de-caixa") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const [paymentsResult, expensesResult] = await Promise.all([
      client.from("payments").select("id, amount_cents, paid_at, payment_method").eq("law_firm_id", lawFirmId).order("paid_at", { ascending: false }).range(from, to),
      client.from("expenses").select("id, description, amount_cents, paid_at, status").eq("law_firm_id", lawFirmId).order("paid_at", { ascending: false }).range(from, to),
    ]);
    const [paymentsCount, expensesCount] = await Promise.all([
      client.from("payments").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
      client.from("expenses").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    ]);
    errorOrThrow(paymentsResult.error); errorOrThrow(expensesResult.error);
    const payments = rows(paymentsResult.data); const expenses = rows(expensesResult.data);
    const { data: allPayments } = await client.from("payments").select("amount_cents").eq("law_firm_id", lawFirmId).range(0, 9999);
    const { data: allExpenses } = await client.from("expenses").select("amount_cents").eq("law_firm_id", lawFirmId).range(0, 9999);
    const received = rows(allPayments).reduce((sum, item) => sum + number(item.amount_cents), 0);
    const spent = rows(allExpenses).reduce((sum, item) => sum + number(item.amount_cents), 0);
    metrics = [{ label: "Entradas", value: received, format: "currency", detail: "Pagamentos registrados" }, { label: "Saídas", value: spent, format: "currency", detail: "Despesas lançadas" }, { label: "Saldo", value: received - spent, format: "currency", detail: "Entradas menos saídas" }];
    const totalCount = (paymentsCount.count ?? 0) + (expensesCount.count ?? 0);
    const allRows = [...payments.map((item) => ({ id: String(item.id), primary: "Recebimento", secondary: String(item.payment_method ?? "Forma não informada"), status: "recebido", date: text(item.paid_at), amountCents: number(item.amount_cents) })), ...expenses.map((item) => ({ id: String(item.id), primary: String(item.description ?? "Despesa"), secondary: "Despesa", status: text(item.status), date: text(item.paid_at), amountCents: -number(item.amount_cents) }))];
    return { ...base, metrics, rows: allRows, totalCount };
  }

  if (segment === "documentos") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("documents").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    const totalCount = count ?? 0;
    const result = await client.from("documents").select("id, name, mime_type, size_bytes, entity_type, created_at").eq("law_firm_id", lawFirmId).order("created_at", { ascending: false }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    metrics = [{ label: "Documentos", value: totalCount, format: "integer", detail: "Arquivos no tenant" }, { label: "Vínculos", value: new Set(items.map((item) => String(item.entity_type ?? ""))).size, format: "integer", detail: "Tipos de entidade" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.name ?? "Documento"), secondary: `${String(item.entity_type ?? "registro")} · ${String(item.mime_type ?? "tipo não informado")}`, status: "armazenado", date: text(item.created_at), amountCents: null })), totalCount };
  }

  if (segment === "equipe") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("law_firm_members").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
    const totalCount = count ?? 0;
    const result = await client.from("law_firm_members").select("id, name, email, role, status, created_at").eq("law_firm_id", lawFirmId).order("created_at", { ascending: true }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    metrics = [{ label: "Membros", value: totalCount, format: "integer", detail: "Pessoas no escritório" }, { label: "Ativos", value: items.filter((item) => item.status === "ativo").length, format: "integer", detail: "Acesso ativo" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.name ?? "Membro"), secondary: `${String(item.email ?? "")} · ${String(item.role ?? "")}`, status: text(item.status), date: text(item.created_at), amountCents: null })), totalCount };
  }

  if (segment === "notificacoes") {
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const { count } = await client.from("notifications").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId).eq("member_id", memberId);
    const totalCount = count ?? 0;
    const result = await client.from("notifications").select("id, title, body, type, read_at, created_at").eq("law_firm_id", lawFirmId).eq("member_id", memberId).order("created_at", { ascending: false }).range(from, to);
    errorOrThrow(result.error); data = result.data; const items = rows(data);
    metrics = [{ label: "Notificações", value: totalCount, format: "integer", detail: "Alertas para você" }, { label: "Não lidas", value: items.filter((item) => !item.read_at).length, format: "integer", detail: "Aguardando leitura" }];
    return { ...base, metrics, rows: items.map((item) => ({ id: String(item.id), primary: String(item.title ?? "Notificação"), secondary: String(item.body ?? item.type ?? "Alerta interno"), status: item.read_at ? "lida" : "pendente", date: text(item.created_at), amountCents: null })), totalCount };
  }

  const [clients, leads, cases, contracts] = await Promise.all([client.from("clients").select("id, status").eq("law_firm_id", lawFirmId).range(0, 9999), client.from("leads").select("id, status").eq("law_firm_id", lawFirmId).range(0, 9999), client.from("legal_cases").select("id, status").eq("law_firm_id", lawFirmId).range(0, 9999), client.from("contracts").select("id, total_amount_cents").eq("law_firm_id", lawFirmId).range(0, 9999)]);
  [clients, leads, cases, contracts].forEach((result) => errorOrThrow(result.error));
  const clientRows = rows(clients.data); const leadRows = rows(leads.data); const caseRows = rows(cases.data); const contractRows = rows(contracts.data);
  metrics = [{ label: "Clientes ativos", value: clientRows.filter((item) => item.status === "ativo").length, format: "integer", detail: "Base ativa" }, { label: "Leads", value: leadRows.filter((item) => !["convertido", "perdido"].includes(String(item.status))).length, format: "integer", detail: "Oportunidades abertas" }, { label: "Processos", value: caseRows.filter((item) => item.status !== "encerrado").length, format: "integer", detail: "Casos em andamento" }, { label: "Carteira", value: contractRows.reduce((sum, item) => sum + number(item.total_amount_cents), 0), format: "currency", detail: "Contratos cadastrados" }];
  return { ...base, metrics, rows: [], totalCount: 0 };
}

export function isModuleSegment(segment: string): segment is ModuleSegment { return segment in configs; }
