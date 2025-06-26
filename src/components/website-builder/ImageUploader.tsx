
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getValidImageUrl, hasValidImage } from '@/utils/imageValidation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImageEditorModal } from '@/components/image-editor/ImageEditorModal';

interface ImageData {
  url: string;
  filePath: string;
}

interface ImageUploaderProps {
  value?: string | ImageData;
  onChange: (data: ImageData | null) => void;
  label: string;
  section: 'header' | 'about' | 'service';
  serviceIndex?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label,
  section,
  serviceIndex
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get valid image URL using validation utility
  const imageUrl = getValidImageUrl(value);
  const filePath = typeof value === 'object' && value?.filePath ? value.filePath : null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const newFilePath = `${user.id}/${section}${serviceIndex !== undefined ? `/${serviceIndex}` : ''}/${fileName}`;

      console.log('Uploading to path:', newFilePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('website-images')
        .upload(newFilePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(data.path);

      const imageData: ImageData = {
        url: urlData.publicUrl,
        filePath: data.path
      };

      onChange(imageData);

      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully."
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
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    setIsDeleting(true);
    
    try {
      let pathToDelete = filePath;
      
      // If we don't have the stored file path, try to extract it from URL
      if (!pathToDelete && imageUrl) {
        console.log('Extracting path from URL:', imageUrl);
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/');
        // For Supabase URLs: /storage/v1/object/public/website-images/{path}
        const bucketIndex = pathParts.indexOf('website-images');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          pathToDelete = pathParts.slice(bucketIndex + 1).join('/');
        }
      }

      console.log('Attempting to delete file at path:', pathToDelete);

      if (pathToDelete) {
        // Delete from storage
        const { error } = await supabase.storage
          .from('website-images')
          .remove([pathToDelete]);

        if (error) {
          console.error('Storage deletion error:', error);
          // Don't throw here - the file might already be deleted
        } else {
          console.log('Successfully deleted from storage:', pathToDelete);
        }
      }

      // Always clear the image from the UI and data
      onChange(null);

      toast({
        title: "Image removed",
        description: "Your image has been removed."
      });

    } catch (error: any) {
      console.error('Remove error:', error);
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: "Failed to remove image."
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    if (imageUrl && filePath) {
      setShowImageEditor(true);
    }
  };

  const handleSaveEdit = (newImageData: ImageData) => {
    onChange(newImageData);
    setShowImageEditor(false);
  };

  return (
    <>
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                console.error('Image failed to load:', imageUrl);
                // Remove broken image from data
                onChange(null);
                toast({
                  variant: "destructive",
                  title: "Broken image removed",
                  description: "The image link was invalid and has been removed."
                });
              }}
            />
            <div className="absolute top-2 right-2 flex space-x-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEdit}
                className="h-6 w-6 p-0"
                title="Edit image"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="h-6 w-6 p-0"
                title="Delete image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">Click to upload image</p>
            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
          </div>
        )}

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone and the image will be permanently removed from your website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemove}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showImageEditor && imageUrl && filePath && (
        <ImageEditorModal
          isOpen={showImageEditor}
          onClose={() => setShowImageEditor(false)}
          imageData={{ url: imageUrl, filePath }}
          onSave={handleSaveEdit}
          section={section}
          serviceIndex={serviceIndex}
        />
      )}
    </>
  );
};
