
-- Add features_images field to the existing landing_page_config table
ALTER TABLE public.landing_page_config 
ADD COLUMN features_images JSONB NOT NULL DEFAULT '{}';

-- Update the existing record to include default features images
UPDATE public.landing_page_config 
SET features_images = '{
  "0": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
  "1": "https://auth.theraiastro.com/storage/v1/object/public/feature-images/Imagine2/Screenshot%202025-06-10%20at%206.57.31%20PM.png",
  "2": "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=600&fit=crop",
  "3": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop"
}'
WHERE id IN (SELECT id FROM public.landing_page_config ORDER BY created_at DESC LIMIT 1);
