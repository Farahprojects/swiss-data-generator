
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
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropApplied, setCropApplied] = useState(false);

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
          width: imageObj.width || 1,
          height: imageObj.height || 1
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

    // Clear any selection and disable drawing mode
    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.isDrawingMode = false;
    
    canvas.renderAll();
    setCropApplied(false);
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

  const scaleImageToFitCanvas = (image: FabricImage) => {
    if (!canvas || !image) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const imgWidth = image.width || 1;
    const imgHeight = image.height || 1;
    
    // Calculate scale to fit canvas while maintaining aspect ratio
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.9; // 0.9 for some padding
    
    image.scale(scale);
    canvas.centerObject(image);
  };

  const applyAspectRatioCrop = async () => {
    if (!canvas || !originalImage || aspectRatio === 'free' || !originalImageData) return;

    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    setIsProcessing(true);

    try {
      // Get the original image element
      const originalElement = originalImage.getElement() as HTMLImageElement;
      if (!originalElement) {
        throw new Error('Cannot access image element');
      }

      const naturalWidth = originalElement.naturalWidth;
      const naturalHeight = originalElement.naturalHeight;
      const currentRatio = naturalWidth / naturalHeight;
      const targetRatio = selectedRatio.ratio;

      let cropWidth, cropHeight;
      let cropX = 0, cropY = 0;

      if (currentRatio > targetRatio) {
        // Image is wider than target ratio - crop width
        cropHeight = naturalHeight;
        cropWidth = cropHeight * targetRatio;
        cropX = (naturalWidth - cropWidth) / 2;
      } else {
        // Image is taller than target ratio - crop height
        cropWidth = naturalWidth;
        cropHeight = cropWidth / targetRatio;
        cropY = (naturalHeight - cropHeight) / 2;
      }

      // Create cropped image
      const croppedImage = await createCroppedImage(originalElement, {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      });

      // Replace original image with cropped version
      canvas.remove(originalImage);
      canvas.add(croppedImage);
      
      // Scale to fit canvas and center
      scaleImageToFitCanvas(croppedImage);
      
      // Disable selection for auto-cropped images
      croppedImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      
      canvas.renderAll();
      setOriginalImage(croppedImage);
      setCropApplied(true);

    } catch (error) {
      console.error('Auto-crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createCroppedImage = async (originalElement: HTMLImageElement, cropArea: any): Promise<FabricImage> => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create crop canvas');
    }

    // Set canvas size to crop dimensions
    tempCanvas.width = cropArea.width;
    tempCanvas.height = cropArea.height;

    // Draw the cropped portion
    ctx.drawImage(
      originalElement,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );

    // Create new image from cropped canvas
    const croppedDataURL = tempCanvas.toDataURL('image/png');
    const newImg = await FabricImage.fromURL(croppedDataURL);
    
    return newImg;
  };

  const applyFreeformCrop = async () => {
    if (!canvas || !originalImage || !originalImageData) return;

    setIsProcessing(true);

    try {
      const activeObj = canvas.getActiveObject();
      if (!activeObj || activeObj.type !== 'image') {
        throw new Error('No image selected for cropping');
      }

      // Get the original image element
      const originalElement = originalImage.getElement() as HTMLImageElement;
      if (!originalElement) {
        throw new Error('Cannot access image element');
      }

      // Get current image bounds after user manipulation
      const currentBounds = activeObj.getBoundingRect();
      const currentScaleX = activeObj.scaleX || 1;
      const currentScaleY = activeObj.scaleY || 1;
      
      // Calculate what portion of the original image is visible
      const originalScaleX = originalImageData.scaleX;
      const originalScaleY = originalImageData.scaleY;
      
      // Scale factors between current display and original image
      const scaleFactorX = originalElement.naturalWidth / (originalImageData.width * originalScaleX);
      const scaleFactorY = originalElement.naturalHeight / (originalImageData.height * originalScaleY);
      
      // Calculate crop area in original image coordinates
      const cropArea = {
        x: Math.max(0, Math.abs(currentBounds.left - originalImageData.left) * scaleFactorX / currentScaleX),
        y: Math.max(0, Math.abs(currentBounds.top - originalImageData.top) * scaleFactorY / currentScaleY),
        width: Math.min(currentBounds.width * scaleFactorX / currentScaleX, originalElement.naturalWidth),
        height: Math.min(currentBounds.height * scaleFactorY / currentScaleY, originalElement.naturalHeight)
      };

      // Create cropped image
      const croppedImage = await createCroppedImage(originalElement, cropArea);

      // Replace with cropped version
      canvas.remove(originalImage);
      canvas.add(croppedImage);
      
      // Scale to fit canvas and center
      scaleImageToFitCanvas(croppedImage);
      
      // Disable selection after cropping
      croppedImage.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      
      canvas.renderAll();
      setCropApplied(true);

    } catch (error) {
      console.error('Freeform crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (aspectRatio === 'free') {
      applyFreeformCrop();
    } else if (cropApplied) {
      // For aspect ratio crops, the crop is already applied, just complete
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
          <p>Drag the corners and edges of the image to select the area you want to keep, then click Apply Crop.</p>
        </div>
      )}

      {aspectRatio !== 'free' && (
        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded">
          <p><strong>Auto Crop:</strong></p>
          <p>Image automatically cropped to {aspectRatios.find(r => r.value === aspectRatio)?.label} ratio. Click Apply Crop to save.</p>
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
