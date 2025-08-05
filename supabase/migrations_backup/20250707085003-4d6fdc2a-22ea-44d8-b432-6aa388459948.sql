-- Fix the extract_report_content trigger to properly extract AI content for astro reports
CREATE OR REPLACE FUNCTION public.extract_report_content()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  report jsonb;
  content text;
begin
  begin
    -- Check if this is astro data (report_type contains astro data types)
    if NEW.report_type IN ('essence', 'sync', 'focus', 'flow', 'mindset', 'monthly') then
      -- For astro data: extract the AI-generated report from swiss_data
      report := NEW.swiss_data -> 'report';
      if report is not null then
        content := report ->> 'content';
        update guest_reports
        set report_content = content,
            has_report = true
        where id = NEW.id;
      else
        -- Fallback: look for report field directly in swiss_data
        content := NEW.swiss_data ->> 'report';
        if content is not null then
          update guest_reports
          set report_content = content,
              has_report = true
          where id = NEW.id;
        end if;
      end if;
    else
      -- For AI reports: extract text content from swiss_data
      report := NEW.swiss_data -> 'report';
      if report is not null then
        content := report ->> 'content';
        update guest_reports
        set report_content = content,
            has_report = true
        where id = NEW.id;
      end if;
    end if;
  exception when others then
    -- ignore malformed blobs
    null;
  end;

  return NEW;
end;
$function$;