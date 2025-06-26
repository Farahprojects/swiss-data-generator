
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface IntroEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

const introFontStyles = [
  { name: 'Modern', value: 'modern', preview: 'Clean and contemporary' },
  { name: 'Elegant', value: 'elegant', preview: 'Sophisticated and refined' },
  { name: 'Bold', value: 'bold', preview: 'Strong and impactful' },
  { name: 'Handwritten', value: 'handwritten', preview: 'Personal and warm' },
  { name: 'Classic', value: 'classic', preview: 'Timeless and traditional' },
  { name: 'Minimal', value: 'minimal', preview: 'Simple and understated' }
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

export const IntroEditModal: React.FC<IntroEditModalProps> = ({
  isOpen,
  onClose,
  customizationData,
  onChange
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Intro Section</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label htmlFor="introTitle" className="text-sm font-medium text-gray-700">Section Title</Label>
              <Input
                id="introTitle"
                value={customizationData.introTitle || ''}
                onChange={(e) => onChange('introTitle', e.target.value)}
                placeholder="Welcome to my page / About Me / etc."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Paragraph</Label>
              <Textarea
                id="bio"
                value={customizationData.bio || ''}
                onChange={(e) => onChange('bio', e.target.value)}
                placeholder="Tell your story and describe your approach..."
                rows={4}
                className="mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                {(customizationData.bio || '').length}/500 characters
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Font Style</Label>
              <Select
                value={customizationData.introFontStyle || 'modern'}
                onValueChange={(value) => onChange('introFontStyle', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {introFontStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{style.name}</span>
                        <span className="text-xs text-gray-500">{style.preview}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Text Color</Label>
              <div className="grid grid-cols-4 gap-3">
                {introColorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onChange('introTextColor', color.value)}
                    className={`relative w-full h-12 rounded-lg border-2 transition-all ${
                      customizationData.introTextColor === color.value 
                        ? 'border-gray-800 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${color.value === '#FFFFFF' ? 'shadow-inner' : ''}`}
                    style={{ 
                      backgroundColor: color.value,
                      border: color.value === '#FFFFFF' ? '2px solid #E5E7EB' : undefined
                    }}
                    title={color.name}
                  >
                    {customizationData.introTextColor === color.value && (
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        color.value === '#FFFFFF' || color.value === '#D1D5DB' ? 'text-gray-800' : 'text-white'
                      }`}>
                        <div className="text-sm font-medium">✓</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Text Alignment</Label>
              <RadioGroup
                value={customizationData.introAlignment || 'left'}
                onValueChange={(value) => onChange('introAlignment', value as 'left' | 'center' | 'right')}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="align-left" />
                  <Label htmlFor="align-left" className="text-sm">Left</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="align-center" />
                  <Label htmlFor="align-center" className="text-sm">Center</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="align-right" />
                  <Label htmlFor="align-right" className="text-sm">Right</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
