-- Fix RLS policy for public conversations
-- Remove share_token requirement since we simplified to just is_public flag

-- Drop the old policy
DROP POLICY IF EXISTS "Public can view shared conversations" ON "public"."conversations";

-- Create new policy that only requires is_public = true
CREATE POLICY "Public can view shared conversations"
ON "public"."conversations"
AS PERMISSIVE
FOR SELECT
TO public
USING (is_public = true);
