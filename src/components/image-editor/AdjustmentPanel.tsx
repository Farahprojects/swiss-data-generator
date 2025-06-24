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

const overlayColors = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Navy Blue', value: '#1e3a8a' },
  { name: 'Deep Red', value: '#dc2626' },
];

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

  const handleColorChange = (color: string) => {
    onChange({
      ...adjustments,
      opacityColor: color
    });
  };

  const handleRotate = (degrees: number) => {
    onChange({
      ...adjustments,
      rotation: adjustments.rotation + degrees
    });
  };

  const resetAdjustments = () => {
    onChange({
      brightness: 0,
      contrast: 0,
      opacity: 0,
      opacityColor: '#000000',
      rotation: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Adjustments</h3>
        <Button variant="outline" size="sm" onClick={resetAdjustments}>
          Reset All
        </Button>
      </div>

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
          <Label className="text-sm font-medium">Opacity Overlay</Label>
          
          {/* Color Selection */}
          <div className="mt-2 mb-3">
            <Label className="text-xs text-gray-600 mb-2 block">Overlay Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {overlayColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    adjustments.opacityColor === color.value 
                      ? 'border-blue-500 scale-110' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {adjustments.opacityColor === color.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${color.value === '#ffffff' ? 'bg-gray-800' : 'bg-white'}`}></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="mt-2">
            <Slider
              value={[adjustments.opacity]}
              onValueChange={(value) => handleSliderChange('opacity', value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (No overlay)</span>
              <span>{adjustments.opacity}%</span>
              <span>100% (Full overlay)</span>
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
