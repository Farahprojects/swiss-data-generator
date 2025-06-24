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

    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.isDrawingMode = false;
    
    canvas.renderAll();
    setCropApplied(false);
  };

  const enableFreeformCrop = () => {
    if (!canvas || !originalImage) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    
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
    
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.9;
    
    image.scale(scale);
    canvas.centerObject(image);
  };

  const applyAspectRatioCrop = async () => {
    if (!canvas || !originalImage || aspectRatio === 'free' || !originalImageData) return;

    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    setIsProcessing(true);

    try {
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
        cropHeight = naturalHeight;
        cropWidth = cropHeight * targetRatio;
        cropX = (naturalWidth - cropWidth) / 2;
      } else {
        cropWidth = naturalWidth;
        cropHeight = cropWidth / targetRatio;
        cropY = (naturalHeight - cropHeight) / 2;
      }

      const croppedImage = await createCroppedImage(originalElement, {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      });

      canvas.remove(originalImage);
      canvas.add(croppedImage);
      
      scaleImageToFitCanvas(croppedImage);
      
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

    tempCanvas.width = cropArea.width;
    tempCanvas.height = cropArea.height;

    ctx.drawImage(
      originalElement,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );

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

      const originalElement = originalImage.getElement() as HTMLImageElement;
      if (!originalElement) {
        throw new Error('Cannot access image element');
      }

      const bounds = activeObj.getBoundingRect();
      const scaleX = activeObj.scaleX || 1;
      const scaleY = activeObj.scaleY || 1;
      
      const naturalWidth = originalElement.naturalWidth;
      const naturalHeight = originalElement.naturalHeight;
      const displayedWidth = (originalImage.width || 1) * scaleX;
      const displayedHeight = (originalImage.height || 1) * scaleY;
      
      const scaleFactorX = naturalWidth / displayedWidth;
      const scaleFactorY = naturalHeight / displayedHeight;
      
      const cropArea = {
        x: Math.max(0, (bounds.left - (activeObj.left || 0) + bounds.width/2 - displayedWidth/2) * scaleFactorX),
        y: Math.max(0, (bounds.top - (activeObj.top || 0) + bounds.height/2 - displayedHeight/2) * scaleFactorY),
        width: Math.min(bounds.width * scaleFactorX, naturalWidth),
        height: Math.min(bounds.height * scaleFactorY, naturalHeight)
      };

      const croppedImage = await createCroppedImage(originalElement, cropArea);

      canvas.remove(originalImage);
      canvas.add(croppedImage);
      
      scaleImageToFitCanvas(croppedImage);
      
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
      console.error('Freeform crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (aspectRatio === 'free') {
      await applyFreeformCrop();
      onCropComplete(); // Notify parent after crop is applied
    } else if (cropApplied) {
      onCropComplete();
    }
  };

  const handleCancel = () => {
    resetImageToOriginal();
    setAspectRatio('free');
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
