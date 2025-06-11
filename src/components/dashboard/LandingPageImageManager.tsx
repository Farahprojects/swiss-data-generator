
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Save, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLandingPageImages } from '@/hooks/useLandingPageImages';
import { useQueryClient } from '@tanstack/react-query';

const indexPageImages = [
  'Index Feature 1',
  'Index Feature 2', 
  'Index Feature 3'
];

const featuresPageImages = [
  'Easy Sign Up',
  'Client Management',
  'Journal Entries',
  'AI Insights & Reports'
];

export const LandingPageImageManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useLandingPageImages();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [indexImages, setIndexImages] = useState<Record<string, string>>({});
  const [featuresImages, setFeaturesImages] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (config?.feature_images) {
      setIndexImages(config.feature_images);
    }
    if (config?.features_images) {
      setFeaturesImages(config.features_images);
    }
  }, [config]);

  const handleImageUpload = async (pageType: 'index' | 'features', index: number, file: File) => {
    if (!user) return;

    const uploadKey = `${pageType}-${index}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be under 5MB');
      }

      // Determine bucket based on page type
      const bucketName = pageType === 'index' ? 'landing-images' : 'feature-images';
      
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${pageType}-${index}-${Date.now()}.${fileExt}`;
      const filePath = `${pageType}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      if (pageType === 'index') {
        setIndexImages(prev => ({
          ...prev,
          [index]: urlData.publicUrl
        }));
      } else {
        setFeaturesImages(prev => ({
          ...prev,
          [index]: urlData.publicUrl
        }));
      }

      toast({
        title: 'Image uploaded',
        description: `${pageType === 'index' ? 'Index' : 'Features'} page image ${index + 1} has been uploaded successfully.`
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.'
      });
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleSaveConfiguration = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('landing_page_config')
        .upsert({
          feature_images: indexImages,
          features_images: featuresImages
        });

      if (error) throw error;

      // Invalidate cache to refresh the landing page
      queryClient.invalidateQueries({ queryKey: ['landing-page-images'] });

      toast({
        title: 'Configuration saved',
        description: 'Landing page images have been updated successfully.'
      });

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Failed to save configuration.'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading images...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Landing Page Images
        </CardTitle>
        <CardDescription>
          Manage the images displayed on your Index and Features pages. Upload your own images to customize the appearance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Index Page Images */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Index Page (3 images)</h3>
          <div className="space-y-6">
            {indexPageImages.map((name, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">{name}</Label>
                
                {indexImages[index] && (
                  <div className="relative">
                    <img
                      src={indexImages[index]}
                      alt={name}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload('index', index, file);
                      }
                    }}
                    disabled={uploading[`index-${index}`]}
                    className="flex-1"
                  />
                  {uploading[`index-${index}`] && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Page Images */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Features Page (4 images)</h3>
          <div className="space-y-6">
            {featuresPageImages.map((name, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">{name}</Label>
                
                {featuresImages[index] && (
                  <div className="relative">
                    <img
                      src={featuresImages[index]}
                      alt={name}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload('features', index, file);
                      }
                    }}
                    disabled={uploading[`features-${index}`]}
                    className="flex-1"
                  />
                  {uploading[`features-${index}`] && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveConfiguration} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
