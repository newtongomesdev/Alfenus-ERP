import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";

export type AppContextStatus = "missing-env" | "signed-out" | "missing-tenant" | "ready";

export type AppMember = {
  id: string;
  userId: string;
  lawFirmId: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  position: string | null;
  lastAccessAt: string | null;
};

export type AppLawFirm = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  logoPath: string | null;
  plan: string;
  status: string;
  createdAt: string;
};

export type AppContext = {
  status: AppContextStatus;
  member: AppMember | null;
  lawFirm: AppLawFirm | null;
};

export async function getAppContext(): Promise<AppContext> {
  if (!hasSupabaseEnv()) {
    return { status: "missing-env", member: null, lawFirm: null };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { status: "missing-env", member: null, lawFirm: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "signed-out", member: null, lawFirm: null };
  }

  const { data, error } = await supabase
    .from("law_firm_members")
    .select("id, user_id, law_firm_id, name, email, role, status, position, last_access_at, law_firms(id, name, slug, document, email, phone, logo_path, plan, status, created_at)")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { status: "missing-tenant", member: null, lawFirm: null };
  }

  const row = data as {
    id: string;
    user_id: string;
    law_firm_id: string;
    name: string;
    email: string;
    role: Role;
    status: string;
    position: string | null;
    last_access_at: string | null;
    law_firms: {
      id: string;
      name: string;
      slug: string;
      document: string | null;
      email: string | null;
      phone: string | null;
      logo_path: string | null;
      plan: string;
      status: string;
      created_at: string;
    } | null;
  };

  if (!row.law_firms) {
    return { status: "missing-tenant", member: null, lawFirm: null };
  }

  return {
    status: "ready",
    member: {
      id: row.id,
      userId: row.user_id,
      lawFirmId: row.law_firm_id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      position: row.position,
      lastAccessAt: row.last_access_at,
    },
    lawFirm: {
      id: row.law_firms.id,
      name: row.law_firms.name,
      slug: row.law_firms.slug,
      document: row.law_firms.document,
      email: row.law_firms.email,
      phone: row.law_firms.phone,
      logoPath: row.law_firms.logo_path,
      plan: row.law_firms.plan,
      status: row.law_firms.status,
      createdAt: row.law_firms.created_at,
    },
  };
}

export async function getLawFirmMembers(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("law_firm_members")
    .select("id, name, email, role, status, position, last_access_at, created_at")
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    status: string;
    position: string | null;
    last_access_at: string | null;
    created_at: string;
  }>;
}
