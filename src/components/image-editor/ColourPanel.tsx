
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { ColourSettings } from './ImageEditorModal';

interface ColourPanelProps {
  colourSettings: ColourSettings;
  onChange: (settings: ColourSettings) => void;
  canvas: any;
}

const introColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
];

export const ColourPanel: React.FC<ColourPanelProps> = ({
  colourSettings,
  onChange,
  canvas
}) => {
  const handleColorChange = (color: string) => {
    onChange({
      ...colourSettings,
      color
    });
  };

  const handleOpacityChange = (value: number[]) => {
    onChange({
      ...colourSettings,
      opacity: value[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Colour Overlay</Label>
          
          {/* Color Selection */}
          <div className="mt-3">
            <Label className="text-xs text-gray-600 mb-2 block">Select Colour</Label>
            <div className="grid grid-cols-4 gap-2">
              {introColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`w-10 h-10 rounded border-2 transition-all ${
                    colourSettings.color === color.value 
                      ? 'border-blue-500 scale-110' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {colourSettings.color === color.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${color.value === '#000000' || color.value === '#374151' ? 'bg-white' : 'bg-white'}`}></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="mt-4">
            <Label className="text-xs text-gray-600 mb-2 block">Overlay Intensity</Label>
            <Slider
              value={[colourSettings.opacity]}
              onValueChange={handleOpacityChange}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (No overlay)</span>
              <span>{colourSettings.opacity}%</span>
              <span>100% (Full overlay)</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Add a colour overlay to your image or create a coloured background. 
            This works even without an uploaded image.
          </p>
        </div>
      </div>
    </div>
  );
};
