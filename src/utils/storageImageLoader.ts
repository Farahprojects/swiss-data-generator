
import { supabase } from "@/integrations/supabase/client";

interface StorageImages {
  headerImageUrl?: string;
  aboutImageUrl?: string;
  serviceImages: { [index: number]: string };
}

export const loadImagesFromStorage = async (userId: string): Promise<StorageImages> => {
  const result: StorageImages = {
    serviceImages: {}
  };

  try {
    // List all files in the user's folder
    const { data: files, error } = await supabase.storage
      .from('website-images')
      .list(userId, {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('Error listing storage files:', error);
      return result;
    }

    if (!files || files.length === 0) {
      return result;
    }

    // Process each file to determine its purpose and get the public URL
    for (const file of files) {
      if (!file.name || file.name === '.emptyFolderPlaceholder') continue;

      const filePath = `${userId}/${file.name}`;
      
      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) continue;

      // Check if this is a header image
      if (file.name.includes('/header/') || file.name.startsWith('header/')) {
        result.headerImageUrl = urlData.publicUrl;
      }
      // Check if this is an about image
      else if (file.name.includes('/about/') || file.name.startsWith('about/')) {
        result.aboutImageUrl = urlData.publicUrl;
      }
      // Check if this is a service image
      else if (file.name.includes('/service/') || file.name.startsWith('service/')) {
        // Extract service index from path like "service/0/filename.jpg"
        const serviceMatch = file.name.match(/service\/(\d+)\//);
        if (serviceMatch) {
          const serviceIndex = parseInt(serviceMatch[1]);
          result.serviceImages[serviceIndex] = urlData.publicUrl;
        }
      }
    }

    // Also check subfolders (header, about, service folders)
    const subfolders = ['header', 'about', 'service'];
    
    for (const subfolder of subfolders) {
      try {
        const { data: subFiles, error: subError } = await supabase.storage
          .from('website-images')
          .list(`${userId}/${subfolder}`, {
            limit: 100,
            offset: 0
          });

        if (subError || !subFiles) continue;

        for (const subFile of subFiles) {
          if (!subFile.name || subFile.name === '.emptyFolderPlaceholder') continue;

          const filePath = `${userId}/${subfolder}/${subFile.name}`;
          
          const { data: urlData } = supabase.storage
            .from('website-images')
            .getPublicUrl(filePath);

          if (!urlData?.publicUrl) continue;

          if (subfolder === 'header') {
            result.headerImageUrl = urlData.publicUrl;
          } else if (subfolder === 'about') {
            result.aboutImageUrl = urlData.publicUrl;
          } else if (subfolder === 'service') {
            // For service images, check if there are numbered subfolders
            const serviceMatch = subFile.name.match(/^(\d+)\//);
            if (serviceMatch) {
              const serviceIndex = parseInt(serviceMatch[1]);
              result.serviceImages[serviceIndex] = urlData.publicUrl;
            }
          }
        }

        // For service folder, also check numbered subfolders
        if (subfolder === 'service') {
          for (let i = 0; i < 10; i++) { // Check up to 10 services
            try {
              const { data: serviceFiles, error: serviceError } = await supabase.storage
                .from('website-images')
                .list(`${userId}/service/${i}`, {
                  limit: 10,
                  offset: 0
                });

              if (serviceError || !serviceFiles) continue;

              for (const serviceFile of serviceFiles) {
                if (!serviceFile.name || serviceFile.name === '.emptyFolderPlaceholder') continue;

                const filePath = `${userId}/service/${i}/${serviceFile.name}`;
                
                const { data: urlData } = supabase.storage
                  .from('website-images')
                  .getPublicUrl(filePath);

                if (urlData?.publicUrl) {
                  result.serviceImages[i] = urlData.publicUrl;
                  break; // Take the first image found for this service
                }
              }
            } catch (error) {
              // Continue to next service index
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`Error listing ${subfolder} files:`, error);
        continue;
      }
    }

    console.log('Loaded images from storage:', result);
    return result;

  } catch (error) {
    console.error('Error loading images from storage:', error);
    return result;
  }
};
