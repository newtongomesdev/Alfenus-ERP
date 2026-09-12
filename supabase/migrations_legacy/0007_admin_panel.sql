-- Admin panel: superadmin function + RLS policies

-- Function to check if current user is a superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt()->'app_metadata'->>'role') = 'superadmin',
    false
  )
$$;

-- RLS policies for superadmin cross-tenant access
-- These are a safety net in case someone accidentally uses the anon client

-- Superadmins can view all tenants
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all tenants"
  ON public.law_firms FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmins can update tenants"
  ON public.law_firms FOR UPDATE
  USING (public.is_superadmin());

-- Superadmins can view all members
ALTER TABLE public.law_firm_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all members"
  ON public.law_firm_members FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all clients (for tenant metrics)
CREATE POLICY "Superadmins can view all clients"
  ON public.clients FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all contracts (for tenant metrics)
CREATE POLICY "Superadmins can view all contracts"
  ON public.contracts FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all installments
CREATE POLICY "Superadmins can view all installments"
  ON public.installments FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all payments
CREATE POLICY "Superadmins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all legal_cases
CREATE POLICY "Superadmins can view all legal_cases"
  ON public.legal_cases FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all documents
CREATE POLICY "Superadmins can view all documents"
  ON public.documents FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all leads
CREATE POLICY "Superadmins can view all leads"
  ON public.leads FOR SELECT
  USING (public.is_superadmin());
