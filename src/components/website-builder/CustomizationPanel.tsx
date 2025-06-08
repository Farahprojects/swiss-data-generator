
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { CustomizationData, Service } from '@/types/website-builder';

interface CustomizationPanelProps {
  customizationData: CustomizationData;
  onChange: (field: string, value: any) => void;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customizationData,
  onChange
}) => {
  const handleServiceChange = (index: number, field: keyof Service, value: any) => {
    const updatedServices = [...(customizationData.services || [])];
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: value
    };
    onChange('services', updatedServices);
  };

  const addService = () => {
    const newService: Service = {
      title: 'New Service',
      description: 'Service description',
      price: '$100'
    };
    const updatedServices = [...(customizationData.services || []), newService];
    onChange('services', updatedServices);
  };

  const removeService = (index: number) => {
    const updatedServices = (customizationData.services || []).filter((_, i) => i !== index);
    onChange('services', updatedServices);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="coachName">Coach Name</Label>
            <Input
              id="coachName"
              value={customizationData.coachName || ''}
              onChange={(e) => onChange('coachName', e.target.value)}
              placeholder="Your Name"
            />
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={customizationData.tagline || ''}
              onChange={(e) => onChange('tagline', e.target.value)}
              placeholder="Professional Coach & Mentor"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={customizationData.bio || ''}
              onChange={(e) => onChange('bio', e.target.value)}
              placeholder="Tell visitors about yourself..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              value={customizationData.buttonText || ''}
              onChange={(e) => onChange('buttonText', e.target.value)}
              placeholder="Get Started"
            />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader
            value={customizationData.headerImageUrl}
            onChange={(url) => onChange('headerImageUrl', url)}
            label="Header Background Image"
            section="header"
          />

          <ImageUploader
            value={customizationData.aboutImageUrl}
            onChange={(url) => onChange('aboutImageUrl', url)}
            label="About Section Image"
            section="about"
          />
        </CardContent>
      </Card>

      {/* Services & Offerings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Services & Offerings
            <Button onClick={addService} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Service
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(customizationData.services || []).map((service, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Service {index + 1}</Label>
                  <Button
                    onClick={() => removeService(index)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`service-title-${index}`}>Title</Label>
                  <Input
                    id={`service-title-${index}`}
                    value={service.title}
                    onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                    placeholder="Service Title"
                  />
                </div>

                <div>
                  <Label htmlFor={`service-description-${index}`}>Description</Label>
                  <Textarea
                    id={`service-description-${index}`}
                    value={service.description}
                    onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                    placeholder="Service description..."
                    className="min-h-[80px]"
                  />
                </div>

                <div>
                  <Label htmlFor={`service-price-${index}`}>Price</Label>
                  <Input
                    id={`service-price-${index}`}
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                    placeholder="$150/session"
                  />
                </div>

                <ImageUploader
                  value={service.imageUrl}
                  onChange={(url) => handleServiceChange(index, 'imageUrl', url)}
                  label="Service Image"
                  section="service"
                  serviceIndex={index}
                />
              </div>
            </Card>
          ))}

          {(!customizationData.services || customizationData.services.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No services added yet.</p>
              <Button onClick={addService} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Service
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Design Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Design Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="themeColor">Theme Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="themeColor"
                type="color"
                value={customizationData.themeColor || '#3B82F6'}
                onChange={(e) => onChange('themeColor', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={customizationData.themeColor || '#3B82F6'}
                onChange={(e) => onChange('themeColor', e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
              />
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
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
