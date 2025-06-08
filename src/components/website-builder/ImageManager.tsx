
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ImageManagerProps {
  value?: string;
  onChange: (url: string | null) => void;
  label: string;
  section: 'header' | 'about' | 'service';
  serviceIndex?: number;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  value,
  onChange,
  label,
  section,
  serviceIndex
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const getFilePath = (fileName: string) => {
    const basePath = `${user!.id}/${section}`;
    return serviceIndex !== undefined 
      ? `${basePath}/${serviceIndex}/${fileName}`
      : `${basePath}/${fileName}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file."
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image under 5MB."
      });
      return;
    }

    setIsUploading(true);

    try {
      // If there's an existing image, delete it first
      if (value) {
        await handleRemoveImage(false); // Don't show toast for replacement
      }

      // Create file path with timestamp to ensure uniqueness
      const fileExt = file.name.split('.').pop();
      const fileName = `image_${Date.now()}.${fileExt}`;
      const filePath = getFilePath(fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('website-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(data.path);

      // Update the customization data immediately
      onChange(urlData.publicUrl);

      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded and saved automatically."
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image."
      });
    } finally {
      setIsUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleRemoveImage = async (showToast = true) => {
    if (!value || !user) return;

    try {
      // Extract file path from URL
      const url = new URL(value);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/website-images\/(.+)$/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        
        // Delete from storage
        const { error } = await supabase.storage
          .from('website-images')
          .remove([filePath]);

        if (error) {
          console.error('Storage deletion error:', error);
          // Continue anyway - the file might not exist
        }
      }

      // Update the customization data
      onChange(null);

      if (showToast) {
        toast({
          title: "Image removed",
          description: "Your image has been removed."
        });
      }

    } catch (error: any) {
      console.error('Remove error:', error);
      if (showToast) {
        toast({
          variant: "destructive",
          title: "Remove failed",
          description: "Failed to remove image, but cleared from editor."
        });
      }
      // Still clear from the UI even if storage deletion failed
      onChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      
      {value ? (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={value}
              alt={label}
              className="w-full h-32 object-cover rounded-lg border"
            />
            <div className="absolute top-2 right-2 flex space-x-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveImage()}
                className="h-6 w-6 p-0"
                title="Remove image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById(`file-input-${section}-${serviceIndex || 'main'}`)?.click()}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Replace Image</span>
            </Button>
            <span className="text-xs text-gray-500">Auto-saved</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => document.getElementById(`file-input-${section}-${serviceIndex || 'main'}`)?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">Click to upload image</p>
          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
        </div>
      )}

      <input
        id={`file-input-${section}-${serviceIndex || 'main'}`}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={isUploading}
        className="hidden"
      />

      {isUploading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  );
};
