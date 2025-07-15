-- Fix the rpc_parse_and_update_report function to properly handle HTTP response
CREATE OR REPLACE FUNCTION public.rpc_parse_and_update_report(raw_data jsonb, target_table text, target_id text, target_field text, parse_type text DEFAULT 'full_report')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  response JSON;
  status_code INTEGER;
  error_msg TEXT;
  payload JSONB;
BEGIN
  -- Construct the payload
  payload := jsonb_build_object(
    'rawData', raw_data,
    'updateTarget', jsonb_build_object(
      'table', target_table,
      'id', target_id,
      'field', target_field
    ),
    'parseType', parse_type
  );

  -- Perform HTTP call and store entire response
  SELECT net.http_post(
    url := 'https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/parse-and-update-report',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTU4MDQ2MiwiZXhwIjoyMDYxMTU2NDYyfQ.lmtvouakq3-TxFH7nmUCpw9Gl5dO1ejyg76S3DBd82E'
    )
  ) INTO response;

  -- Extract status code from response
  status_code := (response ->> 'status')::int;

  -- Log
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

  -- Return based on status
  IF status_code >= 200 AND status_code < 300 THEN
    RETURN TRUE;
  ELSE
    error_msg := COALESCE(response ->> 'body', 'Unknown error');
    RAISE WARNING 'parse-and-update-report failed for %: %', target_id, error_msg;
    RETURN FALSE;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'RPC parse-and-update-report exception: %', SQLERRM;
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
$function$;