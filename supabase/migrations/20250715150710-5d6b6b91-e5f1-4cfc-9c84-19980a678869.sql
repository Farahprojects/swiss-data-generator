-- Create RPC function to call the parse-and-update-report Edge Function
CREATE OR REPLACE FUNCTION public.rpc_parse_and_update_report(
  raw_data JSONB,
  target_table TEXT,
  target_id TEXT,
  target_field TEXT,
  parse_type TEXT DEFAULT 'full_report'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSON;
  status_code INTEGER;
  error_msg TEXT;
  payload JSONB;
BEGIN
  -- Construct the payload for the Edge Function
  payload := jsonb_build_object(
    'rawData', raw_data,
    'updateTarget', jsonb_build_object(
      'table', target_table,
      'id', target_id,
      'field', target_field
    ),
    'parseType', parse_type
  );

  -- Call the Edge Function
  SELECT
    status,
    CASE 
      WHEN status >= 200 AND status < 300 THEN body::JSON
      ELSE jsonb_build_object('error', body)::JSON
    END
  INTO
    status_code,
    response
  FROM net.http_post(
    url := 'https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/parse-and-update-report',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTU4MDQ2MiwiZXhwIjoyMDYxMTU2NDYyfQ.lmtvouakq3-TxFH7nmUCpw9Gl5dO1ejyg76S3DBd82E'
    )
  );

  -- Log the call attempt
  INSERT INTO public.admin_logs (page, event_type, logs, meta)
  VALUES (
    'Database',
    'parse-and-update-report',
    format('Called parse-and-update-report for %s.%s (ID: %s)', target_table, target_field, target_id),
    jsonb_build_object(
      'status_code', status_code,
      'parse_type', parse_type,
      'response', response
    )
  );

  -- Check if the request failed
  IF status_code != 200 THEN
    error_msg := COALESCE(response ->> 'error', 'Unknown error');
    RAISE WARNING 'parse-and-update-report failed for %: %', target_id, error_msg;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Log any unexpected errors
  RAISE WARNING 'RPC parse-and-update-report exception: %', SQLERRM;
  
  -- Insert error log
  INSERT INTO public.admin_logs (page, event_type, logs, meta)
  VALUES (
    'Database',
    'parse-and-update-report-error',
    format('Error calling parse-and-update-report: %s', SQLERRM),
    jsonb_build_object(
      'target_table', target_table,
      'target_id', target_id,
      'target_field', target_field,
      'error', SQLERRM
    )
  );
  
  RETURN FALSE;
END;
$$;

-- Create trigger function that fires when swiss_data is updated in temp_report_data
CREATE OR REPLACE FUNCTION public.trigger_parse_temp_report_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw_data JSONB;
  result BOOLEAN;
BEGIN
  -- Only proceed if swiss_data has changed and is not null
  IF (OLD.swiss_data IS DISTINCT FROM NEW.swiss_data) AND (NEW.swiss_data IS NOT NULL) THEN
    -- Construct the raw data payload from temp_report_data fields
    raw_data := jsonb_build_object(
      'swiss_data', NEW.swiss_data,
      'metadata', NEW.metadata,
      'guest_report', (
        SELECT row_to_json(gr)
        FROM public.guest_reports gr
        WHERE gr.id = NEW.guest_report_id
      )
    );

    -- Call the RPC function to parse the data and update metadata
    SELECT rpc_parse_and_update_report(
      raw_data,
      'temp_report_data',
      NEW.id::text,
      'metadata',
      'metadata_only'
    ) INTO result;

    IF NOT result THEN
      RAISE NOTICE 'Failed to parse and update temp_report_data.metadata for ID: %', NEW.id;
    ELSE
      RAISE NOTICE 'Successfully parsed and updated temp_report_data.metadata for ID: %', NEW.id;
    END IF;
  END IF;

  -- Always return NEW to allow the update to proceed
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the update
  RAISE WARNING 'trigger_parse_temp_report_data error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger on temp_report_data table
DROP TRIGGER IF EXISTS trigger_parse_on_swiss_data_update ON public.temp_report_data;
CREATE TRIGGER trigger_parse_on_swiss_data_update
AFTER UPDATE OF swiss_data ON public.temp_report_data
FOR EACH ROW
EXECUTE FUNCTION public.trigger_parse_temp_report_data();

-- Make sure we have an admin_logs table for the logging
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  page TEXT NOT NULL,
  event_type TEXT NOT NULL,
  logs TEXT,
  meta JSONB,
  user_id UUID
);

-- Add RLS policy to protect admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only service role can access admin_logs" ON public.admin_logs;
CREATE POLICY "Only service role can access admin_logs" 
ON public.admin_logs 
FOR ALL 
USING (auth.role() = 'service_role');

COMMENT ON FUNCTION public.rpc_parse_and_update_report IS 'Calls the parse-and-update-report Edge Function to process report data and update a specific table field.';
COMMENT ON FUNCTION public.trigger_parse_temp_report_data IS 'Triggers when swiss_data is updated in temp_report_data to parse and update the metadata field.';