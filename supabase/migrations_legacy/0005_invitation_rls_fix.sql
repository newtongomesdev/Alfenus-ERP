-- Migration 0005: Fix RLS policies for invitation acceptance flow.
-- PROBLEM: When a user accepts an invitation, they are NOT yet a member of the tenant,
-- so existing RLS policies block the inserts. BUT the original policy 0005 allowed any
-- authenticated user to self-insert into ANY tenant. This is now fixed.

-- 1. Allow authenticated users to insert themselves as law_firm_members ONLY IF
--    there is a pending invitation for their email in that tenant.
--    This prevents arbitrary users from joining any tenant.
DROP POLICY IF EXISTS "authenticated users can self-insert as member" ON public.law_firm_members;

CREATE POLICY "invited users can self-insert as member"
  ON public.law_firm_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.law_firm_id = law_firm_members.law_firm_id
        AND ti.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND ti.status = 'pendente'
        AND ti.expires_at > now()
    )
  );

-- 2. Allow authenticated users to read invitations addressed to their email.
DROP POLICY IF EXISTS "users can view own invitations" ON public.team_invitations;

CREATE POLICY "users can view own invitations"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 3. Allow authenticated users to accept (update) invitations addressed to their email.
--    Restricts: only pending invitations, only to 'aceito' status.
DROP POLICY IF EXISTS "users can accept own invitation" ON public.team_invitations;

CREATE POLICY "users can accept own invitation"
  ON public.team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pendente'
  )
  WITH CHECK (
    status = 'aceito'
  );

-- 4. Tighten RLS policies for write operations on expenses, deadlines, tasks,
--    appointments, documents, and notifications.
--    Only owners, administrators, and role-appropriate members can write.

-- Expenses: owners, admins, financial, and assigned members can manage
DROP POLICY IF EXISTS "tenant access expenses" ON public.expenses;
DROP POLICY IF EXISTS "tenant expense management" ON public.expenses;
CREATE POLICY "tenant expense management"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'financeiro']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = expenses.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'financeiro']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = expenses.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Deadlines: owners, admins, lawyers, and assigned members can manage
DROP POLICY IF EXISTS "tenant access deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "tenant deadline management" ON public.deadlines;
CREATE POLICY "tenant deadline management"
  ON public.deadlines
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR (participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )])
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )]
    )
  );

-- Tasks: owners, admins, lawyers, assistants, and assigned members can manage
DROP POLICY IF EXISTS "tenant access tasks" ON public.tasks;
DROP POLICY IF EXISTS "tenant task management" ON public.tasks;
CREATE POLICY "tenant task management"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente', 'colaborador']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR (participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )])
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente', 'colaborador']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )]
    )
  );

-- Appointments: owners, admins, lawyers, and assigned members can manage
DROP POLICY IF EXISTS "tenant access appointments" ON public.appointments;
DROP POLICY IF EXISTS "tenant appointment management" ON public.appointments;
CREATE POLICY "tenant appointment management"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = appointments.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = appointments.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Documents: owners, admins can manage all; others can manage their own uploads
DROP POLICY IF EXISTS "tenant access documents" ON public.documents;
DROP POLICY IF EXISTS "tenant document management" ON public.documents;
CREATE POLICY "tenant document management"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR uploaded_by = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = documents.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR uploaded_by = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = documents.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Notifications: members can read their own notifications, owners/admins can manage all
DROP POLICY IF EXISTS "tenant access notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant notification management" ON public.notifications;
CREATE POLICY "tenant notification management"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = notifications.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = notifications.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );
