-- ============================================================================
-- DROP GUEST_REPORTS TABLE AND ALL RELATED COMPONENTS
-- ============================================================================
-- This migration removes the guest_reports table and all its dependencies
-- since we've removed all guest functionality from the frontend.

-- ============================================================================
-- DROP TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Drop guest reports trigger
DROP TRIGGER IF EXISTS update_guest_reports_updated_at ON public.guest_reports;

-- Drop guest reports function
DROP FUNCTION IF EXISTS public.update_guest_reports_updated_at();

-- ============================================================================
-- DROP POLICIES
-- ============================================================================

-- Drop guest reports RLS policy
DROP POLICY IF EXISTS "service_role_manage_guest_reports" ON public.guest_reports;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

-- Drop guest reports indexes
DROP INDEX IF EXISTS idx_guest_reports_stripe_session_id;
DROP INDEX IF EXISTS idx_guest_reports_email;
DROP INDEX IF EXISTS idx_guest_reports_has_report;
DROP INDEX IF EXISTS idx_guest_reports_created_at;

-- ============================================================================
-- DROP TABLE
-- ============================================================================

-- Drop guest_reports table (CASCADE to handle any remaining dependencies)
DROP TABLE IF EXISTS public.guest_reports CASCADE;

-- ============================================================================
-- CLEANUP COMMENTS
-- ============================================================================

-- Add comment to document the removal
COMMENT ON SCHEMA public IS 'Guest functionality removed - auth-only system. guest_reports table dropped.';
