import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload } from "lucide-react";
import { CustomizationData, Service } from "@/types/website-builder";
import { ImageUploader } from "./ImageUploader";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CustomizationPanelProps {
  data: CustomizationData;
  onUpdate: (data: CustomizationData) => void;
  onImageUpload: (file: File, type: 'profile' | 'header' | 'about' | 'service', serviceIndex?: number) => Promise<void>;
}

const fontOptions = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Poppins', label: 'Poppins (Friendly)' },
  { value: 'Roboto', label: 'Roboto (Clean)' },
  { value: 'Merriweather', label: 'Merriweather (Classic)' }
];

const introColorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC',
  '#26A69A', '#FF7043', '#42A5F5', '#66BB6A', '#EF5350',
  '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#8B5A2B', '#2D3748', '#1A202C', '#000000', '#FFFFFF'
];

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  data,
  onUpdate,
  onImageUpload
}) => {
  const [buttonColorMode, setButtonColorMode] = useState<'button' | 'text'>('button');

  const handleBasicInfoChange = (field: keyof CustomizationData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleServiceChange = (index: number, field: keyof Service, value: string) => {
    const updatedServices = [...(data.services || [])];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    onUpdate({ ...data, services: updatedServices });
  };

  const addService = () => {
    const newService: Service = {
      title: '',
      description: '',
      price: ''
    };
    onUpdate({ ...data, services: [...(data.services || []), newService] });
  };

  const removeService = (index: number) => {
    const updatedServices = data.services?.filter((_, i) => i !== index) || [];
    onUpdate({ ...data, services: updatedServices });
  };

  const handleColorChange = (colorType: 'button' | 'text', color: string) => {
    if (colorType === 'button') {
      onUpdate({ ...data, buttonColor: color });
    } else {
      onUpdate({ ...data, buttonTextColor: color });
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Customize Website</h2>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
          <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="px-4 pb-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="coachName" className="text-xs font-medium text-gray-700">
                  Coach Name
                </Label>
                <Input
                  id="coachName"
                  value={data.coachName || ''}
                  onChange={(e) => handleBasicInfoChange('coachName', e.target.value)}
                  placeholder="Your Name"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="tagline" className="text-xs font-medium text-gray-700">
                  Tagline
                </Label>
                <Input
                  id="tagline"
                  value={data.tagline || ''}
                  onChange={(e) => handleBasicInfoChange('tagline', e.target.value)}
                  placeholder="Your Expertise"
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="px-4 pb-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Profile & Bio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="profileImage" className="text-xs font-medium text-gray-700">
                  Profile Image
                </Label>
                <ImageUploader
                  onImageUpload={(file) => onImageUpload(file, 'profile')}
                  existingImageUrl={data.profileImageData?.url || data.profileImage}
                  type="profile"
                />
              </div>

              <div>
                <Label htmlFor="bio" className="text-xs font-medium text-gray-700">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={data.bio || ''}
                  onChange={(e) => handleBasicInfoChange('bio', e.target.value)}
                  placeholder="Tell us about yourself"
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Header Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="headerImage" className="text-xs font-medium text-gray-700">
                  Header Image
                </Label>
                <ImageUploader
                  onImageUpload={(file) => onImageUpload(file, 'header')}
                  existingImageUrl={data.headerImageData?.url || data.headerImageUrl}
                  type="header"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">About Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aboutImage" className="text-xs font-medium text-gray-700">
                  About Image
                </Label>
                <ImageUploader
                  onImageUpload={(file) => onImageUpload(file, 'about')}
                  existingImageUrl={data.aboutImageData?.url || data.aboutImageUrl}
                  type="about"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="px-4 pb-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.services && data.services.map((service, index) => (
                <div key={index} className="space-y-2 border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">Service {index + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeService(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor={`serviceTitle-${index}`} className="text-xs font-medium text-gray-700">
                      Title
                    </Label>
                    <Input
                      id={`serviceTitle-${index}`}
                      value={service.title || ''}
                      onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                      placeholder="Service Title"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`serviceDescription-${index}`} className="text-xs font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id={`serviceDescription-${index}`}
                      value={service.description || ''}
                      onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                      placeholder="Service Description"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`servicePrice-${index}`} className="text-xs font-medium text-gray-700">
                      Price
                    </Label>
                    <Input
                      id={`servicePrice-${index}`}
                      value={service.price || ''}
                      onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                      placeholder="Service Price"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`serviceImage-${index}`} className="text-xs font-medium text-gray-700">
                      Image
                    </Label>
                    <ImageUploader
                      onImageUpload={(file) => onImageUpload(file, 'service', index)}
                      existingImageUrl={service.imageData?.url || service.imageUrl}
                      type="service"
                      serviceIndex={index}
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" className="w-full justify-center" onClick={addService}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="px-4 pb-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Theme & Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="themeColor" className="text-xs font-medium text-gray-700">
                  Theme Color
                </Label>
                <Input
                  type="color"
                  id="themeColor"
                  value={data.themeColor || '#6366F1'}
                  onChange={(e) => handleBasicInfoChange('themeColor', e.target.value)}
                  className="h-9 w-full"
                />
              </div>

              <div>
                <Label htmlFor="fontFamily" className="text-xs font-medium text-gray-700">
                  Font Family
                </Label>
                <Select
                  value={data.fontFamily || ''}
                  onValueChange={(value) => handleBasicInfoChange('fontFamily', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select font family" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="backgroundStyle" className="text-xs font-medium text-gray-700">
                  Background Style
                </Label>
                <Input
                  id="backgroundStyle"
                  value={data.backgroundStyle || ''}
                  onChange={(e) => handleBasicInfoChange('backgroundStyle', e.target.value)}
                  placeholder="e.g., gradient-to-br from-gray-50 to-blue-50"
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Call-to-Action Buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="buttonText" className="text-xs font-medium text-gray-700">
                  Button Text
                </Label>
                <Input
                  id="buttonText"
                  value={data.buttonText || ''}
                  onChange={(e) => handleBasicInfoChange('buttonText', e.target.value)}
                  placeholder="Get Started"
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Button Style
                </Label>
                <RadioGroup
                  value={data.buttonStyle || 'bordered'}
                  onValueChange={(value) => handleBasicInfoChange('buttonStyle', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bordered" id="bordered" />
                    <Label htmlFor="bordered" className="text-xs">Bordered</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="borderless" id="borderless" />
                    <Label htmlFor="borderless" className="text-xs">Borderless</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="buttonFontFamily" className="text-xs font-medium text-gray-700">
                  Button Font
                </Label>
                <Select
                  value={data.buttonFontFamily || ''}
                  onValueChange={(value) => handleBasicInfoChange('buttonFontFamily', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select font family" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium text-gray-700">
                    Button Colors
                  </Label>
                  <div className="flex bg-gray-100 rounded-md p-1">
                    <Button
                      variant={buttonColorMode === 'button' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setButtonColorMode('button')}
                    >
                      Button
                    </Button>
                    <Button
                      variant={buttonColorMode === 'text' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setButtonColorMode('text')}
                    >
                      Text
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {introColorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-md border-2 transition-all ${
                        (buttonColorMode === 'button' ? data.buttonColor : data.buttonTextColor) === color
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(buttonColorMode, color)}
                      title={buttonColorMode === 'button' ? 'Button Color' : 'Text Color'}
                    />
                  ))}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  {buttonColorMode === 'button' ? 'Button' : 'Text'} Color: {
                    buttonColorMode === 'button' 
                      ? (data.buttonColor || 'Default') 
                      : (data.buttonTextColor || 'Default')
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Content Styling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="introTitle" className="text-xs font-medium text-gray-700">
                  Intro Title
                </Label>
                <Input
                  id="introTitle"
                  value={data.introTitle || ''}
                  onChange={(e) => handleBasicInfoChange('introTitle', e.target.value)}
                  placeholder="e.g., About Me"
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Intro Alignment
                </Label>
                <RadioGroup
                  value={data.introAlignment || 'left'}
                  onValueChange={(value) => handleBasicInfoChange('introAlignment', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="left" />
                    <Label htmlFor="left" className="text-xs">Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="center" />
                    <Label htmlFor="center" className="text-xs">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="right" />
                    <Label htmlFor="right" className="text-xs">Right</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="introFontStyle" className="text-xs font-medium text-gray-700">
                  Intro Font Style
                </Label>
                <Input
                  id="introFontStyle"
                  value={data.introFontStyle || ''}
                  onChange={(e) => handleBasicInfoChange('introFontStyle', e.target.value)}
                  placeholder="e.g., font-serif font-light"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="introTextColor" className="text-xs font-medium text-gray-700">
                  Intro Text Color
                </Label>
                <Input
                  type="color"
                  id="introTextColor"
                  value={data.introTextColor || '#374151'}
                  onChange={(e) => handleBasicInfoChange('introTextColor', e.target.value)}
                  className="h-9 w-full"
                />
              </div>

              <div>
                <Label htmlFor="heroFontStyle" className="text-xs font-medium text-gray-700">
                  Hero Font Style
                </Label>
                <Input
                  id="heroFontStyle"
                  value={data.heroFontStyle || ''}
                  onChange={(e) => handleBasicInfoChange('heroFontStyle', e.target.value)}
                  placeholder="e.g., font-bold"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="heroTextColor" className="text-xs font-medium text-gray-700">
                  Hero Text Color
                </Label>
                <Input
                  type="color"
                  id="heroTextColor"
                  value={data.heroTextColor || '#FFFFFF'}
                  onChange={(e) => handleBasicInfoChange('heroTextColor', e.target.value)}
                  className="h-9 w-full"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Hero Alignment
                </Label>
                <RadioGroup
                  value={data.heroAlignment || 'left'}
                  onValueChange={(value) => handleBasicInfoChange('heroAlignment', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="hero-left" />
                    <Label htmlFor="hero-left" className="text-xs">Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="hero-center" />
                    <Label htmlFor="hero-center" className="text-xs">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="hero-right" />
                    <Label htmlFor="hero-right" className="text-xs">Right</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
