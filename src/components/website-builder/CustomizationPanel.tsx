import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, ChevronDown, ChevronUp, Palette, Type, Settings, User, Briefcase, Image as ImageIcon, FileText } from "lucide-react";
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

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customizationData,
  onChange
}) => {
  const [openSections, setOpenSections] = useState({
    hero: true,
    intro: false,
    images: false,
    services: true,
    cta: false,
    footer: false
  });

  const [buttonColorMode, setButtonColorMode] = useState<'button' | 'text'>('button');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

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

  // Ensure we always work with validated services
  const validServices = validateServices(customizationData.services || []);

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
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.hero} onOpenChange={() => toggleSection('hero')}>
          <SectionHeader 
            icon={User} 
            title="Hero" 
            isOpen={openSections.hero}
            section="hero"
          />
          <AnimatePresence>
            {openSections.hero && (
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
                        <Label htmlFor="coachName" className="text-sm font-medium text-gray-700">Heading</Label>
                        <Input
                          id="coachName"
                          value={customizationData.coachName || ''}
                          onChange={(e) => onChange('coachName', e.target.value)}
                          placeholder="Your main heading"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="tagline" className="text-sm font-medium text-gray-700">Sub Heading</Label>
                        <Input
                          id="tagline"
                          value={customizationData.tagline || ''}
                          onChange={(e) => onChange('tagline', e.target.value)}
                          placeholder="Your sub heading"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Font Style</Label>
                      <Select
                        value={customizationData.heroFontStyle || 'modern'}
                        onValueChange={(value) => onChange('heroFontStyle', value)}
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
                            onClick={() => onChange('heroTextColor', color.value)}
                            className={`relative w-full h-12 rounded-lg border-2 transition-all ${
                              customizationData.heroTextColor === color.value 
                                ? 'border-gray-800 scale-105' 
                                : 'border-gray-200 hover:border-gray-300'
                            } ${color.value === '#FFFFFF' ? 'shadow-inner' : ''}`}
                            style={{ 
                              backgroundColor: color.value,
                              border: color.value === '#FFFFFF' ? '2px solid #E5E7EB' : undefined
                            }}
                            title={color.name}
                          >
                            {customizationData.heroTextColor === color.value && (
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
                        value={customizationData.heroAlignment || 'center'}
                        onValueChange={(value) => onChange('heroAlignment', value as 'left' | 'center' | 'right')}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="left" id="hero-align-left" />
                          <Label htmlFor="hero-align-left" className="text-sm">Left</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="center" id="hero-align-center" />
                          <Label htmlFor="hero-align-center" className="text-sm">Center</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="right" id="hero-align-right" />
                          <Label htmlFor="hero-align-right" className="text-sm">Right</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Intro Section */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.intro} onOpenChange={() => toggleSection('intro')}>
          <SectionHeader 
            icon={FileText} 
            title="Intro" 
            isOpen={openSections.intro}
            section="intro"
          />
          <AnimatePresence>
            {openSections.intro && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6 pt-0">
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
                      <Label htmlFor="philosophyTitle" className="text-sm font-medium text-gray-700">Philosophy Section Title</Label>
                      <Input
                        id="philosophyTitle"
                        value={customizationData.philosophyTitle || ''}
                        onChange={(e) => onChange('philosophyTitle', e.target.value)}
                        placeholder="My Philosophy"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="philosophyTagline" className="text-sm font-medium text-gray-700">Philosophy Tagline</Label>
                      <Input
                        id="philosophyTagline"
                        value={customizationData.philosophyTagline || ''}
                        onChange={(e) => onChange('philosophyTagline', e.target.value)}
                        placeholder="Wisdom through experience"
                        className="mt-1"
                      />
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
                    <div>
                      <Label htmlFor="servicesTitle" className="text-sm font-medium text-gray-700">Services Section Title</Label>
                      <Input
                        id="servicesTitle"
                        value={customizationData.servicesTitle || ''}
                        onChange={(e) => onChange('servicesTitle', e.target.value)}
                        placeholder="Services Offered"
                        className="mt-1"
                      />
                    </div>

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
                  <CardContent className="space-y-6 pt-0">
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
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>

      {/* Footer */}
      <Card className="overflow-hidden">
        <Collapsible open={openSections.footer} onOpenChange={() => toggleSection('footer')}>
          <SectionHeader 
            icon={Palette} 
            title="Footer" 
            isOpen={openSections.footer}
            section="footer"
          />
          <AnimatePresence>
            {openSections.footer && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6 pt-0">
                    <div>
                      <Label htmlFor="footerHeading" className="text-sm font-medium text-gray-700">Footer Heading</Label>
                      <Input
                        id="footerHeading"
                        value={customizationData.footerHeading || ''}
                        onChange={(e) => onChange('footerHeading', e.target.value)}
                        placeholder="e.g., Ready to Transform Your Life?"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="footerSubheading" className="text-sm font-medium text-gray-700">Footer Subheading</Label>
                      <Input
                        id="footerSubheading"
                        value={customizationData.footerSubheading || ''}
                        onChange={(e) => onChange('footerSubheading', e.target.value)}
                        placeholder="e.g., Take the first step towards achieving your goals."
                        className="mt-1"
                      />
                    </div>

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
