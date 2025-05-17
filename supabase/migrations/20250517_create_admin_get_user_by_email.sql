
-- Create a function to safely access auth.users by email
CREATE OR REPLACE FUNCTION public.admin_get_user_by_email(email_input TEXT)
RETURNS TABLE (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  email_change text,
  email_change_token_new text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.email_change,
    u.email_change_token_new
  FROM auth.users u
  WHERE u.email = email_input;
END;
$$;

-- Grant permission to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.admin_get_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_by_email(TEXT) TO service_role;
