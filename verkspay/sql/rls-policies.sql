-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR PRISM
-- =============================================================================
-- This script enables RLS on all user data tables and adds policies to ensure
-- users can only see their own data.
--
-- Safe to run: These policies don't affect server routes (which use SERVICE_ROLE_KEY)
-- They only protect against unauthorized client-side access.
--
-- To apply:
-- 1. Copy all statements below
-- 2. Go to Supabase Console → SQL Editor
-- 3. Create new query and paste all statements
-- 4. Click "Run"
-- 5. Test: Log in to Prism and verify dashboard loads
--
-- =============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Users can only read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Only allow inserts during signup (handled by Supabase auth trigger)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);

-- ============================================================================
-- 2. INVOICES TABLE
-- ============================================================================
-- Users can only see their own invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
ON invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
ON invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
ON invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
ON invoices FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CLIENTS TABLE
-- ============================================================================
-- Users can only see their own clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
ON clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
ON clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
ON clients FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PROPOSALS TABLE
-- ============================================================================
-- Users can only see their own proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
ON proposals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proposals"
ON proposals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals"
ON proposals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
ON proposals FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 5. PAYMENT_RECORDS TABLE
-- ============================================================================
-- Users can only see their own payment records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment records"
ON payment_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment records"
ON payment_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment records"
ON payment_records FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment records"
ON payment_records FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 6. PAYMENT_METHODS TABLE
-- ============================================================================
-- Users can only see their own payment methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
ON payment_methods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
ON payment_methods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
ON payment_methods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
ON payment_methods FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 7. RECURRING_INVOICES TABLE
-- ============================================================================
-- Users can only see their own recurring invoice templates
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring invoices"
ON recurring_invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring invoices"
ON recurring_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring invoices"
ON recurring_invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring invoices"
ON recurring_invoices FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 8. REMINDERS_LOG TABLE (references invoices, has indirect user_id)
-- ============================================================================
-- Users can only see reminders for their own invoices
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
ON reminders_log FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own reminders"
ON reminders_log FOR DELETE
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is enabled and policies exist:
--
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
--
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- ============================================================================
-- TESTING
-- ============================================================================
-- After running this script:
--
-- 1. Log in to Prism as User A
-- 2. Create an invoice
-- 3. Open browser DevTools → Console
-- 4. Try to query User B's data (should fail or return empty):
--    await supabase.from('invoices').select('*')
--    .eq('user_id', 'user-b-id')
--
-- This should return empty array due to RLS policy
--
-- ============================================================================
