
import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { TextFormatting } from '@/hooks/useTextEditor';

interface TextFormattingToolbarProps {
  formatting: TextFormatting;
  onFormattingChange: (formatting: TextFormatting) => void;
  fontFamilies: Array<{ value: string; label: string; category: string }>;
  fontSizes: Array<{ value: string; label: string }>;
  fontWeights: Array<{ value: string; label: string }>;
  isVisible: boolean;
  position?: { x: number; y: number };
}

export const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  formatting,
  onFormattingChange,
  fontFamilies,
  fontSizes,
  fontWeights,
  isVisible,
  position
}) => {
  if (!isVisible) return null;

  const handleFontFamilyChange = (fontFamily: string) => {
    onFormattingChange({ ...formatting, fontFamily });
  };

  const handleFontSizeChange = (fontSize: string) => {
    onFormattingChange({ ...formatting, fontSize });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormattingChange({ ...formatting, color: e.target.value });
  };

  const handleFontWeightChange = (fontWeight: string) => {
    onFormattingChange({ ...formatting, fontWeight });
  };

  const handleAlignmentChange = (textAlign: 'left' | 'center' | 'right') => {
    onFormattingChange({ ...formatting, textAlign });
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2"
      style={{
        top: position?.y ? position.y - 60 : 'auto',
        left: position?.x || 'auto',
        transform: position?.x ? 'translateX(-50%)' : 'none'
      }}
    >
      {/* Font Family */}
      <Select value={formatting.fontFamily || 'Inter'} onValueChange={handleFontFamilyChange}>
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontFamilies.map((font) => (
            <SelectItem 
              key={font.value} 
              value={font.value}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select value={formatting.fontSize || '16px'} onValueChange={handleFontSizeChange}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Weight */}
      <Select value={formatting.fontWeight || '400'} onValueChange={handleFontWeightChange}>
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontWeights.map((weight) => (
            <SelectItem key={weight.value} value={weight.value}>
              {weight.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Text Color</label>
              <input
                type="color"
                value={formatting.color || '#000000'}
                onChange={handleColorChange}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {[
                '#000000', '#374151', '#6B7280', '#9CA3AF',
                '#EF4444', '#F97316', '#EAB308', '#22C55E',
                '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => onFormattingChange({ ...formatting, color })}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Text Alignment */}
      <div className="flex border border-gray-200 rounded">
        <Button
          variant={formatting.textAlign === 'left' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-none rounded-l"
          onClick={() => handleAlignmentChange('left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={formatting.textAlign === 'center' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-none"
          onClick={() => handleAlignmentChange('center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={formatting.textAlign === 'right' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-r"
          onClick={() => handleAlignmentChange('right')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
