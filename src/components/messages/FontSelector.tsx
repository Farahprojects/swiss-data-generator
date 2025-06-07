
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Type } from 'lucide-react';

const fonts = [
  { name: 'Inter', value: 'font-inter', class: 'font-inter' },
  { name: 'Roboto', value: 'font-roboto', class: 'font-roboto' },
  { name: 'Open Sans', value: 'font-opensans', class: 'font-opensans' },
  { name: 'Lato', value: 'font-lato', class: 'font-lato' },
  { name: 'Montserrat', value: 'font-montserrat', class: 'font-montserrat' },
  { name: 'Poppins', value: 'font-poppins', class: 'font-poppins' },
  { name: 'Source Sans Pro', value: 'font-source-sans-pro', class: 'font-source-sans-pro' },
  { name: 'Nunito', value: 'font-nunito', class: 'font-nunito' },
  { name: 'Raleway', value: 'font-raleway', class: 'font-raleway' },
  { name: 'Ubuntu', value: 'font-ubuntu', class: 'font-ubuntu' },
  { name: 'Playfair Display', value: 'font-playfair', class: 'font-playfair' },
  { name: 'Merriweather', value: 'font-merriweather', class: 'font-merriweather' },
  { name: 'PT Sans', value: 'font-pt-sans', class: 'font-pt-sans' },
  { name: 'Oswald', value: 'font-oswald', class: 'font-oswald' },
  { name: 'Source Code Pro', value: 'font-source-code-pro', class: 'font-source-code-pro' }
];

const fontSizes = [
  { name: 'Extra Small', value: 'text-xs', class: 'text-xs' },
  { name: 'Small', value: 'text-sm', class: 'text-sm' },
  { name: 'Normal', value: 'text-base', class: 'text-base' },
  { name: 'Large', value: 'text-lg', class: 'text-lg' },
  { name: 'Extra Large', value: 'text-xl', class: 'text-xl' },
  { name: '2X Large', value: 'text-2xl', class: 'text-2xl' },
  { name: '3X Large', value: 'text-3xl', class: 'text-3xl' },
  { name: '4X Large', value: 'text-4xl', class: 'text-4xl' }
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
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Font Family</div>
            <div className="h-24 overflow-y-auto">
              <div className="space-y-1 pr-3">
                {fonts.map((font) => (
                  <Button
                    key={font.value}
                    variant={currentFont === font.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onFontSelect(font.value)}
                    className={`w-full justify-start ${font.class}`}
                  >
                    {font.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Font Size</div>
            <div className="h-20 overflow-y-auto">
              <div className="space-y-1 pr-3">
                {fontSizes.map((size) => (
                  <Button
                    key={size.value}
                    variant={currentSize === size.value ? "default" : "ghost"}
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
        </div>
      </PopoverContent>
    </Popover>
  );
};
