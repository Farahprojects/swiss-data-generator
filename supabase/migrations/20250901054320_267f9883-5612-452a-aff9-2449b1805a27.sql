-- Fix the search path security warning for our delete function
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user data from all public tables in correct order to handle foreign key constraints
  
  -- Delete conversations and related data
  DELETE FROM conversation_folders WHERE conversation_id IN (
    SELECT id FROM conversations WHERE user_id = user_id_to_delete
  );
  DELETE FROM messages WHERE chat_id IN (
    SELECT id FROM conversations WHERE user_id = user_id_to_delete
  );
  DELETE FROM chat_audio_clips WHERE chat_id IN (
    SELECT id FROM conversations WHERE user_id = user_id_to_delete
  );
  DELETE FROM conversations WHERE user_id = user_id_to_delete;
  
  -- Delete guest reports and related data
  DELETE FROM report_ready_signals WHERE guest_report_id IN (
    SELECT id FROM guest_reports WHERE user_id = user_id_to_delete
  );
  DELETE FROM messages WHERE chat_id IN (
    SELECT chat_id FROM guest_reports WHERE user_id = user_id_to_delete
  );
  DELETE FROM chat_audio_clips WHERE chat_id IN (
    SELECT chat_id FROM guest_reports WHERE user_id = user_id_to_delete
  );
  DELETE FROM guest_reports WHERE user_id = user_id_to_delete;
  
  -- Delete coaching related data
  DELETE FROM insight_entries WHERE coach_id = user_id_to_delete;
  DELETE FROM journal_entries WHERE coach_id = user_id_to_delete;
  DELETE FROM calendar_sessions WHERE coach_id = user_id_to_delete;
  DELETE FROM clients WHERE coach_id = user_id_to_delete;
  DELETE FROM coach_websites WHERE coach_id = user_id_to_delete;
  DELETE FROM coach_profiles WHERE user_id = user_id_to_delete;
  
  -- Delete email related data
  DELETE FROM email_messages WHERE user_id = user_id_to_delete;
  DELETE FROM email_signatures WHERE user_id = user_id_to_delete;
  DELETE FROM email_templates WHERE user_id = user_id_to_delete;
  
  -- Delete other user data
  DELETE FROM folders WHERE user_id = user_id_to_delete;
  DELETE FROM report_logs WHERE user_id = user_id_to_delete;
  DELETE FROM payment_method WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;
  DELETE FROM api_usage WHERE user_id = user_id_to_delete;
  
  -- Log the deletion
  INSERT INTO admin_logs (page, event_type, user_id, logs, meta)
  VALUES ('delete_account', 'account_deleted', user_id_to_delete, 'User account and all data deleted', jsonb_build_object('deleted_at', now()));
  
END;
$$;