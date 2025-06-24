
-- Clean up the null service in the madman website's customization_data
UPDATE coach_websites 
SET customization_data = jsonb_set(
  customization_data,
  '{services}',
  (
    SELECT jsonb_agg(service)
    FROM jsonb_array_elements(customization_data->'services') AS service
    WHERE service IS NOT NULL AND service != 'null'::jsonb
  )
)
WHERE site_slug = 'madman' 
AND customization_data->'services' @> '[null]'::jsonb;

-- If the services array becomes empty after cleaning, set it to an empty array
UPDATE coach_websites 
SET customization_data = jsonb_set(
  customization_data,
  '{services}',
  '[]'::jsonb
)
WHERE site_slug = 'madman' 
AND (customization_data->'services' IS NULL OR customization_data->'services' = '[]'::jsonb);
