import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TemplateSelector } from "@/components/website-builder/TemplateSelector";
import { CustomizationPanel } from "@/components/website-builder/CustomizationPanel";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { PublishingModal } from "@/components/website-builder/PublishingModal";
import { Button } from "@/components/ui/button";
import { Eye, Save, Globe } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { loadImagesFromStorage } from "@/utils/storageImageLoader";

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  template_data: any;
}

interface CoachWebsite {
  id: string;
  template_id: string;
  site_slug: string;
  customization_data: any;
  is_published: boolean;
}

export default function WebsiteBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [website, setWebsite] = useState<CoachWebsite | null>(null);
  const [customizationData, setCustomizationData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    loadTemplatesAndWebsite();
  }, [user]);

  const loadTemplatesAndWebsite = async () => {
    if (!user) return;

    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('website_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load existing website
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('*')
        .eq('coach_id', user.id)
        .single();

      if (websiteData) {
        setWebsite(websiteData);
        setCustomizationData(websiteData.customization_data || {});
        
        // Find and set the selected template
        const template = templatesData?.find(t => t.id === websiteData.template_id);
        if (template) {
          setSelectedTemplate(template);
        }
      } else {
        // No existing website, but let's check for images in storage
        await loadImagesFromStorageAndPopulate();
      }

    } catch (error: any) {
      if (error.code !== 'PGRST116') { // Not found error is expected for new users
        logToSupabase("Error loading website builder data", {
          level: 'error',
          page: 'WebsiteBuilder',
          data: { error: error.message }
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load website builder data."
        });
      } else {
        // User doesn't have a website yet, load images from storage
        await loadImagesFromStorageAndPopulate();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadImagesFromStorageAndPopulate = async () => {
    if (!user) return;

    try {
      const storageImages = await loadImagesFromStorage(user.id);
      
      // Update customization data with images from storage
      setCustomizationData(prev => {
        const updated = { ...prev };
        
        if (storageImages.headerImageUrl) {
          updated.headerImageUrl = storageImages.headerImageUrl;
        }
        
        if (storageImages.aboutImageUrl) {
          updated.aboutImageUrl = storageImages.aboutImageUrl;
        }
        
        // Handle service images
        if (Object.keys(storageImages.serviceImages).length > 0) {
          if (!updated.services) {
            updated.services = [];
          }
          
          Object.entries(storageImages.serviceImages).forEach(([index, imageUrl]) => {
            const serviceIndex = parseInt(index);
            if (!updated.services[serviceIndex]) {
              updated.services[serviceIndex] = {
                title: '',
                description: '',
                price: '',
                imageUrl: ''
              };
            }
            updated.services[serviceIndex].imageUrl = imageUrl;
          });
        }
        
        return updated;
      });
      
      console.log('Auto-populated customization data with storage images');
    } catch (error) {
      console.error('Error loading images from storage:', error);
    }
  };

  const handleTemplateSelect = (template: WebsiteTemplate) => {
    setSelectedTemplate(template);
    
    // Set default customization data if no existing website
    if (!website) {
      const defaultData = {
        coachName: user?.email?.split('@')[0] || 'Your Name',
        tagline: template.template_data?.defaultContent?.hero?.subtitle || 'Professional Coach',
        bio: 'I help people transform their lives through personalized coaching.',
        services: [
          { title: 'Life Coaching', description: '1-on-1 sessions to help you achieve your goals', price: '$150/session' },
          { title: 'Career Coaching', description: 'Navigate your career path with confidence', price: '$120/session' }
        ],
        buttonText: 'Book a Consultation',
        themeColor: '#3B82F6',
        fontFamily: 'Inter',
        backgroundStyle: 'solid',
        // Preserve any existing images from storage
        ...customizationData
      };
      setCustomizationData(defaultData);
    }
  };

  const handleCustomizationChange = (field: string, value: any) => {
    setCustomizationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedTemplate) return;

    setIsSaving(true);
    try {
      const slug = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'coach';
      
      if (website) {
        // Update existing website
        const { error } = await supabase
          .from('coach_websites')
          .update({
            template_id: selectedTemplate.id,
            customization_data: customizationData
          })
          .eq('id', website.id);

        if (error) throw error;
      } else {
        // Create new website
        const { data, error } = await supabase
          .from('coach_websites')
          .insert({
            coach_id: user.id,
            template_id: selectedTemplate.id,
            site_slug: slug,
            customization_data: customizationData
          })
          .select()
          .single();

        if (error) throw error;
        setWebsite(data);
      }

      toast({
        title: "Website Saved",
        description: "Your website has been saved successfully."
      });

    } catch (error: any) {
      logToSupabase("Error saving website", {
        level: 'error',
        page: 'WebsiteBuilder',
        data: { error: error.message }
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save website changes."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Website Builder...</p>
        </div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Builder</h1>
            <p className="text-gray-600">Create your professional coaching website in minutes</p>
          </div>
          
          <TemplateSelector 
            templates={templates}
            onSelectTemplate={handleTemplateSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
              <p className="text-gray-600">Template: {selectedTemplate.name}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>
              
              {website && (
                <Button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <Globe className="h-4 w-4" />
                  <span>{website.is_published ? 'Update Site' : 'Publish'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <CustomizationPanel
              customizationData={customizationData}
              onChange={handleCustomizationChange}
            />
            
            <Button
              variant="outline"
              onClick={() => setSelectedTemplate(null)}
              className="w-full"
            >
              Change Template
            </Button>
          </div>
          
          <div className="lg:sticky lg:top-6">
            <TemplatePreview
              template={selectedTemplate}
              customizationData={customizationData}
            />
          </div>
        </div>
      </div>

      {showPreview && (
        <TemplatePreview
          template={selectedTemplate}
          customizationData={customizationData}
          isFullScreen={true}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showPublishModal && website && (
        <PublishingModal
          website={website}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setShowPublishModal(false);
            loadTemplatesAndWebsite();
          }}
        />
      )}
    </div>
  );
}
