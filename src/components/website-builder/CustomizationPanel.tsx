
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Plus, X, ChevronDown, ChevronUp, Palette, Type, Settings, User, Briefcase, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUploader } from "./ImageUploader";
import type { Service, CustomizationData, ImageData } from "@/types/website-builder";

interface CustomizationPanelProps {
  customizationData: CustomizationData;
  onChange: (field: string, value: any) => void;
}

const colorOptions = [
  { name: 'Modern Blue', value: '#6366F1', category: 'modern' },
  { name: 'Royal Purple', value: '#8B5CF6', category: 'elegant' },
  { name: 'Emerald Green', value: '#10B981', category: 'natural' },
  { name: 'Sunset Orange', value: '#F59E0B', category: 'warm' },
  { name: 'Crimson Red', value: '#EF4444', category: 'bold' },
  { name: 'Ocean Blue', value: '#3B82F6', category: 'professional' },
  { name: 'Forest Green', value: '#059669', category: 'natural' },
  { name: 'Deep Purple', value: '#7C3AED', category: 'creative' },
  { name: 'Coral Pink', value: '#EC4899', category: 'vibrant' },
  { name: 'Navy Blue', value: '#1E40AF', category: 'corporate' }
];

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

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customizationData,
  onChange
}) => {
  const [openSections, setOpenSections] = useState({
    basic: true,
    images: false,
    services: true,
    cta: false,
    design: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const handleServiceChange = (index: number, field: string, value: string | ImageData | null) => {
    const services = [...(customizationData.services || [])];
    if (field === 'imageData') {
      services[index] = { ...services[index], imageData: value as ImageData | undefined };
    } else {
      services[index] = { ...services[index], [field]: value };
    }
    onChange('services', services);
  };

  const addService = () => {
    const services = [...(customizationData.services || [])];
    services.push({ title: '', description: '', price: '', imageUrl: '' });
    onChange('services', services);
  };

  const removeService = (index: number) => {
    const services = customizationData.services?.filter((_, i) => i !== index) || [];
    onChange('services', services);
  };

  const SectionHeader = ({ icon: Icon, title, isOpen, section }: any) => (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 transition-colors w-full">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
          <SectionHeader 
            icon={User} 
            title="Basic Information" 
            isOpen={openSections.basic}
            section="basic"
          />
          <AnimatePresence>
            {openSections.basic && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6 pt-0">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="coachName" className="text-sm font-medium text-gray-700">Coach Name</Label>
                        <Input
                          id="coachName"
                          value={customizationData.coachName || ''}
                          onChange={(e) => onChange('coachName', e.target.value)}
                          placeholder="Your full name"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="tagline" className="text-sm font-medium text-gray-700">Professional Tagline</Label>
                        <Input
                          id="tagline"
                          value={customizationData.tagline || ''}
                          onChange={(e) => onChange('tagline', e.target.value)}
                          placeholder="Your professional tagline"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="bio" className="text-sm font-medium text-gray-700">About You</Label>
                      <Textarea
                        id="bio"
                        value={customizationData.bio || ''}
                        onChange={(e) => onChange('bio', e.target.value)}
                        placeholder="Tell your story and describe your coaching approach..."
                        rows={4}
                        className="mt-1"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {(customizationData.bio || '').length}/500 characters
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Images Section */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.images} onOpenChange={() => toggleSection('images')}>
          <SectionHeader 
            icon={ImageIcon} 
            title="Images" 
            isOpen={openSections.images}
            section="images"
          />
          <AnimatePresence>
            {openSections.images && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6 pt-0">
                    <ImageUploader
                      value={customizationData.headerImageData}
                      onChange={(data) => onChange('headerImageData', data)}
                      label="Header Background Image"
                      section="header"
                    />
                    
                    {/* Header Image Opacity Control */}
                    {(customizationData.headerImageData?.url || customizationData.headerImageUrl) && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Header Image Opacity ({customizationData.headerImageOpacity || 100}%)
                        </Label>
                        <Slider
                          value={[customizationData.headerImageOpacity || 100]}
                          onValueChange={(value) => onChange('headerImageOpacity', value[0])}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Transparent</span>
                          <span>Opaque</span>
                        </div>
                      </div>
                    )}
                    
                    <ImageUploader
                      value={customizationData.aboutImageData}
                      onChange={(data) => onChange('aboutImageData', data)}
                      label="About Section Image"
                      section="about"
                    />
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Services */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.services} onOpenChange={() => toggleSection('services')}>
          <SectionHeader 
            icon={Briefcase} 
            title="Services & Offerings" 
            isOpen={openSections.services}
            section="services"
          />
          <AnimatePresence>
            {openSections.services && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Add your coaching services and pricing</div>
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
                      {(customizationData.services || []).map((service, index) => (
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
                              value={service.title}
                              onChange={(e) => handleServiceChange(index, 'title', e.target.value)}
                              placeholder="e.g., Life Coaching Session"
                            />
                            <Textarea
                              value={service.description}
                              onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                              placeholder="Describe what this service includes..."
                              rows={2}
                            />
                            <Input
                              value={service.price}
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
                    
                    {(!customizationData.services || customizationData.services.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No services added yet</p>
                        <p className="text-sm">Click "Add Service" to get started</p>
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Call to Action */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.cta} onOpenChange={() => toggleSection('cta')}>
          <SectionHeader 
            icon={Settings} 
            title="Call to Action" 
            isOpen={openSections.cta}
            section="cta"
          />
          <AnimatePresence>
            {openSections.cta && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0">
                    <div>
                      <Label htmlFor="buttonText" className="text-sm font-medium text-gray-700">Primary Button Text</Label>
                      <Input
                        id="buttonText"
                        value={customizationData.buttonText || ''}
                        onChange={(e) => onChange('buttonText', e.target.value)}
                        placeholder="e.g., Book a Consultation, Get Started, Contact Me"
                        className="mt-1"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        This text will appear on your main call-to-action buttons
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Design Settings */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.design} onOpenChange={() => toggleSection('design')}>
          <SectionHeader 
            icon={Palette} 
            title="Design & Styling" 
            isOpen={openSections.design}
            section="design"
          />
          <AnimatePresence>
            {openSections.design && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6 pt-0">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Brand Color</Label>
                      <div className="grid grid-cols-5 gap-3">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => onChange('themeColor', color.value)}
                            className={`group relative w-full h-12 rounded-lg border-2 transition-all ${
                              customizationData.themeColor === color.value 
                                ? 'border-gray-800 scale-110' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {customizationData.themeColor === color.value && (
                              <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="w-4 h-4 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                                  ✓
                                </div>
                              </div>
                            )}
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {color.name}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="fontFamily" className="text-sm font-medium text-gray-700">Typography</Label>
                      <Select
                        value={customizationData.fontFamily || 'Inter'}
                        onValueChange={(value) => onChange('fontFamily', value)}
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
                    
                    <div>
                      <Label htmlFor="backgroundStyle" className="text-sm font-medium text-gray-700">Background Style</Label>
                      <Select
                        value={customizationData.backgroundStyle || 'solid'}
                        onValueChange={(value) => onChange('backgroundStyle', value)}
                      >
                        <SelectTrigger className="mt-1">
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
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>
    </div>
  );
};
