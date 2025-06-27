
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUploader } from "../ImageUploader";
import type { Service, ImageData } from "@/types/website-builder";

interface ServicesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

// Helper function to validate and clean services array
const validateServices = (services: any[]): Service[] => {
  if (!Array.isArray(services)) {
    return [];
  }
  
  return services.filter((service: any) => {
    // Filter out null, undefined, or invalid service objects
    return service && 
           typeof service === 'object' && 
           service !== null;
  }).map((service: any) => ({
    title: service.title || '',
    description: service.description || '',
    price: service.price || '',
    imageUrl: service.imageUrl || '',
    imageData: service.imageData || undefined
  }));
};

export const ServicesEditModal: React.FC<ServicesEditModalProps> = ({
  isOpen,
  onClose,
  customizationData,
  onChange
}) => {
  const handleServiceChange = (index: number, field: string, value: string | ImageData | null) => {
    const services = validateServices(customizationData.services || []);
    if (field === 'imageData') {
      services[index] = { ...services[index], imageData: value as ImageData | undefined };
    } else {
      services[index] = { ...services[index], [field]: value };
    }
    onChange('services', services);
  };

  const addService = () => {
    const services = validateServices(customizationData.services || []);
    services.push({ title: '', description: '', price: '', imageUrl: '' });
    onChange('services', services);
  };

  const removeService = (index: number) => {
    const services = validateServices(customizationData.services || []);
    const filteredServices = services.filter((_, i) => i !== index);
    onChange('services', filteredServices);
  };

  const handleReportServiceChange = (field: string, value: string) => {
    const reportService = customizationData.reportService || {};
    onChange('reportService', { ...reportService, [field]: value });
  };

  // Ensure we always work with validated services
  const validServices = validateServices(customizationData.services || []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        <DialogHeader>
          <DialogTitle>Edit Services & Offerings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Services Section - Now First */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Add your services and pricing</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addService}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Service</span>
                </Button>
              </div>
              
              <AnimatePresence>
                {validServices.map((service, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="border rounded-lg p-4 space-y-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Service {index + 1}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeService(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <Input
                        value={service.title || ''}
                        onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                        placeholder="e.g., Consultation Session"
                      />
                      <Textarea
                        value={service.description || ''}
                        onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                        placeholder="Describe what this service includes..."
                        rows={2}
                      />
                      <Input
                        value={service.price || ''}
                        onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                        placeholder="e.g., $150/session or $500/package"
                      />
                      
                      <ImageUploader
                        value={service.imageData}
                        onChange={(data) => handleServiceChange(index, 'imageData', data)}
                        label="Service Icon/Image"
                        section="service"
                        serviceIndex={index}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {validServices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No services added yet</p>
                  <p className="text-sm">Click "Add Service" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Service Section - Now Second */}
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="text-sm text-gray-600 mb-4">
                Configure your personal insights report service that appears as the first service offering.
              </div>
              
              <div>
                <Label htmlFor="reportTitle" className="text-sm font-medium text-gray-700">Report Title</Label>
                <Input
                  id="reportTitle"
                  value={customizationData.reportService?.title || ''}
                  onChange={(e) => handleReportServiceChange('title', e.target.value)}
                  placeholder="e.g., Personal Insights Report"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reportDescription" className="text-sm font-medium text-gray-700">Report Description</Label>
                <Textarea
                  id="reportDescription"
                  value={customizationData.reportService?.description || ''}
                  onChange={(e) => handleReportServiceChange('description', e.target.value)}
                  placeholder="Describe what your personal report includes..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reportPrice" className="text-sm font-medium text-gray-700">Report Price</Label>
                <Input
                  id="reportPrice"
                  value={customizationData.reportService?.price || ''}
                  onChange={(e) => handleReportServiceChange('price', e.target.value)}
                  placeholder="e.g., $29"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reportSectionHeading" className="text-sm font-medium text-gray-700">Section Heading (Optional)</Label>
                <Input
                  id="reportSectionHeading"
                  value={customizationData.reportService?.sectionHeading || ''}
                  onChange={(e) => handleReportServiceChange('sectionHeading', e.target.value)}
                  placeholder="e.g., Get Your Personal Report"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
