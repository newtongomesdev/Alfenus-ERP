-- Fix: remove incorrect balance constraint on contracts
-- The RPC register_payment calculates balance dynamically from installment payments,
-- not from upfront_amount_cents. The old constraint was mathematically wrong.

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_balance_matches;
