
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageCanvas } from './ImageCanvas';
import { EditorToolbar } from './EditorToolbar';
import { AdjustmentPanel } from './AdjustmentPanel';
import { LiveCropTool } from './LiveCropTool';
import { FilterPanel } from './FilterPanel';
import { SimpleCropTool } from './SimpleCropTool';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ImageData } from '@/types/website-builder';

export type EditorTool = 'select' | 'crop' | 'adjust' | 'filter';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
}

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: ImageData;
  onSave: (newImageData: ImageData) => void;
  section: 'header' | 'about' | 'service';
  serviceIndex?: number;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageData,
  onSave,
  section,
  serviceIndex
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [hasCroppedImage, setHasCroppedImage] = useState(false);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0
  });

  useEffect(() => {
    if (isOpen && imageData.url) {
      setHasCroppedImage(false);
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        rotation: 0
      });
    }
  }, [isOpen, imageData.url]);

  const handleCropComplete = () => {
    console.log('Crop completed, image now cropped on canvas');
    setHasCroppedImage(true);
    setActiveTool('select');
  };

  const validateDataURL = (dataURL: string): boolean => {
    try {
      // Check if it's a valid data URL format
      if (!dataURL.startsWith('data:')) {
        console.error('Invalid data URL format');
        return false;
      }

      // Check if it has reasonable length (not empty)
      if (dataURL.length < 100) {
        console.error('Data URL too short, likely invalid');
        return false;
      }

      // Try to decode base64 part to verify it's valid
      const base64Data = dataURL.split(',')[1];
      if (!base64Data) {
        console.error('No base64 data found in data URL');
        return false;
      }

      // Verify base64 is decodable
      atob(base64Data.substring(0, 100)); // Test decode first 100 chars
      return true;
    } catch (error) {
      console.error('Data URL validation failed:', error);
      return false;
    }
  };

  const convertDataURLToBlob = async (dataURL: string): Promise<Blob> => {
    try {
      const response = await fetch(dataURL);
      if (!response.ok) {
        throw new Error(`Failed to fetch data URL: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Failed to convert data URL to blob:', error);
      
      // Fallback: manual conversion
      try {
        const [header, data] = dataURL.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new Blob([bytes], { type: mime });
      } catch (fallbackError) {
        console.error('Fallback blob conversion failed:', fallbackError);
        throw new Error('Failed to convert image data to blob');
      }
    }
  };

  const handleSave = async () => {
    if (!fabricCanvas || !user) {
      console.error('Missing required objects for save');
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Canvas or user not available"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('Starting save process...');
      console.log('Canvas dimensions:', {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
        objects: fabricCanvas.getObjects().length
      });

      // Use Fabric's built-in toDataURL with optimized settings
      const dataURL = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 1,
        filter: (obj: any) => !obj.excludeFromExport
      });

      console.log('Canvas exported to dataURL, validating...');

      // Validate the data URL
      if (!validateDataURL(dataURL)) {
        throw new Error('Generated image data is invalid');
      }

      console.log('Data URL validation passed, converting to blob...');

      // Convert to blob with error handling
      const blob = await convertDataURLToBlob(dataURL);
      
      if (!blob || blob.size === 0) {
        throw new Error('Failed to create valid image blob');
      }

      console.log('Blob created successfully:', {
        size: blob.size,
        type: blob.type
      });

      // Generate unique filename
      const originalPath = imageData.filePath;
      const pathParts = originalPath.split('.');
      const extension = pathParts.pop() || 'jpg';
      const nameWithoutExt = pathParts.join('.');
      const timestamp = Date.now();
      const newFileName = `${nameWithoutExt}_edited_${timestamp}.${extension}`;

      console.log('Uploading to Supabase:', newFileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('website-images')
        .upload(newFileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(data.path);

      const newImageData: ImageData = {
        url: urlData.publicUrl,
        filePath: data.path
      };

      console.log('Image saved successfully:', newImageData);

      // Call the onSave callback
      onSave(newImageData);
      onClose();

      toast({
        title: "Image saved",
        description: "Your edited image has been saved successfully."
      });

    } catch (error: any) {
      console.error('Save error details:', {
        message: error.message,
        stack: error.stack,
        fabricCanvas: !!fabricCanvas,
        user: !!user
      });
      
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save edited image. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (fabricCanvas) {
      setHasCroppedImage(false);
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        rotation: 0
      });
      // Force canvas to reload original image by clearing it
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.renderAll();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 overflow-hidden">
            <EditorToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onReset={handleReset}
            />
            
            <div className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <div className={`${isMobile ? 'flex-1 min-h-0' : 'flex-1'} p-4`}>
                <ImageCanvas
                  imageUrl={imageData.url}
                  onCanvasReady={setFabricCanvas}
                  activeTool={activeTool}
                  adjustments={hasCroppedImage ? { brightness: 0, contrast: 0, saturation: 0, rotation: 0 } : adjustments}
                  cropApplied={hasCroppedImage}
                />
              </div>
              
              <div className={`${isMobile ? 'border-t' : 'w-80 border-l'} bg-gray-50 p-4 overflow-y-auto`}>
                {activeTool === 'adjust' && !hasCroppedImage && (
                  <AdjustmentPanel
                    adjustments={adjustments}
                    onChange={setAdjustments}
                    canvas={fabricCanvas}
                  />
                )}
                
                {activeTool === 'adjust' && hasCroppedImage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      Adjustments are not available after cropping. Please apply adjustments before cropping.
                    </p>
                  </div>
                )}
                
                {activeTool === 'crop' && (
                  <SimpleCropTool
                    canvas={fabricCanvas}
                    onCropComplete={handleCropComplete}
                  />
                )}
                
                {activeTool === 'filter' && !hasCroppedImage && (
                  <FilterPanel
                    canvas={fabricCanvas}
                  />
                )}
                
                {activeTool === 'filter' && hasCroppedImage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      Filters are not available after cropping. Please apply filters before cropping.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
