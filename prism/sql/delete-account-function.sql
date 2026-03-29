-- =============================================================================
-- DELETE ACCOUNT FUNCTION
-- =============================================================================
-- Secure account deletion that respects user ownership without using service role key
--
-- This function:
-- 1. Verifies the user owns the data being deleted
-- 2. Deletes all user data in correct dependency order
-- 3. Can be called with auth.uid() - no service role key needed
-- 4. Returns success/failure status
--
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  deleted_invoices INT,
  deleted_clients INT,
  deleted_proposals INT,
  deleted_payments INT,
  deleted_methods INT,
  deleted_recurring INT,
  deleted_reminders INT,
  deleted_profile BOOLEAN
) AS $$
DECLARE
  v_invoices_count INT := 0;
  v_clients_count INT := 0;
  v_proposals_count INT := 0;
  v_payment_records_count INT := 0;
  v_payment_methods_count INT := 0;
  v_recurring_count INT := 0;
  v_reminders_count INT := 0;
BEGIN
  -- Only allow users to delete their own account
  IF auth.uid() != p_user_id THEN
    RETURN QUERY SELECT false, 'Unauthorized: Cannot delete another user account', 0, 0, 0, 0, 0, 0, 0, false;
    RETURN;
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT false, 'User not found', 0, 0, 0, 0, 0, 0, 0, false;
    RETURN;
  END IF;

  -- Delete in dependency order (children before parents)
  
  -- 1. Delete reminders_log (depends on invoices)
  DELETE FROM reminders_log
  WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = p_user_id);
  GET DIAGNOSTICS v_reminders_count = ROW_COUNT;

  -- 2. Delete payment_records (depends on user)
  DELETE FROM payment_records
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_payment_records_count = ROW_COUNT;

  -- 3. Delete payment_methods (depends on user)
  DELETE FROM payment_methods
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_payment_methods_count = ROW_COUNT;

  -- 4. Delete recurring_invoices (depends on user)
  DELETE FROM recurring_invoices
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_recurring_count = ROW_COUNT;

  -- 5. Delete invoices (depends on user)
  DELETE FROM invoices
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_invoices_count = ROW_COUNT;

  -- 6. Delete clients (depends on user)
  DELETE FROM clients
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_clients_count = ROW_COUNT;

  -- 7. Delete proposals (depends on user)
  DELETE FROM proposals
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_proposals_count = ROW_COUNT;

  -- 8. Delete profile (final step)
  DELETE FROM profiles
  WHERE id = p_user_id;

  RETURN QUERY SELECT 
    true,
    'Account successfully deleted',
    v_invoices_count,
    v_clients_count,
    v_proposals_count,
    v_payment_records_count,
    v_payment_methods_count,
    v_recurring_count,
    v_reminders_count,
    true;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Error deleting account: ' || SQLERRM, 0, 0, 0, 0, 0, 0, 0, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Grant execution to authenticated users only
-- =============================================================================
REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM public;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- =============================================================================
-- USAGE EXAMPLE
-- =============================================================================
-- SELECT * FROM delete_user_account(auth.uid());
--
-- This returns:
-- success | message | deleted_invoices | deleted_clients | ... | deleted_profile
-- true    | Account successfully deleted | 5 | 3 | 2 | ...    | true
--
-- =============================================================================
