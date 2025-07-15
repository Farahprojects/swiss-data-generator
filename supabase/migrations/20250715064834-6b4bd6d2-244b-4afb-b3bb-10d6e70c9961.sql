-- Add plain_token column to temp_report_data for caching tokens
ALTER TABLE temp_report_data 
ADD COLUMN plain_token text;