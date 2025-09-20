
import { supabase } from "@/integrations/supabase/client";

export const saveReportImageToBucket = async (imageUrl: string, fileName: string) => {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    
    // Upload to bucket
    const { data, error } = await supabase.storage
      .from('report-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('report-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error saving image to bucket:', error);
    return null;
  }
};

// Auto-save the essence report image
  const imagePath = '/placeholder.svg';
const fileName = 'essence-water-drop.png';

saveReportImageToBucket(imagePath, fileName)
  .then((url) => {
    if (url) {
      console.log('Essence report image saved successfully:', url);
    }
  })
  .catch((error) => {
    console.error('Failed to save essence report image:', error);
  });
