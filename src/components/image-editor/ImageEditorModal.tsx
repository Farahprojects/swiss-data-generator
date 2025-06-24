
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

  const handleSave = async () => {
    if (!fabricCanvas || !user) {
      console.error('Missing fabricCanvas or user:', { fabricCanvas: !!fabricCanvas, user: !!user });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Canvas not ready or user not authenticated."
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting save process...');
      
      // Export canvas as blob - exclude overlay elements
      const dataURL = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.8,
        multiplier: 1,
        filter: (obj: any) => !obj.excludeFromExport
      });

      console.log('Canvas exported to dataURL, length:', dataURL.length);

      if (!dataURL || dataURL.length < 100) {
        throw new Error('Failed to export canvas - invalid data');
      }

      // Convert dataURL to blob
      const response = await fetch(dataURL);
      if (!response.ok) {
        throw new Error('Failed to convert dataURL to blob');
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Create file with original filename but add _edited suffix
      const originalPath = imageData.filePath;
      const pathParts = originalPath.split('.');
      const extension = pathParts.pop() || 'jpg';
      const nameWithoutExt = pathParts.join('.');
      const timestamp = Date.now();
      const newFileName = `${nameWithoutExt}_edited_${timestamp}.${extension}`;

      console.log('Uploading file:', newFileName, 'to website-images bucket');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('website-images')
        .upload(newFileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(data.path);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      const newImageData: ImageData = {
        url: urlData.publicUrl,
        filePath: data.path
      };

      console.log('Image saved successfully:', newImageData);

      onSave(newImageData);
      onClose();

      toast({
        title: "Image saved",
        description: "Your edited image has been saved successfully."
      });

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save edited image."
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
                {activeTool === 'adjust' && (
                  <AdjustmentPanel
                    adjustments={adjustments}
                    onChange={setAdjustments}
                    canvas={fabricCanvas}
                  />
                )}
                
                {activeTool === 'crop' && (
                  <SimpleCropTool
                    canvas={fabricCanvas}
                    onCropComplete={handleCropComplete}
                  />
                )}
                
                {activeTool === 'filter' && (
                  <FilterPanel
                    canvas={fabricCanvas}
                  />
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isProcessing || !fabricCanvas}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
