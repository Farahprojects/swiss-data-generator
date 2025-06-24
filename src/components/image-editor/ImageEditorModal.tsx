
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
import { CropTool } from './CropTool';
import { FilterPanel } from './FilterPanel';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ImageData } from '@/types/website-builder';

export type EditorTool = 'select' | 'crop' | 'adjust' | 'filter' | 'rotate';

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
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0
  });
  const [originalImageData, setOriginalImageData] = useState<string>('');

  useEffect(() => {
    if (isOpen && imageData.url) {
      setOriginalImageData(imageData.url);
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        rotation: 0
      });
    }
  }, [isOpen, imageData.url]);

  const handleSave = async () => {
    if (!fabricCanvas || !user) return;

    setIsProcessing(true);
    try {
      // Export canvas as blob
      const dataURL = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.8,
        multiplier: 1
      });

      // Convert dataURL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Create file with original filename but add _edited suffix
      const originalPath = imageData.filePath;
      const pathParts = originalPath.split('.');
      const extension = pathParts.pop();
      const nameWithoutExt = pathParts.join('.');
      const newFileName = `${nameWithoutExt}_edited.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('website-images')
        .upload(newFileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('website-images')
        .getPublicUrl(data.path);

      const newImageData: ImageData = {
        url: urlData.publicUrl,
        filePath: data.path
      };

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
    if (fabricCanvas && originalImageData) {
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        rotation: 0
      });
      // Reset canvas to original image
      fabricCanvas.clear();
      // Re-load original image
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[70vh]">
          <EditorToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onReset={handleReset}
          />
          
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-4">
              <ImageCanvas
                imageUrl={imageData.url}
                onCanvasReady={setFabricCanvas}
                activeTool={activeTool}
                adjustments={adjustments}
              />
            </div>
            
            <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
              {activeTool === 'crop' && (
                <CropTool
                  canvas={fabricCanvas}
                  onCropComplete={() => setActiveTool('select')}
                />
              )}
              
              {activeTool === 'adjust' && (
                <AdjustmentPanel
                  adjustments={adjustments}
                  onChange={setAdjustments}
                  canvas={fabricCanvas}
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
