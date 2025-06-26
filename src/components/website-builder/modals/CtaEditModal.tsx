
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CtaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

const fontOptions = [
  { name: 'Inter', value: 'Inter', category: 'Modern Sans-serif', preview: 'Clean and readable' },
  { name: 'Poppins', value: 'Poppins', category: 'Geometric Sans-serif', preview: 'Friendly and approachable' },
  { name: 'Montserrat', value: 'Montserrat', category: 'Urban Sans-serif', preview: 'Professional and elegant' },
  { name: 'Playfair Display', value: 'Playfair Display', category: 'Serif', preview: 'Traditional and sophisticated' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro', category: 'Humanist Sans-serif', preview: 'Clear and versatile' },
  { name: 'Lato', value: 'Lato', category: 'Humanist Sans-serif', preview: 'Warm and friendly' },
  { name: 'Open Sans', value: 'Open Sans', category: 'Humanist Sans-serif', preview: 'Neutral and legible' },
  { name: 'Merriweather', value: 'Merriweather', category: 'Serif', preview: 'Classical and readable' }
];

const introColorOptions = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light Gray', value: '#D1D5DB' },
  { name: 'Deep Blue', value: '#1E40AF' },
  { name: 'Warm Red', value: '#DC2626' },
  { name: 'Sage', value: '#A7B29C' },
  { name: 'Sand', value: '#D4B896' }
];

export const CtaEditModal: React.FC<CtaEditModalProps> = ({
  isOpen,
  onClose,
  customizationData,
  onChange
}) => {
  const [buttonColorMode, setButtonColorMode] = useState<'button' | 'text'>('button');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Call to Action</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label htmlFor="buttonText" className="text-sm font-medium text-gray-700">Button Text</Label>
              <Input
                id="buttonText"
                value={customizationData.buttonText || ''}
                onChange={(e) => onChange('buttonText', e.target.value)}
                placeholder="e.g., Get Started, Contact Me, Learn More"
                className="mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                This text will appear on your main call-to-action buttons
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Button Style</Label>
              <RadioGroup
                value={customizationData.buttonStyle || 'bordered'}
                onValueChange={(value) => onChange('buttonStyle', value as 'bordered' | 'borderless')}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bordered" id="button-bordered" />
                  <Label htmlFor="button-bordered" className="text-sm">Bordered</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="borderless" id="button-borderless" />
                  <Label htmlFor="button-borderless" className="text-sm">Borderless</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Button Colors</Label>
              <RadioGroup
                value={buttonColorMode}
                onValueChange={(value) => setButtonColorMode(value as 'button' | 'text')}
                className="flex space-x-6 mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="button" id="color-button" />
                  <Label htmlFor="color-button" className="text-sm">Button Color</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="color-text" />
                  <Label htmlFor="color-text" className="text-sm">Text Color</Label>
                </div>
              </RadioGroup>
              
              <div className="grid grid-cols-4 gap-3">
                {introColorOptions.map((color) => {
                  const isSelected = buttonColorMode === 'button' 
                    ? customizationData.buttonColor === color.value
                    : customizationData.buttonTextColor === color.value;
                  
                  return (
                    <button
                      key={color.value}
                      onClick={() => {
                        const field = buttonColorMode === 'button' ? 'buttonColor' : 'buttonTextColor';
                        onChange(field, color.value);
                      }}
                      className={`relative w-full h-12 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-gray-800 scale-105' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${color.value === '#FFFFFF' ? 'shadow-inner' : ''}`}
                      style={{ 
                        backgroundColor: color.value,
                        border: color.value === '#FFFFFF' ? '2px solid #E5E7EB' : undefined
                      }}
                      title={color.name}
                    >
                      {isSelected && (
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          color.value === '#FFFFFF' || color.value === '#D1D5DB' ? 'text-gray-800' : 'text-white'
                        }`}>
                          <div className="text-sm font-medium">✓</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="buttonFontFamily" className="text-sm font-medium text-gray-700">Button Font</Label>
              <Select
                value={customizationData.buttonFontFamily || 'Inter'}
                onValueChange={(value) => onChange('buttonFontFamily', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col">
                        <span style={{ fontFamily: font.value }} className="font-medium">
                          {font.name}
                        </span>
                        <span className="text-xs text-gray-500">{font.category} • {font.preview}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
