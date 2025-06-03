
import React from "react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Content() {
  const { selectedTemplate, customizationData, updateCustomizationData, isLoading } = useWebsiteBuilder();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  if (!selectedTemplate) {
    navigate('/dashboard/website-builder/templates');
    return null;
  }

  const handleServiceChange = (index: number, field: string, value: string) => {
    const updatedServices = [...(customizationData.services || [])];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    updateCustomizationData('services', updatedServices);
  };

  const addService = () => {
    const newService = { title: '', description: '', price: '' };
    updateCustomizationData('services', [...(customizationData.services || []), newService]);
  };

  const removeService = (index: number) => {
    const updatedServices = customizationData.services?.filter((_, i) => i !== index) || [];
    updateCustomizationData('services', updatedServices);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Edit Content</h2>
          <p className="text-gray-600">Customize your website content and messaging</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/website-builder/templates')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Templates</span>
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/website-builder/design')}
            className="flex items-center space-x-2"
          >
            <span>Continue to Design</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="coachName">Your Name</Label>
              <Input
                id="coachName"
                value={customizationData.coachName || ''}
                onChange={(e) => updateCustomizationData('coachName', e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={customizationData.tagline || ''}
                onChange={(e) => updateCustomizationData('tagline', e.target.value)}
                placeholder="Your professional tagline"
              />
            </div>
            
            <div>
              <Label htmlFor="bio">About You</Label>
              <Textarea
                id="bio"
                value={customizationData.bio || ''}
                onChange={(e) => updateCustomizationData('bio', e.target.value)}
                placeholder="Tell your story and what makes you unique"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="buttonText">Call-to-Action Button Text</Label>
              <Input
                id="buttonText"
                value={customizationData.buttonText || ''}
                onChange={(e) => updateCustomizationData('buttonText', e.target.value)}
                placeholder="e.g., Book a Consultation"
              />
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Services</CardTitle>
              <Button onClick={addService} size="sm" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(customizationData.services || []).map((service: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Service {index + 1}</h4>
                    <Button
                      onClick={() => removeService(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={service.title || ''}
                        onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                        placeholder="Service name"
                      />
                    </div>
                    
                    <div>
                      <Label>Price</Label>
                      <Input
                        value={service.price || ''}
                        onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                        placeholder="$150/session"
                      />
                    </div>
                    
                    <div className="md:col-span-1">
                      <Label>Description</Label>
                      <Textarea
                        value={service.description || ''}
                        onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {(!customizationData.services || customizationData.services.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No services added yet. Click "Add Service" to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live preview for desktop - will be positioned in the right column by the layout */}
      <div className="hidden lg:block lg:fixed lg:top-24 lg:right-6 lg:w-96">
        <TemplatePreview
          template={selectedTemplate}
          customizationData={customizationData}
        />
      </div>
    </div>
  );
}
