-- Remove the foreign key constraint
ALTER TABLE guest_reports DROP CONSTRAINT IF EXISTS guest_reports_report_log_id_fkey;

-- Remove the report_log_id column
ALTER TABLE guest_reports DROP COLUMN IF EXISTS report_log_id;

-- Drop the trigger that was linking report_logs to guest_reports
DROP TRIGGER IF EXISTS trg_update_guest_reports_report_log ON guest_reports;
DROP FUNCTION IF EXISTS update_guest_reports_report_log();

-- Also drop any other triggers that might reference report_log_id
DROP TRIGGER IF EXISTS trg_guest_reports_report ON guest_reports;
DROP FUNCTION IF EXISTS update_temp_report_data_report(); 