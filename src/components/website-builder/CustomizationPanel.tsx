
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface Service {
  title: string;
  description: string;
  price: string;
}

interface CustomizationData {
  coachName?: string;
  profileImage?: string;
  tagline?: string;
  bio?: string;
  services?: Service[];
  buttonText?: string;
  themeColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
}

interface CustomizationPanelProps {
  customizationData: CustomizationData;
  onChange: (field: string, value: any) => void;
}

const colorOptions = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
];

const fontOptions = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Roboto',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Nunito'
];

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customizationData,
  onChange
}) => {
  const handleServiceChange = (index: number, field: string, value: string) => {
    const services = [...(customizationData.services || [])];
    services[index] = { ...services[index], [field]: value };
    onChange('services', services);
  };

  const addService = () => {
    const services = [...(customizationData.services || [])];
    services.push({ title: '', description: '', price: '' });
    onChange('services', services);
  };

  const removeService = (index: number) => {
    const services = customizationData.services?.filter((_, i) => i !== index) || [];
    onChange('services', services);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="coachName">Coach Name</Label>
            <Input
              id="coachName"
              value={customizationData.coachName || ''}
              onChange={(e) => onChange('coachName', e.target.value)}
              placeholder="Your full name"
            />
          </div>
          
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={customizationData.tagline || ''}
              onChange={(e) => onChange('tagline', e.target.value)}
              placeholder="Your professional tagline"
            />
          </div>
          
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={customizationData.bio || ''}
              onChange={(e) => onChange('bio', e.target.value)}
              placeholder="Tell your story and describe your coaching approach"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Services</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={addService}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(customizationData.services || []).map((service, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Service {index + 1}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeService(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <Input
                  value={service.title}
                  onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                  placeholder="Service title"
                />
                <Textarea
                  value={service.description}
                  onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                  placeholder="Service description"
                  rows={2}
                />
                <Input
                  value={service.price}
                  onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                  placeholder="Price (e.g., $150/session)"
                />
              </div>
            </div>
          ))}
          
          {(!customizationData.services || customizationData.services.length === 0) && (
            <p className="text-gray-500 text-center py-4">No services added yet. Click "Add Service" to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call to Action</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              value={customizationData.buttonText || ''}
              onChange={(e) => onChange('buttonText', e.target.value)}
              placeholder="Book a Consultation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Design Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Design Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Theme Color</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onChange('themeColor', color.value)}
                  className={`w-full h-10 rounded-md border-2 flex items-center justify-center text-white text-xs font-medium ${
                    customizationData.themeColor === color.value 
                      ? 'border-gray-800' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {customizationData.themeColor === color.value && '✓'}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select
              value={customizationData.fontFamily || 'Inter'}
              onValueChange={(value) => onChange('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="backgroundStyle">Background Style</Label>
            <Select
              value={customizationData.backgroundStyle || 'solid'}
              onValueChange={(value) => onChange('backgroundStyle', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="pattern">Subtle Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
