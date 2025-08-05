
-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the report-images bucket
CREATE POLICY "Anyone can view report images" ON storage.objects
FOR SELECT USING (bucket_id = 'report-images');

CREATE POLICY "Authenticated users can upload report images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'report-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update report images" ON storage.objects
FOR UPDATE USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete report images" ON storage.objects
FOR DELETE USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');
