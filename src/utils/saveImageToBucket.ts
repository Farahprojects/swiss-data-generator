
import { uploadFeatureImage } from './uploadFeatureImage';

export const saveUploadedImageToBucket = async (imageUrl: string, fileName: string) => {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    
    // Upload to bucket
    const uploadedUrl = await uploadFeatureImage(file, fileName);
    
    if (uploadedUrl) {
      console.log('Image successfully saved to bucket:', uploadedUrl);
      return uploadedUrl;
    } else {
      throw new Error('Failed to upload image to bucket');
    }
  } catch (error) {
    console.error('Error saving image to bucket:', error);
    return null;
  }
};

// Auto-save the uploaded dotted circle image
  const imagePath = '/placeholder.svg';
const fileName = 'dotted-circle-logo.png';

saveUploadedImageToBucket(imagePath, fileName)
  .then((url) => {
    if (url) {
      console.log('Dotted circle image saved successfully:', url);
    }
  })
  .catch((error) => {
    console.error('Failed to save dotted circle image:', error);
  });
