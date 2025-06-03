
import React from "react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const colorOptions = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

const fontOptions = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat' },
];

export default function Design() {
  const { selectedTemplate, customizationData, updateCustomizationData, isLoading } = useWebsiteBuilder();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  if (!selectedTemplate) {
    navigate('/dashboard/website-builder/templates');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Design Customization</h2>
          <p className="text-gray-600">Customize colors, fonts, and visual elements</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/website-builder/content')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Content</span>
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/website-builder/seo')}
            className="flex items-center space-x-2"
          >
            <span>Continue to SEO</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Color</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateCustomizationData('themeColor', color.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    customizationData.themeColor === color.value
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="w-full h-8 rounded-md mb-2"
                    style={{ backgroundColor: color.value }}
                  />
                  <p className="text-sm font-medium text-gray-700">{color.name}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Font Family</Label>
              <div className="grid grid-cols-2 gap-3">
                {fontOptions.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => updateCustomizationData('fontFamily', font.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      customizationData.fontFamily === font.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    <p className="font-semibold text-lg mb-1">{font.name}</p>
                    <p className="text-sm text-gray-600">The quick brown fox jumps</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Specific Options */}
        <Card>
          <CardHeader>
            <CardTitle>Template Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Background Style</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => updateCustomizationData('backgroundStyle', 'solid')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    customizationData.backgroundStyle === 'solid'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-12 bg-gray-100 rounded mb-2"></div>
                  <p className="text-sm font-medium">Solid</p>
                </button>
                
                <button
                  onClick={() => updateCustomizationData('backgroundStyle', 'gradient')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    customizationData.backgroundStyle === 'gradient'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded mb-2"></div>
                  <p className="text-sm font-medium">Gradient</p>
                </button>
                
                <button
                  onClick={() => updateCustomizationData('backgroundStyle', 'pattern')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    customizationData.backgroundStyle === 'pattern'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-12 bg-gray-100 rounded mb-2 bg-opacity-50" style={{
                    backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
                    backgroundSize: '10px 10px'
                  }}></div>
                  <p className="text-sm font-medium">Pattern</p>
                </button>
              </div>
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
