import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TemplateSelector } from "@/components/website-builder/TemplateSelector";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { PublishingModal } from "@/components/website-builder/PublishingModal";
import { FloatingEditButtons } from "@/components/website-builder/FloatingEditButtons";
import { FloatingSideMenu } from "@/components/website-builder/FloatingSideMenu";
import { HeroEditModal } from "@/components/website-builder/modals/HeroEditModal";
import { IntroEditModal } from "@/components/website-builder/modals/IntroEditModal";
import { ImagesEditModal } from "@/components/website-builder/modals/ImagesEditModal";
import { ServicesEditModal } from "@/components/website-builder/modals/ServicesEditModal";
import { CtaEditModal } from "@/components/website-builder/modals/CtaEditModal";
import { FooterEditModal } from "@/components/website-builder/modals/FooterEditModal";
import { logToSupabase } from "@/utils/batchedLogManager";
import { loadImagesFromStorage } from "@/utils/storageImageLoader";
import { TheraLoader } from "@/components/ui/TheraLoader";

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
  draft_customization_data: any;
  has_unpublished_changes: boolean;
  is_published: boolean;
}

export default function WebsiteBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [website, setWebsite] = useState<CoachWebsite | null>(null);
  const [customizationData, setCustomizationData] = useState<any>({});
  const [userSlug, setUserSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [openModal, setOpenModal] = useState<string | null>(null);

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

      // Load user's slug from api_keys
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('slug_coach')
        .eq('user_id', user.id)
        .single();

      if (apiKeyData?.slug_coach) {
        setUserSlug(apiKeyData.slug_coach);
      } else {
        // Generate slug from email if not found in api_keys
        const fallbackSlug = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'coach';
        setUserSlug(fallbackSlug);
      }

      // Load existing website
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('*')
        .eq('coach_id', user.id)
        .single();

      if (websiteData) {
        setWebsite(websiteData);
        // Use draft data for editing, fallback to published data if draft is empty
        const draftData = websiteData.draft_customization_data || websiteData.customization_data || {};
        setCustomizationData(draftData);
        
        // Find and set the selected template by UUID
        const template = templatesData?.find(t => t.id === websiteData.template_id);
        if (template) {
          setSelectedTemplate(template);
          console.log("Loaded existing template:", { id: template.id, name: template.name });
        }
      } else {
        // No existing website, load images from storage only if no saved customization exists
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
      
      // Only populate if we don't already have customization data
      // This prevents overriding user's intentional deletions
      setCustomizationData(prev => {
        const updated = { ...prev };
        
        // Only restore if not explicitly set to null/empty and not already configured
        if (storageImages.headerImageUrl && !updated.headerImageData && !updated.headerImageUrl) {
          updated.headerImageData = {
            url: storageImages.headerImageUrl,
            filePath: `${user.id}/header/${storageImages.headerImageUrl.split('/').pop()}`
          };
        }
        
        if (storageImages.aboutImageUrl && !updated.aboutImageData && !updated.aboutImageUrl) {
          updated.aboutImageData = {
            url: storageImages.aboutImageUrl,
            filePath: `${user.id}/about/${storageImages.aboutImageUrl.split('/').pop()}`
          };
        }
        
        // Handle service images more carefully
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
            // Only restore if not already configured
            if (!updated.services[serviceIndex].imageData && !updated.services[serviceIndex].imageUrl) {
              updated.services[serviceIndex].imageData = {
                url: imageUrl,
                filePath: `${user.id}/service/${serviceIndex}/${imageUrl.split('/').pop()}`
              };
            }
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
    console.log("Template selected:", { id: template.id, name: template.name });
    setSelectedTemplate(template);
    
    // Set default customization data if no existing website
    if (!website) {
      const defaultData = {
        coachName: user?.email?.split('@')[0] || 'Your Name',
        tagline: template.template_data?.defaultContent?.hero?.subtitle || 'Professional Coach',
        bio: 'I help people transform their lives through personalized coaching.',
        introTitle: 'About Me',
        introAlignment: 'left' as const,
        introFontStyle: 'modern',
        introTextColor: '#374151',
        reportService: {
          title: 'Personal Insights Report',
          description: 'Get a comprehensive analysis of your personality, strengths, and growth opportunities.',
          price: '$29',
          sectionHeading: 'Services Offered'
        },
        services: [
          { title: 'Life Coaching', description: '1-on-1 sessions to help you achieve your goals', price: '$150/session' },
          { title: 'Career Coaching', description: 'Navigate your career path with confidence', price: '$120/session' }
        ],
        buttonText: 'Book a Consultation',
        buttonColor: '#3B82F6',
        buttonTextColor: '#FFFFFF',
        buttonFontFamily: 'Inter',
        buttonStyle: 'bordered' as const,
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
    setCustomizationData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user || !selectedTemplate) {
      console.error("Cannot save: missing user or selectedTemplate", { 
        hasUser: !!user, 
        hasSelectedTemplate: !!selectedTemplate,
        templateId: selectedTemplate?.id 
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing user or template data"
      });
      return;
    }

    console.log("Saving draft with template ID:", selectedTemplate.id);
    setIsSaving(true);

    try {
      if (website) {
        // Update existing website draft
        const { error } = await supabase
          .from('coach_websites')
          .update({
            template_id: selectedTemplate.id,
            draft_customization_data: customizationData,
            has_unpublished_changes: true
          })
          .eq('id', website.id);

        if (error) throw error;
        
        // Update local state
        setWebsite(prev => prev ? {
          ...prev,
          template_id: selectedTemplate.id,
          draft_customization_data: customizationData,
          has_unpublished_changes: true
        } : null);
        
        console.log("Draft saved successfully");
      } else {
        // Create new website with draft data
        const { data, error } = await supabase
          .from('coach_websites')
          .insert({
            coach_id: user.id,
            template_id: selectedTemplate.id,
            site_slug: userSlug,
            customization_data: {}, // Empty published data
            draft_customization_data: customizationData,
            has_unpublished_changes: true
          })
          .select()
          .single();

        if (error) throw error;
        setWebsite(data);
        console.log("Website created with draft data:", data);
      }

      toast({
        title: "Draft Saved",
        description: "Your changes have been saved as a draft."
      });

    } catch (error: any) {
      console.error("Save error:", error);
      logToSupabase("Error saving website draft", {
        level: 'error',
        page: 'WebsiteBuilder',
        data: { 
          error: error.message,
          templateId: selectedTemplate.id,
          hasUser: !!user 
        }
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

  const handlePublish = async () => {
    if (!user || !selectedTemplate) {
      console.log("Missing user or selectedTemplate", { user: !!user, selectedTemplate: !!selectedTemplate });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a template before publishing."
      });
      return;
    }

    console.log("Starting publish process...");
    setIsPublishing(true);
    try {
      // Always save draft before publishing
      console.log("Saving draft before publish...");
      await handleSave();
      
      console.log("Opening publish modal...");
      setShowPublishModal(true);
    } catch (error: any) {
      console.error("Error during publish:", error);
      toast({
        variant: "destructive",
        title: "Publishing Failed",
        description: error.message || "There was an error preparing your website for publishing."
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a template to preview."
      });
      return;
    }

    try {
      // Generate a unique preview ID
      const previewId = Date.now().toString();
      
      // Store preview data in localStorage
      const previewData = {
        template: selectedTemplate,
        customizationData: customizationData
      };
      
      localStorage.setItem(`preview-${previewId}`, JSON.stringify(previewData));
      
      // Open preview in new tab
      const previewUrl = `/preview/${previewId}`;
      window.open(previewUrl, '_blank');
      
      // Clean up localStorage after a delay (5 minutes)
      setTimeout(() => {
        localStorage.removeItem(`preview-${previewId}`);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error opening preview:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open preview. Please try again."
      });
    }
  };

  const getPublishButtonText = () => {
    if (isPublishing) return 'Publishing...';
    if (!website) return 'Publish';
    if (website.is_published) return 'Update Site';
    return 'Publish Changes';
  };

  const getSaveButtonText = () => {
    if (isSaving) return 'Saving...';
    return 'Save Draft';
  };

  const handleOpenModal = (section: string) => {
    setOpenModal(section);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  if (isLoading) {
    return (
      <TheraLoader message="Loading Website Builder..." size="lg" />
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
    <div className="min-h-screen bg-gray-50 relative">
      {/* Full-width template preview */}
      <div className="w-full min-h-screen">
        <TemplatePreview
          template={selectedTemplate}
          customizationData={customizationData}
        />
      </div>

      {/* Floating edit buttons */}
      <FloatingEditButtons onOpenModal={handleOpenModal} />

      {/* Floating side menu */}
      <FloatingSideMenu
        onPreview={handlePreview}
        onSave={handleSave}
        onPublish={handlePublish}
        onChangeTemplate={() => setSelectedTemplate(null)}
        isSaving={isSaving}
        isPublishing={isPublishing}
        saveButtonText={getSaveButtonText()}
        publishButtonText={getPublishButtonText()}
        website={website}
      />

      {/* Edit modals */}
      <HeroEditModal
        isOpen={openModal === 'hero'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      <IntroEditModal
        isOpen={openModal === 'intro'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      <ImagesEditModal
        isOpen={openModal === 'images'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      <ServicesEditModal
        isOpen={openModal === 'services'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      <CtaEditModal
        isOpen={openModal === 'cta'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      <FooterEditModal
        isOpen={openModal === 'footer'}
        onClose={handleCloseModal}
        customizationData={customizationData}
        onChange={handleCustomizationChange}
      />

      {/* Publishing modal */}
      {showPublishModal && website && (
        <PublishingModal
          website={website}
          userSlug={userSlug}
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
