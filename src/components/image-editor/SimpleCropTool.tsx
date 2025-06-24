
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FabricImage, Rect } from 'fabric';

interface SimpleCropToolProps {
  canvas: any;
  onCropComplete: () => void;
}

export const SimpleCropTool: React.FC<SimpleCropToolProps> = ({
  canvas,
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('free');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropOverlay, setCropOverlay] = useState<Rect | null>(null);
  const [currentImage, setCurrentImage] = useState<FabricImage | null>(null);
  const originalImageRef = useRef<{
    element: HTMLImageElement;
    width: number;
    height: number;
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  const aspectRatios = [
    { value: 'free', label: 'Freeform', ratio: null },
    { value: '1:1', label: 'Square (1:1)', ratio: 1 },
    { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
    { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
    { value: '3:2', label: 'Photo (3:2)', ratio: 3/2 },
  ];

  // Find and setup the image when component mounts or canvas changes
  useEffect(() => {
    if (!canvas) return;

    const imageObj = canvas.getObjects().find((obj: any) => obj.type === 'image');
    if (imageObj && !originalImageRef.current) {
      console.log('Setting up crop tool with image:', imageObj);
      
      // Store original image data for reference
      originalImageRef.current = {
        element: imageObj.getElement(),
        width: imageObj.width || 1,
        height: imageObj.height || 1,
        left: imageObj.left || 0,
        top: imageObj.top || 0,
        scaleX: imageObj.scaleX || 1,
        scaleY: imageObj.scaleY || 1
      };
      
      setCurrentImage(imageObj);
      setupFreeformCrop(imageObj);
    }
  }, [canvas]);

  // Handle aspect ratio changes
  useEffect(() => {
    if (!canvas || !currentImage) return;

    if (aspectRatio === 'free') {
      setupFreeformCrop(currentImage);
    } else {
      setupAspectRatioCrop();
    }
  }, [aspectRatio, currentImage]);

  const setupFreeformCrop = (imageObj: FabricImage) => {
    console.log('Setting up freeform crop');
    
    // Clear any existing crop overlay
    if (cropOverlay) {
      canvas.remove(cropOverlay);
      setCropOverlay(null);
    }

    // Make image selectable for freeform cropping
    imageObj.set({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      borderColor: '#007bff',
      cornerColor: '#007bff',
      cornerSize: 8,
      transparentCorners: false
    });

    canvas.setActiveObject(imageObj);
    canvas.renderAll();
  };

  const setupAspectRatioCrop = () => {
    if (!currentImage || !originalImageRef.current) return;

    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    console.log('Setting up aspect ratio crop:', aspectRatio);

    // Remove any existing crop overlay
    if (cropOverlay) {
      canvas.remove(cropOverlay);
    }

    // Make image non-selectable
    currentImage.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });

    // Calculate crop overlay dimensions based on aspect ratio
    const imgBounds = currentImage.getBoundingRect();
    const targetRatio = selectedRatio.ratio;
    const currentRatio = imgBounds.width / imgBounds.height;

    let cropWidth, cropHeight;
    if (currentRatio > targetRatio) {
      // Image is wider than target ratio
      cropHeight = imgBounds.height * 0.8;
      cropWidth = cropHeight * targetRatio;
    } else {
      // Image is taller than target ratio
      cropWidth = imgBounds.width * 0.8;
      cropHeight = cropWidth / targetRatio;
    }

    // Create crop overlay rectangle
    const overlay = new Rect({
      left: imgBounds.left + (imgBounds.width - cropWidth) / 2,
      top: imgBounds.top + (imgBounds.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      fill: 'transparent',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      evented: true,
      hasControls: true,
      excludeFromExport: true // Don't include in final export
    });

    canvas.add(overlay);
    canvas.setActiveObject(overlay);
    setCropOverlay(overlay);
    canvas.renderAll();
  };

  const applyCrop = async (): Promise<boolean> => {
    if (!canvas || !currentImage || !originalImageRef.current) {
      console.error('Missing required objects for crop');
      return false;
    }

    setIsProcessing(true);
    
    try {
      let cropBounds;

      if (aspectRatio === 'free') {
        // Get crop bounds from selected image
        cropBounds = currentImage.getBoundingRect();
        console.log('Freeform crop bounds:', cropBounds);
      } else {
        // Get crop bounds from overlay rectangle
        if (!cropOverlay) {
          console.error('No crop overlay found');
          return false;
        }
        cropBounds = cropOverlay.getBoundingRect();
        console.log('Aspect ratio crop bounds:', cropBounds);
      }

      // Get the original image element
      const originalElement = originalImageRef.current.element;
      if (!originalElement) {
        console.error('No original image element');
        return false;
      }

      // Calculate crop coordinates relative to the original image
      const imgBounds = currentImage.getBoundingRect();
      const scaleX = originalElement.naturalWidth / imgBounds.width;
      const scaleY = originalElement.naturalHeight / imgBounds.height;

      const cropX = Math.max(0, (cropBounds.left - imgBounds.left) * scaleX);
      const cropY = Math.max(0, (cropBounds.top - imgBounds.top) * scaleY);
      const cropWidth = Math.min(cropBounds.width * scaleX, originalElement.naturalWidth - cropX);
      const cropHeight = Math.min(cropBounds.height * scaleY, originalElement.naturalHeight - cropY);

      console.log('Crop parameters:', { cropX, cropY, cropWidth, cropHeight });

      // Create cropped image
      const croppedDataURL = await createCroppedImage(originalElement, {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      });

      // Remove old image and overlay
      canvas.remove(currentImage);
      if (cropOverlay) {
        canvas.remove(cropOverlay);
        setCropOverlay(null);
      }

      // Add new cropped image
      const newImage = await FabricImage.fromURL(croppedDataURL);
      
      // Scale and center the new image
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const scale = Math.min(canvasWidth / newImage.width!, canvasHeight / newImage.height!) * 0.9;
      
      newImage.scale(scale);
      canvas.centerObject(newImage);
      
      // Make it non-selectable
      newImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });

      canvas.add(newImage);
      setCurrentImage(newImage);
      
      // Update original reference for potential future crops
      originalImageRef.current = {
        element: newImage.getElement() as HTMLImageElement,
        width: newImage.width || 1,
        height: newImage.height || 1,
        left: newImage.left || 0,
        top: newImage.top || 0,
        scaleX: newImage.scaleX || 1,
        scaleY: newImage.scaleY || 1
      };

      canvas.renderAll();
      console.log('Crop applied successfully');
      return true;

    } catch (error) {
      console.error('Crop failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const createCroppedImage = (originalElement: HTMLImageElement, cropArea: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to create crop canvas'));
          return;
        }

        tempCanvas.width = cropArea.width;
        tempCanvas.height = cropArea.height;

        ctx.drawImage(
          originalElement,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );

        const croppedDataURL = tempCanvas.toDataURL('image/png', 0.9);
        resolve(croppedDataURL);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleApply = async () => {
    console.log('Applying crop...');
    const success = await applyCrop();
    if (success) {
      onCropComplete();
    }
  };

  const handleCancel = () => {
    console.log('Cancelling crop');
    
    // Clean up crop overlay
    if (cropOverlay) {
      canvas.remove(cropOverlay);
      setCropOverlay(null);
    }

    // Reset image to non-selectable state
    if (currentImage) {
      currentImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      canvas.discardActiveObject();
    }

    canvas.renderAll();
    onCropComplete();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Crop Image</h3>
      
      <div>
        <Label className="text-sm font-medium">Crop Mode</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aspectRatios.map((ratio) => (
              <SelectItem key={ratio.value} value={ratio.value}>
                {ratio.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {aspectRatio === 'free' && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <p><strong>Freeform Crop:</strong></p>
          <p>Drag the corners and edges of the image to select the area you want to keep, then click Apply Crop.</p>
        </div>
      )}

      {aspectRatio !== 'free' && (
        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded">
          <p><strong>Aspect Ratio Crop:</strong></p>
          <p>Adjust the blue dashed rectangle to select the area to keep, then click Apply Crop.</p>
        </div>
      )}

      <div className="space-y-2">
        <Button 
          onClick={handleApply} 
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Apply Crop'}
        </Button>
        <Button 
          onClick={handleCancel} 
          variant="outline" 
          className="w-full"
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
