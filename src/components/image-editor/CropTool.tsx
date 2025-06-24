
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rect } from 'fabric';

interface CropToolProps {
  canvas: any;
  onCropComplete: () => void;
}

export const CropTool: React.FC<CropToolProps> = ({
  canvas,
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('free');

  const aspectRatios = [
    { value: 'free', label: 'Free Form' },
    { value: '1:1', label: 'Square (1:1)' },
    { value: '4:3', label: 'Standard (4:3)' },
    { value: '16:9', label: 'Widescreen (16:9)' },
    { value: '3:2', label: 'Photo (3:2)' },
  ];

  const applyCrop = () => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Get the crop area bounds
    const left = activeObject.left;
    const top = activeObject.top;
    const width = activeObject.width * activeObject.scaleX;
    const height = activeObject.height * activeObject.scaleY;

    // Create a new canvas with cropped dimensions
    const croppedDataURL = canvas.toDataURL({
      left: left,
      top: top,
      width: width,
      height: height
    });

    // Update canvas with cropped image
    canvas.loadFromJSON({
      objects: [],
      backgroundImage: {
        type: 'image',
        src: croppedDataURL,
        left: 0,
        top: 0
      }
    }, () => {
      canvas.renderAll();
      onCropComplete();
    });
  };

  const enableCropMode = () => {
    if (!canvas) return;

    // Add a selection rectangle for cropping using v6 syntax
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      fill: 'transparent',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerStyle: 'circle',
      cornerColor: '#007bff',
      cornerSize: 8,
      transparentCorners: false
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

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

      <div className="space-y-2">
        <Button onClick={enableCropMode} className="w-full">
          Enable Crop Mode
        </Button>
        
        <Button onClick={applyCrop} variant="outline" className="w-full">
          Apply Crop
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        <p>1. Click "Enable Crop Mode" to add a crop selection</p>
        <p>2. Drag and resize the selection area</p>
        <p>3. Click "Apply Crop" to crop the image</p>
      </div>
    </div>
  );
};
