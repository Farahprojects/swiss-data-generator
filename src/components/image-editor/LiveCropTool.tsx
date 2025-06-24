
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rect, FabricImage } from 'fabric';

interface LiveCropToolProps {
  canvas: any;
  onCropComplete: () => void;
}

export const LiveCropTool: React.FC<LiveCropToolProps> = ({
  canvas,
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('free');
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropDimensions, setCropDimensions] = useState({ width: 0, height: 0 });

  const aspectRatios = [
    { value: 'free', label: 'Free Form', ratio: null },
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

  const startCrop = () => {
    if (!canvas) return;

    const imageObj = getImageObject();
    if (!imageObj) {
      console.error('No image found on canvas');
      return;
    }

    // Clear any existing crop rectangle
    if (cropRect) {
      canvas.remove(cropRect);
    }

    // Get image bounds
    const imgBounds = imageObj.getBoundingRect();
    
    // Create crop rectangle - start with a reasonable size
    const initialWidth = Math.min(200, imgBounds.width * 0.6);
    const initialHeight = Math.min(200, imgBounds.height * 0.6);

    const rect = new Rect({
      left: imgBounds.left + (imgBounds.width - initialWidth) / 2,
      top: imgBounds.top + (imgBounds.height - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
      fill: 'rgba(0, 0, 255, 0.1)',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerStyle: 'circle',
      cornerColor: '#007bff',
      cornerSize: 10,
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false
    });

    // Apply aspect ratio if selected
    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (selectedRatio?.ratio) {
      const height = initialWidth / selectedRatio.ratio;
      rect.set({ height });
    }

    canvas.add(rect);
    canvas.setActiveObject(rect);
    setCropRect(rect);
    setIsCropping(true);

    // Update dimensions
    updateDimensions(rect);

    // Add event listeners for real-time updates
    rect.on('scaling', () => {
      enforceAspectRatio(rect);
      updateDimensions(rect);
    });

    rect.on('moving', () => {
      updateDimensions(rect);
    });

    canvas.renderAll();
  };

  const enforceAspectRatio = (rect: Rect) => {
    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    const currentWidth = (rect.width || 0) * (rect.scaleX || 1);
    const newHeight = currentWidth / selectedRatio.ratio;
    
    rect.set({
      height: newHeight / (rect.scaleY || 1),
      scaleY: 1
    });
  };

  const updateDimensions = (rect: Rect) => {
    const width = (rect.width || 0) * (rect.scaleX || 1);
    const height = (rect.height || 0) * (rect.scaleY || 1);
    setCropDimensions({
      width: Math.round(width),
      height: Math.round(height)
    });
  };

  const applyCrop = async () => {
    if (!canvas || !cropRect) return;

    try {
      const imageObj = getImageObject();
      if (!imageObj) {
        console.error('No image object found');
        return;
      }

      // Get crop rectangle bounds
      const cropBounds = cropRect.getBoundingRect();
      const imageBounds = imageObj.getBoundingRect();

      // Calculate relative crop coordinates
      const relativeLeft = (cropBounds.left - imageBounds.left) / imageBounds.width;
      const relativeTop = (cropBounds.top - imageBounds.top) / imageBounds.height;
      const relativeWidth = cropBounds.width / imageBounds.width;
      const relativeHeight = cropBounds.height / imageBounds.height;

      // Create a new cropped image
      const originalElement = imageObj.getElement() as HTMLImageElement;
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx || !originalElement) {
        console.error('Failed to create crop canvas');
        return;
      }

      // Set canvas size to crop dimensions
      tempCanvas.width = cropBounds.width;
      tempCanvas.height = cropBounds.height;

      // Calculate source coordinates on the original image
      const sourceX = relativeLeft * originalElement.naturalWidth;
      const sourceY = relativeTop * originalElement.naturalHeight;
      const sourceWidth = relativeWidth * originalElement.naturalWidth;
      const sourceHeight = relativeHeight * originalElement.naturalHeight;

      // Draw the cropped portion
      ctx.drawImage(
        originalElement,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, cropBounds.width, cropBounds.height
      );

      // Create new image from cropped canvas
      const croppedDataURL = tempCanvas.toDataURL('image/png');
      
      // Load the cropped image
      const newImg = await FabricImage.fromURL(croppedDataURL);
      
      // Position the new image where the original was
      newImg.set({
        left: imageBounds.left,
        top: imageBounds.top,
        scaleX: imageBounds.width / cropBounds.width,
        scaleY: imageBounds.height / cropBounds.height
      });

      // Replace the original image
      canvas.remove(imageObj);
      canvas.add(newImg);
      
      // Clean up
      cancelCrop();
      canvas.renderAll();
      
      onCropComplete();
      
    } catch (error) {
      console.error('Crop failed:', error);
    }
  };

  const cancelCrop = () => {
    if (cropRect && canvas) {
      canvas.remove(cropRect);
      setCropRect(null);
    }
    setIsCropping(false);
    canvas?.renderAll();
  };

  // Auto-start crop when tool is selected
  useEffect(() => {
    if (canvas && !isCropping) {
      startCrop();
    }
    
    return () => {
      if (cropRect && canvas) {
        canvas.remove(cropRect);
      }
    };
  }, [canvas]);

  // Update aspect ratio for existing crop
  useEffect(() => {
    if (cropRect && isCropping) {
      enforceAspectRatio(cropRect);
      canvas?.renderAll();
    }
  }, [aspectRatio]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Crop Image</h3>
      
      <div>
        <Label className="text-sm font-medium">Aspect Ratio</Label>
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

      {cropDimensions.width > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Crop Size:</strong> {cropDimensions.width} × {cropDimensions.height}px
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={applyCrop} className="w-full bg-green-600 hover:bg-green-700">
          Apply Crop
        </Button>
        <Button onClick={cancelCrop} variant="outline" className="w-full">
          Cancel Crop
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>How to crop:</strong></p>
        <p>• Drag the corners to resize the crop area</p>
        <p>• Drag the center to move the crop area</p>
        <p>• Select an aspect ratio to constrain proportions</p>
        <p>• Click "Apply Crop" when satisfied</p>
      </div>
    </div>
  );
};
