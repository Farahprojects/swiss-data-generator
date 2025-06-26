
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ImageUploader } from "../ImageUploader";

interface ServicesModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const ServicesModalContent: React.FC<ServicesModalContentProps> = ({
  customizationData,
  onChange
}) => {
  const services = customizationData.services || [];

  const addService = () => {
    const newServices = [...services, { title: '', description: '', price: '' }];
    onChange('services', newServices);
  };

  const removeService = (index: number) => {
    const newServices = services.filter((_: any, i: number) => i !== index);
    onChange('services', newServices);
  };

  const updateService = (index: number, field: string, value: any) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    onChange('services', newServices);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Services</Label>
        <Button onClick={addService} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Service
        </Button>
      </div>
      
      {services.map((service: any, index: number) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Service {index + 1}</Label>
            <Button
              onClick={() => removeService(index)}
              size="sm"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Input
            value={service.title || ''}
            onChange={(e) => updateService(index, 'title', e.target.value)}
            placeholder="Service title"
          />
          
          <Textarea
            value={service.description || ''}
            onChange={(e) => updateService(index, 'description', e.target.value)}
            placeholder="Service description"
            rows={2}
          />
          
          <Input
            value={service.price || ''}
            onChange={(e) => updateService(index, 'price', e.target.value)}
            placeholder="Price (e.g., $100/session)"
          />
          
          <div>
            <Label>Service Image</Label>
            <ImageUploader
              currentImage={service.imageData?.url || service.imageUrl}
              onImageChange={(imageData) => updateService(index, 'imageData', imageData)}
              onImageRemove={() => {
                updateService(index, 'imageData', null);
                updateService(index, 'imageUrl', '');
              }}
              folder={`service/${index}`}
              aspectRatio="4:3"
            />
          </div>
        </div>
      ))}
      
      {services.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No services added yet. Click "Add Service" to get started.
        </div>
      )}
    </div>
  );
};
