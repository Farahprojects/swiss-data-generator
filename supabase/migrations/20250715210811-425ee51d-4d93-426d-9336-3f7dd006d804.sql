-- Apply the updated trigger function to enrich swiss_data with person details
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

    -- Call the RPC function to parse the data and enrich swiss_data with person details
    SELECT rpc_parse_and_update_report(
      raw_data,
      'temp_report_data',
      NEW.id::text,
      'swiss_data',
      'full_report'
    ) INTO result;

    IF NOT result THEN
      RAISE NOTICE 'Failed to parse and update temp_report_data.swiss_data for ID: %', NEW.id;
    ELSE
      RAISE NOTICE 'Successfully parsed and updated temp_report_data.swiss_data for ID: %', NEW.id;
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