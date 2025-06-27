
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type } from 'lucide-react';
import { FONT_REGISTRY, getFontsByCategory, getFontByValue } from '@/utils/fontRegistry';

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
  
  useEffect(() => {
    if (isOpen && scrollAreaRef.current && contentRef.current) {
      // Debug measurements
      const scrollArea = scrollAreaRef.current;
      const content = contentRef.current;
      
      console.log('=== FONT SELECTOR DEBUG ===');
      console.log('ScrollArea height:', scrollArea.offsetHeight);
      console.log('ScrollArea clientHeight:', scrollArea.clientHeight);
      console.log('ScrollArea scrollHeight:', scrollArea.scrollHeight);
      console.log('Content height:', content.offsetHeight);
      console.log('Content scrollHeight:', content.scrollHeight);
      console.log('Number of fonts:', FONT_REGISTRY.length);
      console.log('Can scroll?', scrollArea.scrollHeight > scrollArea.clientHeight);
      console.log('ScrollArea classes:', scrollArea.className);
      console.log('Content classes:', content.className);
      
      // Check if there are any overflow issues
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        console.log('Viewport height:', (viewport as HTMLElement).offsetHeight);
        console.log('Viewport scrollHeight:', (viewport as HTMLElement).scrollHeight);
      }
      
      console.log('========================');
    }
  }, [isOpen]);
  
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
      <PopoverContent 
        className="w-64 p-0 z-[100]" 
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
                <ScrollArea className="h-48" ref={scrollAreaRef}>
                  <div className="space-y-1 pr-2" ref={contentRef}>
                    {FONT_REGISTRY.map(renderFontButton)}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="sans-serif">
                <ScrollArea className="h-48">
                  <div className="space-y-1 pr-2">
                    {getFontsByCategory('sans-serif').map(renderFontButton)}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="serif">
                <ScrollArea className="h-48">
                  <div className="space-y-1 pr-2">
                    {getFontsByCategory('serif').map(renderFontButton)}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="display">
                <ScrollArea className="h-48">
                  <div className="space-y-1 pr-2">
                    {getFontsByCategory('display').map(renderFontButton)}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium mb-2">Font Family</div>
              <ScrollArea className="h-48" ref={scrollAreaRef}>
                <div className="space-y-1 pr-2" ref={contentRef}>
                  {FONT_REGISTRY.map(renderFontButton)}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
