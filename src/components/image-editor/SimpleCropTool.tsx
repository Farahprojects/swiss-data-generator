
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FabricImage } from 'fabric';

interface SimpleCropToolProps {
  canvas: any;
  onCropComplete: () => void;
}

export const SimpleCropTool: React.FC<SimpleCropToolProps> = ({
  canvas,
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('free');
  const [originalImage, setOriginalImage] = useState<FabricImage | null>(null);
  const [originalImageData, setOriginalImageData] = useState<{
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    filters: any[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const aspectRatios = [
    { value: 'free', label: 'Freeform', ratio: null },
    { value: '1:1', label: 'Square (1:1)', ratio: 1 },
    { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
    { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
    { value: '3:2', label: 'Photo (3:2)', ratio: 3/2 },
  ];

  const getImageObject = (): FabricImage | null => {
    if (!canvas) return null;
    const objects = canvas.getObjects();
    return objects.find((obj: any) => obj.type === 'image') || null;
  };

  useEffect(() => {
    if (canvas) {
      const imageObj = getImageObject();
      if (imageObj && !originalImage) {
        setOriginalImage(imageObj);
        // Store original state for reset
        setOriginalImageData({
          left: imageObj.left || 0,
          top: imageObj.top || 0,
          scaleX: imageObj.scaleX || 1,
          scaleY: imageObj.scaleY || 1,
          angle: imageObj.angle || 0,
          filters: [...(imageObj.filters || [])]
        });
      }
    }
  }, [canvas]);

  useEffect(() => {
    if (aspectRatio === 'free') {
      enableFreeformCrop();
    } else {
      applyAspectRatioCrop();
    }
  }, [aspectRatio]);

  const resetImageToOriginal = () => {
    if (!canvas || !originalImage || !originalImageData) return;

    // Reset image properties to original state
    originalImage.set({
      left: originalImageData.left,
      top: originalImageData.top,
      scaleX: originalImageData.scaleX,
      scaleY: originalImageData.scaleY,
      angle: originalImageData.angle,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });

    // Reset filters
    originalImage.filters = [...originalImageData.filters];
    originalImage.applyFilters();

    // Clear any selection and disable drawing mode
    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.isDrawingMode = false;
    
    canvas.renderAll();
  };

  const enableFreeformCrop = () => {
    if (!canvas || !originalImage) return;

    // Enable selection mode for freeform cropping
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    // Make the image selectable and show selection controls
    originalImage.set({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      borderColor: '#007bff',
      cornerColor: '#007bff',
      cornerSize: 8,
      transparentCorners: false
    });

    canvas.setActiveObject(originalImage);
    canvas.renderAll();
  };

  const applyAspectRatioCrop = async () => {
    if (!canvas || !originalImage || aspectRatio === 'free') return;

    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    setIsProcessing(true);

    try {
      const imgBounds = originalImage.getBoundingRect();
      const currentRatio = imgBounds.width / imgBounds.height;
      const targetRatio = selectedRatio.ratio;

      let cropWidth, cropHeight;
      let cropLeft, cropTop;

      if (currentRatio > targetRatio) {
        // Image is wider than target ratio - crop width
        cropHeight = imgBounds.height;
        cropWidth = cropHeight * targetRatio;
        cropLeft = imgBounds.left + (imgBounds.width - cropWidth) / 2;
        cropTop = imgBounds.top;
      } else {
        // Image is taller than target ratio - crop height
        cropWidth = imgBounds.width;
        cropHeight = cropWidth / targetRatio;
        cropLeft = imgBounds.left;
        cropTop = imgBounds.top + (imgBounds.height - cropHeight) / 2;
      }

      // Create cropped image
      const croppedImage = await cropImageData(originalImage, {
        left: cropLeft - imgBounds.left,
        top: cropTop - imgBounds.top,
        width: cropWidth,
        height: cropHeight
      });

      // Replace original image with cropped version
      canvas.remove(originalImage);
      canvas.add(croppedImage);
      canvas.centerObject(croppedImage);
      
      // Disable selection for auto-cropped images
      croppedImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      
      canvas.renderAll();
      setOriginalImage(croppedImage);

    } catch (error) {
      console.error('Auto-crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const cropImageData = async (imageObj: FabricImage, cropArea: any): Promise<FabricImage> => {
    const originalElement = imageObj.getElement() as HTMLImageElement;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx || !originalElement) {
      throw new Error('Failed to create crop canvas');
    }

    // Set canvas size to crop dimensions
    tempCanvas.width = cropArea.width;
    tempCanvas.height = cropArea.height;

    // Calculate source coordinates on the original image
    const scaleX = originalElement.naturalWidth / (imageObj.width || 1);
    const scaleY = originalElement.naturalHeight / (imageObj.height || 1);
    
    const sourceX = cropArea.left * scaleX;
    const sourceY = cropArea.top * scaleY;
    const sourceWidth = cropArea.width * scaleX;
    const sourceHeight = cropArea.height * scaleY;

    // Draw the cropped portion
    ctx.drawImage(
      originalElement,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, cropArea.width, cropArea.height
    );

    // Create new image from cropped canvas
    const croppedDataURL = tempCanvas.toDataURL('image/png');
    const newImg = await FabricImage.fromURL(croppedDataURL);
    
    return newImg;
  };

  const applyFreeformCrop = async () => {
    if (!canvas || !originalImage) return;

    setIsProcessing(true);

    try {
      const activeObj = canvas.getActiveObject();
      if (!activeObj || activeObj.type !== 'image') {
        throw new Error('No image selected for cropping');
      }

      // Get the current transform of the image
      const imgBounds = activeObj.getBoundingRect();
      const originalBounds = originalImage.getBoundingRect();

      // Calculate crop area relative to original image
      const cropArea = {
        left: Math.max(0, imgBounds.left - originalBounds.left),
        top: Math.max(0, imgBounds.top - originalBounds.top),
        width: Math.min(imgBounds.width, originalBounds.width),
        height: Math.min(imgBounds.height, originalBounds.height)
      };

      // Create cropped image
      const croppedImage = await cropImageData(originalImage, cropArea);

      // Replace with cropped version
      canvas.remove(originalImage);
      canvas.add(croppedImage);
      canvas.centerObject(croppedImage);
      
      // Disable selection after cropping
      croppedImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      
      canvas.renderAll();
      onCropComplete();

    } catch (error) {
      console.error('Freeform crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (aspectRatio === 'free') {
      applyFreeformCrop();
    } else {
      onCropComplete();
    }
  };

  const handleCancel = () => {
    // Reset image to original state
    resetImageToOriginal();
    
    // Reset aspect ratio to free
    setAspectRatio('free');
    
    // Complete the crop operation
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
          <p>Click and drag the image corners to select the area you want to keep.</p>
        </div>
      )}

      {aspectRatio !== 'free' && (
        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded">
          <p><strong>Auto Crop:</strong></p>
          <p>Image automatically cropped to {aspectRatios.find(r => r.value === aspectRatio)?.label} ratio.</p>
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
