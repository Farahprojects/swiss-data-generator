
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rect, FabricObject } from 'fabric';

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
  const [overlay, setOverlay] = useState<Rect[]>([]);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropDimensions, setCropDimensions] = useState({ width: 0, height: 0 });

  const aspectRatios = [
    { value: 'free', label: 'Free Form', ratio: null },
    { value: '1:1', label: 'Square (1:1)', ratio: 1 },
    { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
    { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
    { value: '3:2', label: 'Photo (3:2)', ratio: 3/2 },
  ];

  const getImageObject = () => {
    if (!canvas) return null;
    const objects = canvas.getObjects();
    return objects.find((obj: FabricObject) => obj.type === 'image');
  };

  const createOverlay = (cropRect: Rect) => {
    if (!canvas) return;

    // Remove existing overlay
    overlay.forEach(rect => canvas.remove(rect));

    const imageObj = getImageObject();
    if (!imageObj) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    const cropLeft = cropRect.left || 0;
    const cropTop = cropRect.top || 0;
    const cropWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
    const cropHeight = (cropRect.height || 0) * (cropRect.scaleY || 1);

    // Create overlay rectangles to dim areas outside crop
    const overlayRects = [
      // Top overlay
      new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: cropTop,
        fill: 'rgba(0, 0, 0, 0.5)',
        selectable: false,
        evented: false,
        excludeFromExport: true
      }),
      // Bottom overlay
      new Rect({
        left: 0,
        top: cropTop + cropHeight,
        width: canvasWidth,
        height: canvasHeight - (cropTop + cropHeight),
        fill: 'rgba(0, 0, 0, 0.5)',
        selectable: false,
        evented: false,
        excludeFromExport: true
      }),
      // Left overlay
      new Rect({
        left: 0,
        top: cropTop,
        width: cropLeft,
        height: cropHeight,
        fill: 'rgba(0, 0, 0, 0.5)',
        selectable: false,
        evented: false,
        excludeFromExport: true
      }),
      // Right overlay
      new Rect({
        left: cropLeft + cropWidth,
        top: cropTop,
        width: canvasWidth - (cropLeft + cropWidth),
        height: cropHeight,
        fill: 'rgba(0, 0, 0, 0.5)',
        selectable: false,
        evented: false,
        excludeFromExport: true
      })
    ];

    overlayRects.forEach(rect => canvas.add(rect));
    setOverlay(overlayRects);
    canvas.renderAll();
  };

  const enforceLiveAspectRatio = (rect: Rect) => {
    const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
    if (!selectedRatio?.ratio) return;

    const currentWidth = (rect.width || 0) * (rect.scaleX || 1);
    const currentHeight = (rect.height || 0) * (rect.scaleY || 1);
    
    // Determine which dimension changed more recently and adjust the other
    const newHeight = currentWidth / selectedRatio.ratio;
    
    rect.set({
      height: newHeight / (rect.scaleY || 1)
    });
  };

  const enableCropMode = () => {
    if (!canvas) return;

    const imageObj = getImageObject();
    if (!imageObj) return;

    // Create crop rectangle
    const imgBounds = imageObj.getBoundingRect();
    const initialWidth = Math.min(200, imgBounds.width * 0.8);
    const initialHeight = Math.min(200, imgBounds.height * 0.8);

    const rect = new Rect({
      left: imgBounds.left + (imgBounds.width - initialWidth) / 2,
      top: imgBounds.top + (imgBounds.height - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
      fill: 'transparent',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerStyle: 'circle',
      cornerColor: '#007bff',
      cornerSize: 8,
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
    setIsCropMode(true);

    // Update dimensions display
    setCropDimensions({
      width: Math.round(rect.width || 0),
      height: Math.round(rect.height || 0)
    });

    // Create initial overlay
    createOverlay(rect);

    // Add event listeners for live updates
    rect.on('moving', () => {
      createOverlay(rect);
      updateDimensions(rect);
    });

    rect.on('scaling', () => {
      if (selectedRatio?.ratio) {
        enforceLiveAspectRatio(rect);
      }
      createOverlay(rect);
      updateDimensions(rect);
    });

    canvas.renderAll();
  };

  const updateDimensions = (rect: Rect) => {
    const width = (rect.width || 0) * (rect.scaleX || 1);
    const height = (rect.height || 0) * (rect.scaleY || 1);
    setCropDimensions({
      width: Math.round(width),
      height: Math.round(height)
    });
  };

  const applyCrop = () => {
    if (!canvas || !cropRect) return;

    const imageObj = getImageObject();
    if (!imageObj) return;

    // Get crop dimensions
    const cropLeft = cropRect.left || 0;
    const cropTop = cropRect.top || 0;
    const cropWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
    const cropHeight = (cropRect.height || 0) * (cropRect.scaleY || 1);

    // Create clipping path for the image
    const clipPath = new Rect({
      left: cropLeft - (imageObj.left || 0),
      top: cropTop - (imageObj.top || 0),
      width: cropWidth,
      height: cropHeight,
      absolutePositioned: true
    });

    imageObj.set({
      clipPath: clipPath
    });

    // Clean up crop UI
    canvas.remove(cropRect);
    overlay.forEach(rect => canvas.remove(rect));
    setOverlay([]);
    setCropRect(null);
    setIsCropMode(false);

    canvas.renderAll();
    onCropComplete();
  };

  const cancelCrop = () => {
    if (!canvas) return;

    if (cropRect) {
      canvas.remove(cropRect);
      setCropRect(null);
    }

    overlay.forEach(rect => canvas.remove(rect));
    setOverlay([]);
    setIsCropMode(false);
    canvas.renderAll();
  };

  // Update aspect ratio for existing crop rectangle
  useEffect(() => {
    if (cropRect && isCropMode) {
      const selectedRatio = aspectRatios.find(ar => ar.value === aspectRatio);
      if (selectedRatio?.ratio) {
        const currentWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
        const newHeight = currentWidth / selectedRatio.ratio;
        
        cropRect.set({
          height: newHeight / (cropRect.scaleY || 1)
        });
        
        createOverlay(cropRect);
        updateDimensions(cropRect);
        canvas?.renderAll();
      }
    }
  }, [aspectRatio, cropRect, isCropMode, canvas]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Live Crop Tool</h3>
      
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
        {!isCropMode ? (
          <Button onClick={enableCropMode} className="w-full">
            Start Cropping
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={applyCrop} className="w-full bg-green-600 hover:bg-green-700">
              Apply Crop
            </Button>
            <Button onClick={cancelCrop} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        {!isCropMode ? (
          <p>Click "Start Cropping" to begin live crop mode with real-time preview.</p>
        ) : (
          <div>
            <p><strong>Live Crop Mode Active:</strong></p>
            <p>• Drag to move the crop area</p>
            <p>• Drag corners to resize</p>
            <p>• Dark overlay shows what will be removed</p>
            <p>• Aspect ratio is {aspectRatio === 'free' ? 'unlocked' : 'locked'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
