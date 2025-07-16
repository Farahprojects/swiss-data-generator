-- Add columns to track Swiss data save status and retry logic
ALTER TABLE temp_report_data 
ADD COLUMN swiss_data_saved BOOLEAN DEFAULT FALSE,
ADD COLUMN swiss_data_save_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN swiss_data_save_attempts INTEGER DEFAULT 0,
ADD COLUMN last_save_attempt_at TIMESTAMP;

-- Add comment explaining the new system
COMMENT ON COLUMN temp_report_data.swiss_data_saved IS 'Tracks if enriched Swiss data has been successfully saved via edge function';
COMMENT ON COLUMN temp_report_data.swiss_data_save_pending IS 'Indicates if a save operation is currently in progress';
COMMENT ON COLUMN temp_report_data.swiss_data_save_attempts IS 'Number of times saving has been attempted';
COMMENT ON COLUMN temp_report_data.last_save_attempt_at IS 'Timestamp of the last save attempt';