
-- Create storage bucket for landing page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-images', 'landing-images', true);

-- Create storage policies for the landing-images bucket
CREATE POLICY "Anyone can view landing images" ON storage.objects
FOR SELECT USING (bucket_id = 'landing-images');

CREATE POLICY "Authenticated users can upload landing images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'landing-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update landing images" ON storage.objects
FOR UPDATE USING (bucket_id = 'landing-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete landing images" ON storage.objects
FOR DELETE USING (bucket_id = 'landing-images' AND auth.role() = 'authenticated');

-- Create a table to store landing page configuration
CREATE TABLE public.landing_page_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_images JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on landing_page_config
ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;

-- Create policies for landing_page_config (public read, authenticated write)
CREATE POLICY "Anyone can view landing page config" ON public.landing_page_config
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert landing page config" ON public.landing_page_config
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update landing page config" ON public.landing_page_config
FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default configuration
INSERT INTO public.landing_page_config (feature_images) VALUES (
  '{
    "0": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    "1": "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=600&fit=crop",
    "2": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop"
  }'
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_landing_page_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_landing_page_config_updated_at
  BEFORE UPDATE ON public.landing_page_config
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_page_config_updated_at();
