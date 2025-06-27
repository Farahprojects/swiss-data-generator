
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type } from 'lucide-react';
import { FONT_REGISTRY, getFontsByCategory, getFontByValue } from '@/utils/fontRegistry';
import * as PopoverPrimitive from '@radix-ui/react-popover';

interface FontSelectorProps {
  onFontSelect: (fontClass: string) => void;
  currentFont?: string;
  showCategories?: boolean;
  triggerVariant?: 'default' | 'ghost' | 'outline';
  triggerSize?: 'default' | 'sm' | 'lg';
}

export const FontSelector = ({ 
  onFontSelect, 
  currentFont = 'font-inter',
  showCategories = false,
  triggerVariant = 'ghost',
  triggerSize = 'sm'
}: FontSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const currentFontData = getFontByValue(currentFont);
  
  const renderFontButton = (font: typeof FONT_REGISTRY[0]) => (
    <Button
      key={font.value}
      variant={currentFont === font.value ? "default" : "ghost"}
      size="sm"
      onClick={() => {
        onFontSelect(font.value);
        setIsOpen(false);
      }}
      className={`w-full justify-start ${font.class} text-left`}
    >
      <div className="flex flex-col items-start">
        <span className="font-medium">{font.name}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {font.category}
        </span>
      </div>
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} type="button">
          <Type className="w-4 h-4 mr-2" />
          {currentFontData?.name || 'Select Font'}
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-[9999] w-64 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          side="bottom"
          sideOffset={5}
          avoidCollisions={true}
          collisionPadding={20}
        >
          <div className="p-3">
            {showCategories ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-3">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="sans-serif" className="text-xs">Sans</TabsTrigger>
                  <TabsTrigger value="serif" className="text-xs">Serif</TabsTrigger>
                  <TabsTrigger value="display" className="text-xs">Display</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <div className="h-48 overflow-y-auto overscroll-contain" ref={scrollAreaRef}>
                    <div className="space-y-1 pr-2" ref={contentRef}>
                      {FONT_REGISTRY.map(renderFontButton)}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="sans-serif">
                  <div className="h-48 overflow-y-auto overscroll-contain">
                    <div className="space-y-1 pr-2">
                      {getFontsByCategory('sans-serif').map(renderFontButton)}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="serif">
                  <div className="h-48 overflow-y-auto overscroll-contain">
                    <div className="space-y-1 pr-2">
                      {getFontsByCategory('serif').map(renderFontButton)}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="display">
                  <div className="h-48 overflow-y-auto overscroll-contain">
                    <div className="space-y-1 pr-2">
                      {getFontsByCategory('display').map(renderFontButton)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">Font Family</div>
                <div className="h-48 overflow-y-auto overscroll-contain" ref={scrollAreaRef}>
                  <div className="space-y-1 pr-2" ref={contentRef}>
                    {FONT_REGISTRY.map(renderFontButton)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
};
