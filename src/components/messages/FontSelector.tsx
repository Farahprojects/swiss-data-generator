
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Type } from 'lucide-react';

const fonts = [
  { name: 'Inter', value: 'font-inter', class: 'font-inter' },
  { name: 'Roboto', value: 'font-roboto', class: 'font-roboto' },
  { name: 'Open Sans', value: 'font-opensans', class: 'font-opensans' },
  { name: 'Lato', value: 'font-lato', class: 'font-lato' },
  { name: 'Montserrat', value: 'font-montserrat', class: 'font-montserrat' }
];

const fontSizes = [
  { name: 'Small', value: 'text-sm', class: 'text-sm' },
  { name: 'Normal', value: 'text-base', class: 'text-base' },
  { name: 'Large', value: 'text-lg', class: 'text-lg' },
  { name: 'Extra Large', value: 'text-xl', class: 'text-xl' }
];

interface FontSelectorProps {
  onFontSelect: (fontClass: string) => void;
  onFontSizeSelect: (sizeClass: string) => void;
  currentFont?: string;
  currentSize?: string;
}

export const FontSelector = ({ 
  onFontSelect, 
  onFontSizeSelect, 
  currentFont = 'font-inter',
  currentSize = 'text-base'
}: FontSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" type="button">
          <Type className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Font Family</div>
            <div className="space-y-1">
              {fonts.map((font) => (
                <Button
                  key={font.value}
                  variant={currentFont === font.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onFontSelect(font.value)}
                  className={`w-full justify-start ${font.class}`}
                >
                  {font.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Font Size</div>
            <div className="space-y-1">
              {fontSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={currentSize === size.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onFontSizeSelect(size.value)}
                  className={`w-full justify-start ${size.class}`}
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
