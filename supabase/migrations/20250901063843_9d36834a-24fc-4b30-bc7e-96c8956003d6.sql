-- Drop all functions and triggers related to user_credits table

-- Drop triggers first (if they exist)
DROP TRIGGER IF EXISTS deduct_user_credit_trigger ON api_usage;
DROP TRIGGER IF EXISTS credit_user_balance_trigger ON topup_logs;
DROP TRIGGER IF EXISTS handle_topup_credit_trigger ON topup_logs;
DROP TRIGGER IF EXISTS credit_user_balance_on_log_update_trigger ON topup_logs;
DROP TRIGGER IF EXISTS check_balance_for_topup_trigger ON user_credits;
DROP TRIGGER IF EXISTS update_user_credits_last_updated_trigger ON user_credits;
DROP TRIGGER IF EXISTS handle_new_user_credits_trigger ON auth.users;

-- Drop all functions related to user_credits
DROP FUNCTION IF EXISTS public.handle_new_user_credits() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_user_credit() CASCADE;
DROP FUNCTION IF EXISTS public.credit_user_balance_on_log_update() CASCADE;
DROP FUNCTION IF EXISTS public.record_api_usage(uuid, text, numeric, jsonb, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_user_credits(uuid, numeric, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_credits_last_updated() CASCADE;
DROP FUNCTION IF EXISTS public.check_balance_for_topup() CASCADE;
DROP FUNCTION IF EXISTS public.increment_user_balance(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.credit_user_balance() CASCADE;
DROP FUNCTION IF EXISTS public.handle_topup_credit() CASCADE;

-- Update delete_user_account function to remove user_credits deletion
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the start of deletion process
  INSERT INTO admin_logs (page, event_type, user_id, logs, meta, created_at)
  VALUES (
    'delete_account', 
    'deletion_started', 
    user_id_to_delete, 
    'Starting comprehensive user account deletion',
    jsonb_build_object(
      'user_id', user_id_to_delete,
      'timestamp', now()
    ),
    now()
  );

  -- Delete from payment_method table
  DELETE FROM payment_method WHERE user_id = user_id_to_delete;
  
  -- Delete from profiles table
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Delete from conversations table (will cascade to messages)
  DELETE FROM conversations WHERE user_id = user_id_to_delete;
  
  -- Delete from folders table (will cascade to conversation_folders)
  DELETE FROM folders WHERE user_id = user_id_to_delete;
  
  -- Delete from clients table
  DELETE FROM clients WHERE coach_id = user_id_to_delete;
  
  -- Delete from coach_profiles table
  DELETE FROM coach_profiles WHERE user_id = user_id_to_delete;
  
  -- Delete from coach_websites table
  DELETE FROM coach_websites WHERE coach_id = user_id_to_delete;
  
  -- Delete from calendar_sessions table
  DELETE FROM calendar_sessions WHERE coach_id = user_id_to_delete;
  
  -- Delete from email_messages table
  DELETE FROM email_messages WHERE user_id = user_id_to_delete;
  
  -- Delete from email_signatures table
  DELETE FROM email_signatures WHERE user_id = user_id_to_delete;
  
  -- Delete from email_templates table
  DELETE FROM email_templates WHERE user_id = user_id_to_delete;
  
  -- Delete from insight_entries table
  DELETE FROM insight_entries WHERE coach_id = user_id_to_delete;
  
  -- Delete from journal_entries table
  DELETE FROM journal_entries WHERE coach_id = user_id_to_delete;
  
  -- Delete from report_logs table
  DELETE FROM report_logs WHERE user_id = user_id_to_delete;
  
  -- Update guest_reports to remove user_id reference but keep the reports
  UPDATE guest_reports 
  SET user_id = NULL 
  WHERE user_id = user_id_to_delete;

  -- Log successful database cleanup
  INSERT INTO admin_logs (page, event_type, user_id, logs, meta, created_at)
  VALUES (
    'delete_account', 
    'database_cleanup_completed', 
    user_id_to_delete, 
    'Successfully deleted all user data from database',
    jsonb_build_object(
      'user_id', user_id_to_delete,
      'timestamp', now()
    ),
    now()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the database cleanup error
    INSERT INTO admin_logs (page, event_type, user_id, logs, meta, created_at)
    VALUES (
      'delete_account', 
      'database_cleanup_error', 
      user_id_to_delete, 
      'Error during database cleanup: ' || SQLERRM,
      jsonb_build_object(
        'user_id', user_id_to_delete,
        'error', SQLERRM,
        'timestamp', now()
      ),
      now()
    );
    
    -- Re-raise the exception
    RAISE;
END;
$$;