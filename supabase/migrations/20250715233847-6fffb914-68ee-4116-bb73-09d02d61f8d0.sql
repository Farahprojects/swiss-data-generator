-- Clean up Phase 1: Remove broken triggers and functions with CASCADE

-- Drop existing triggers that auto-enrich swiss_data
DROP TRIGGER IF EXISTS trg_guest_reports_swiss ON guest_reports;
DROP TRIGGER IF EXISTS trg_guest_reports_report ON guest_reports;

-- Drop the trigger that depends on trigger_parse_temp_report_data
DROP TRIGGER IF EXISTS trigger_parse_on_swiss_data_update ON temp_report_data;

-- Drop the problematic functions (CASCADE will handle dependencies)
DROP FUNCTION IF EXISTS insert_temp_report_data_swiss() CASCADE;
DROP FUNCTION IF EXISTS update_temp_report_data_report() CASCADE;
DROP FUNCTION IF EXISTS trigger_parse_temp_report_data() CASCADE;

-- Drop the RPC function that was causing issues
DROP FUNCTION IF EXISTS rpc_parse_and_update_report(jsonb, text, text, text, text);

-- Add comment for historical record
COMMENT ON TABLE temp_report_data IS 'Swiss data will now be enriched and saved directly from the frontend via save-swiss-data edge function';