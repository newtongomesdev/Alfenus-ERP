import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getWorkflowTemplates(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("workflow_templates")
    .select("id, name, description, practice_area, status, created_at, workflow_template_items(id, item_type, title, description, offset_days, priority, sort_order)")
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((template) => {
    const row = template as {
      id: string;
      name: string;
      description: string | null;
      practice_area: string | null;
      status: string;
      created_at: string;
      workflow_template_items?: Array<{
        id: string;
        item_type: string;
        title: string;
        description: string | null;
        offset_days: number;
        priority: string;
        sort_order: number;
      }>;
    };

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      practiceArea: row.practice_area,
      status: row.status,
      createdAt: row.created_at,
      items: (row.workflow_template_items ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          type: item.item_type,
          title: item.title,
          description: item.description,
          offsetDays: item.offset_days,
          priority: item.priority,
        })),
    };
  });
}

export async function getWorkflowApplyOptions(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { legalCases: [], members: [] };

  const [casesResult, membersResult] = await Promise.all([
    supabase
      .from("legal_cases")
      .select("id, title, client_id")
      .eq("law_firm_id", lawFirmId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("law_firm_members")
      .select("id, name, role")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "ativo")
      .order("name"),
  ]);

  if (casesResult.error) throw casesResult.error;
  if (membersResult.error) throw membersResult.error;

  return {
    legalCases: (casesResult.data ?? []).map((item) => {
      const row = item as { id: string; title: string; client_id: string | null };
      return { id: row.id, title: row.title, clientId: row.client_id };
    }),
    members: (membersResult.data ?? []).map((item) => {
      const row = item as { id: string; name: string; role: string };
      return { id: row.id, name: row.name, role: row.role };
    }),
  };
}
