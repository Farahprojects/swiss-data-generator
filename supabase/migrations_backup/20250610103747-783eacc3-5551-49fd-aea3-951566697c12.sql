
-- Create a storage bucket for feature images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('feature-images', 'feature-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the feature-images bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'feature-images');
CREATE POLICY "Authenticated users can upload feature images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'feature-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update feature images" ON storage.objects FOR UPDATE USING (bucket_id = 'feature-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete feature images" ON storage.objects FOR DELETE USING (bucket_id = 'feature-images' AND auth.role() = 'authenticated');
