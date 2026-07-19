-- Transactional payment registration via RPC
-- Ensures payment, installment update, and contract balance recalculation
-- happen atomically in a single database transaction.
-- SECURITY: Uses search_path='', verifies tenant membership and role.

CREATE OR REPLACE FUNCTION public.register_payment(
  p_law_firm_id uuid,
  p_installment_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_discount_cents bigint DEFAULT 0,
  p_fine_cents bigint DEFAULT 0,
  p_interest_cents bigint DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_registered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_contract_id uuid;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
  v_remaining bigint;
BEGIN
  -- 1. Get the authenticated user's ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verify caller belongs to this tenant and has financial role
  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode registrar pagamentos', v_member.role;
  END IF;

  -- 3. Validate registered_by matches caller (or is NULL)
  IF p_registered_by IS NOT NULL AND p_registered_by != v_caller_id THEN
    RAISE EXCEPTION 'registered_by deve corresponder ao usuário autenticado';
  END IF;

  -- Lock the installment row to prevent concurrent modifications
  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = p_installment_id AND law_firm_id = p_law_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  -- Idempotency: check for duplicate payment on same installment + amount + date
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE installment_id = p_installment_id
      AND amount_cents = p_amount_cents
      AND paid_at::date = p_paid_at::date
      AND reversed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pagamento duplicado detectado';
  END IF;

  -- Calculate remaining balance and reject overpayment
  v_remaining := v_installment.final_amount_cents - v_installment.paid_amount_cents;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF p_amount_cents > v_remaining THEN
    RAISE EXCEPTION 'Valor excede o saldo da parcela (R$ %)', (v_remaining / 100.0)::text;
  END IF;

  -- Calculate new paid amount
  v_new_paid := v_installment.paid_amount_cents + p_amount_cents;
  v_contract_id := v_installment.contract_id;

  -- Determine new status
  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  -- Update installment
  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      paid_at = p_paid_at,
      payment_method = p_payment_method,
      status = v_new_status::installment_status,
      discount_cents = installments.discount_cents + p_discount_cents,
      fine_cents = installments.fine_cents + p_fine_cents,
      interest_cents = installments.interest_cents + p_interest_cents,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_installment_id;

  -- Insert payment record
  INSERT INTO public.payments (
    law_firm_id, installment_id, client_id, contract_id,
    amount_cents, payment_method, paid_at,
    discount_cents, fine_cents, interest_cents,
    notes, registered_by
  ) VALUES (
    p_law_firm_id, p_installment_id, v_installment.client_id, v_contract_id,
    p_amount_cents, p_payment_method, p_paid_at,
    p_discount_cents, p_fine_cents, p_interest_cents,
    p_notes, p_registered_by
  ) RETURNING id INTO v_payment_id;

  -- Recalculate contract balance
  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

-- Reverse a payment and recalculate installment + contract balance atomically
CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_law_firm_id uuid,
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
BEGIN
  -- 1. Get the authenticated user's ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verify caller belongs to this tenant and has financial role
  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode estornar pagamentos', v_member.role;
  END IF;

  -- Lock and get payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND law_firm_id = p_law_firm_id AND reversed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  -- Mark payment as reversed
  UPDATE public.payments
  SET reversed_at = now(),
      reversal_reason = p_reason
  WHERE id = p_payment_id;

  -- Lock installment
  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = v_payment.installment_id
  FOR UPDATE;

  -- Recalculate installment
  v_new_paid := GREATEST(v_installment.paid_amount_cents - v_payment.amount_cents, 0);

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      status = v_new_status::installment_status,
      updated_at = now()
  WHERE id = v_payment.installment_id;

  -- Recalculate contract balance
  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_payment.contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_payment.contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text, timestamptz, bigint, bigint, bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment(uuid, uuid, text) TO authenticated;
