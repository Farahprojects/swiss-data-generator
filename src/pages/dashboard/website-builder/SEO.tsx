
import React from "react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SEO() {
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">SEO Settings</h2>
          <p className="text-gray-600">Optimize your website for search engines</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/website-builder/design')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Design</span>
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/website-builder/publish')}
            className="flex items-center space-x-2"
          >
            <span>Continue to Publish</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic SEO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Basic SEO</span>
              <Info className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metaTitle">Page Title</Label>
              <Input
                id="metaTitle"
                value={customizationData.metaTitle || customizationData.coachName || ''}
                onChange={(e) => updateCustomizationData('metaTitle', e.target.value)}
                placeholder="Your Name - Professional Coach"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(customizationData.metaTitle || customizationData.coachName || '').length}/60 characters
              </p>
            </div>
            
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={customizationData.metaDescription || customizationData.bio || ''}
                onChange={(e) => updateCustomizationData('metaDescription', e.target.value)}
                placeholder="A brief description of your coaching services and expertise"
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(customizationData.metaDescription || customizationData.bio || '').length}/160 characters
              </p>
            </div>

            <div>
              <Label htmlFor="metaKeywords">Keywords</Label>
              <Input
                id="metaKeywords"
                value={customizationData.metaKeywords || ''}
                onChange={(e) => updateCustomizationData('metaKeywords', e.target.value)}
                placeholder="life coach, career coaching, personal development"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate keywords with commas. Focus on terms your clients might search for.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="socialLinkedIn">LinkedIn Profile</Label>
              <Input
                id="socialLinkedIn"
                value={customizationData.socialLinkedIn || ''}
                onChange={(e) => updateCustomizationData('socialLinkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            
            <div>
              <Label htmlFor="socialInstagram">Instagram Profile</Label>
              <Input
                id="socialInstagram"
                value={customizationData.socialInstagram || ''}
                onChange={(e) => updateCustomizationData('socialInstagram', e.target.value)}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
            
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={customizationData.contactEmail || ''}
                onChange={(e) => updateCustomizationData('contactEmail', e.target.value)}
                placeholder="hello@yourname.com"
              />
            </div>
            
            <div>
              <Label htmlFor="contactPhone">Phone Number</Label>
              <Input
                id="contactPhone"
                value={customizationData.contactPhone || ''}
                onChange={(e) => updateCustomizationData('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Business */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessLocation">Location/City</Label>
              <Input
                id="businessLocation"
                value={customizationData.businessLocation || ''}
                onChange={(e) => updateCustomizationData('businessLocation', e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>
            
            <div>
              <Label htmlFor="businessHours">Business Hours</Label>
              <Input
                id="businessHours"
                value={customizationData.businessHours || ''}
                onChange={(e) => updateCustomizationData('businessHours', e.target.value)}
                placeholder="Monday - Friday, 9 AM - 6 PM PST"
              />
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
