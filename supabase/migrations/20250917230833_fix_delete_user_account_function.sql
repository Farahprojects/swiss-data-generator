-- Fix delete_user_account function to remove references to dropped columns
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Delete from user_preferences table
  DELETE FROM user_preferences WHERE user_id = user_id_to_delete;
  
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
  
  -- NOTE: email_messages table no longer has user_id column (admin-only now)
  -- DELETE FROM email_messages WHERE user_id = user_id_to_delete;
  
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
$function$;
