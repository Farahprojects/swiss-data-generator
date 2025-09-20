-- ============================================================================
-- PHASE 4: Remove Guest Database Tables and Functions
-- ============================================================================
-- This migration removes all guest-related database tables, functions, 
-- indexes, and policies that are no longer needed after removing guest functionality.

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

-- Drop report ready signals indexes
DROP INDEX IF EXISTS idx_report_ready_signals_guest_report_id;
DROP INDEX IF EXISTS idx_report_ready_signals_created_at;

-- Drop temp report data indexes
DROP INDEX IF EXISTS idx_temp_report_data_guest_report_id;
DROP INDEX IF EXISTS idx_temp_report_data_expires_at;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

-- Drop guest-related tables (in dependency order)
DROP TABLE IF EXISTS public.temp_report_data CASCADE;
DROP TABLE IF EXISTS public.report_ready_signals CASCADE;
DROP TABLE IF EXISTS public.guest_reports CASCADE;

-- ============================================================================
-- CLEANUP COMMENTS
-- ============================================================================

-- Add comment to document the removal
COMMENT ON SCHEMA public IS 'Guest functionality removed - auth-only system';
