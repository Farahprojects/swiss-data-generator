import { supabase } from '@/integrations/supabase/client';
import { removeBackground, loadImageFromUrl } from './backgroundRemoval';

export const processLogoWithTransparentBackground = async () => {
  try {
    console.log('Processing logo for transparent background...');
    
    // Load the current logo image
    const logoUrl = "https://auth.therai.co/storage/v1/object/public/therai-assets/Therailogoblack.png";
    const imageElement = await loadImageFromUrl(logoUrl);
    
    // Remove background
    const transparentBlob = await removeBackground(imageElement);
    
    // Upload to storage
    const fileName = `therai-logo-transparent-${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('therai-assets')
      .upload(fileName, transparentBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (error) {
      console.error('Error uploading transparent logo:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('therai-assets')
      .getPublicUrl(data.path);

    console.log('Transparent logo created:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Error processing logo:', error);
    throw error;
  }
};