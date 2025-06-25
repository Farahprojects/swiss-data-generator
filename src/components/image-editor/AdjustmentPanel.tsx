
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCw, RotateCcw } from 'lucide-react';
import type { ImageAdjustments } from './ImageEditorModal';

interface AdjustmentPanelProps {
  adjustments: ImageAdjustments;
  onChange: (adjustments: ImageAdjustments) => void;
  canvas: any;
}

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  adjustments,
  onChange,
  canvas
}) => {
  const handleSliderChange = (key: keyof ImageAdjustments, value: number[]) => {
    onChange({
      ...adjustments,
      [key]: value[0]
    });
  };

  const handleRotate = (degrees: number) => {
    onChange({
      ...adjustments,
      rotation: adjustments.rotation + degrees
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Brightness</Label>
          <div className="mt-2">
            <Slider
              value={[adjustments.brightness]}
              onValueChange={(value) => handleSliderChange('brightness', value)}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-100</span>
              <span>{adjustments.brightness}</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Contrast</Label>
          <div className="mt-2">
            <Slider
              value={[adjustments.contrast]}
              onValueChange={(value) => handleSliderChange('contrast', value)}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-100</span>
              <span>{adjustments.contrast}</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Rotation</Label>
          <div className="mt-2 flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(-90)}
              className="flex items-center space-x-1"
            >
              <RotateCcw className="h-4 w-4" />
              <span>90° Left</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(90)}
              className="flex items-center space-x-1"
            >
              <RotateCw className="h-4 w-4" />
              <span>90° Right</span>
            </Button>
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            Current: {adjustments.rotation}°
          </div>
        </div>
      </div>
    </div>
  );
};
