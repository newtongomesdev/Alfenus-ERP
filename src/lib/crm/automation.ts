type AutomationAction = { type?: string; value?: string; tag?: string; memberId?: string };
type AutomationCondition = { field?: string; operator?: string; value?: string };

function readPath(value: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined), value);
}

function matches(lead: Record<string, unknown>, conditions: AutomationCondition[]) {
  return conditions.every((condition) => {
    const actual = String(readPath(lead, condition.field ?? "") ?? "").toLowerCase();
    const expected = String(condition.value ?? "").toLowerCase();
    if (condition.operator === "contains") return actual.includes(expected);
    if (condition.operator === "neq") return actual !== expected;
    return actual === expected;
  });
}

export async function runLeadAutomations(admin: any, params: { lawFirmId: string; leadId: string; triggerEvent: string; lead: Record<string, unknown> }) {
  const { data: rules } = await admin.from("crm_automation_rules").select("id, conditions, actions").eq("law_firm_id", params.lawFirmId).eq("trigger_event", params.triggerEvent).eq("is_active", true);
  for (const rule of rules ?? []) {
    if (!matches(params.lead, (rule.conditions ?? []) as AutomationCondition[])) continue;
    const results: Record<string, unknown>[] = [];
    let failed = false;
    for (const action of (rule.actions ?? []) as AutomationAction[]) {
      let error: unknown = null;
      if (action.type === "move_stage" && action.value) {
        ({ error } = await admin.from("leads").update({ funnel_stage: action.value }).eq("id", params.leadId).eq("law_firm_id", params.lawFirmId));
      } else if (action.type === "add_tag" && (action.tag || action.value)) {
        const { data: current } = await admin.from("leads").select("tags").eq("id", params.leadId).single();
        const tags = Array.from(new Set([...(current?.tags ?? []), action.tag ?? action.value]));
        ({ error } = await admin.from("leads").update({ tags }).eq("id", params.leadId).eq("law_firm_id", params.lawFirmId));
      } else if (action.type === "assign_responsible" && (action.memberId || action.value)) {
        ({ error } = await admin.from("leads").update({ responsible_member_id: action.memberId ?? action.value }).eq("id", params.leadId).eq("law_firm_id", params.lawFirmId));
      } else {
        error = new Error(`Ação desconhecida: ${action.type ?? ""}`);
      }
      failed ||= Boolean(error);
      results.push({ action, ok: !error, error: error ? String(error) : null });
    }
    await Promise.all([
      admin.from("crm_automation_runs").insert({ law_firm_id: params.lawFirmId, rule_id: rule.id, trigger_event: params.triggerEvent, entity_id: params.leadId, status: failed ? "partial" : "success", actions_result: results }),
      admin.from("crm_automation_rules").update({ last_run_at: new Date().toISOString(), run_count: 1 }).eq("id", rule.id),
    ]);
  }
}
