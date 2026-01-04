-- FIX TRUTH & DARE POLICIES
-- The error "new row violates row-level security policy for table td_transactions"
-- happens because we forgot to allow users to INSERT payments.

-- 1. Enable Insert for Transactions
DROP POLICY IF EXISTS "Users can create transactions" ON public.td_transactions;
CREATE POLICY "Users can create transactions"
  ON public.td_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Update existing policies just in case (ensure Select is broad enough)
DROP POLICY IF EXISTS "Users can view their transactions" ON public.td_transactions;
CREATE POLICY "Users can view their transactions"
  ON public.td_transactions FOR SELECT
  USING (auth.uid() = user_id);
