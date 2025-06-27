import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { TemplateSelector } from "@/components/website-builder/TemplateSelector";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { PublishingModal } from "@/components/website-builder/PublishingModal";
import { AutoSaveIndicator } from "@/components/website-builder/AutoSaveIndicator";
import { TemplateSwitchConfirmDialog } from "@/components/website-builder/TemplateSwithConfirmDialog";
import { FixedWebsiteBuilderPanel } from "@/components/website-builder/FixedWebsiteBuilderPanel";
import { HeroEditModal } from "@/components/website-builder/modals/HeroEditModal";
import { IntroEditModal } from "@/components/website-builder/modals/IntroEditModal";
import { ImagesEditModal } from "@/components/website-builder/modals/ImagesEditModal";
import { ServicesEditModal } from "@/components/website-builder/modals/ServicesEditModal";
import { CtaEditModal } from "@/components/website-builder/modals/CtaEditModal";
import { FooterEditModal } from "@/components/website-builder/modals/FooterEditModal";
import { logToSupabase } from "@/utils/batchedLogManager";
import { loadImagesFromStorage } from "@/utils/storageImageLoader";
import { TheraLoader } from "@/components/ui/TheraLoader";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [website, setWebsite] = useState<CoachWebsite | null>(null);
  const [customizationData, setCustomizationData] = useState<any>({});
  const [userSlug, setUserSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showTemplateSwitchDialog, setShowTemplateSwitchDialog] = useState(false);

  useEffect(() => {
    loadTemplatesAndWebsite();
  }, [user]);

  // Auto-save functionality with improved change detection
  const handleAutoSave = async (data: any) => {
    if (!user || !selectedTemplate) return;

    setAutoSaveStatus('saving');
    
    try {
      if (website) {
        // Update existing website draft
        const { error } = await supabase
          .from('coach_websites')
          .update({
            template_id: selectedTemplate.id,
            draft_customization_data: data,
            has_unpublished_changes: true
          })
          .eq('id', website.id);

        if (error) throw error;
        
        // Update local state
        setWebsite(prev => prev ? {
          ...prev,
          template_id: selectedTemplate.id,
          draft_customization_data: data,
          has_unpublished_changes: true
        } : null);
      } else {
        // Create new website with draft data
        const { data: newWebsite, error } = await supabase
          .from('coach_websites')
          .insert({
            coach_id: user.id,
            template_id: selectedTemplate.id,
            site_slug: userSlug,
            customization_data: {}, // Empty published data
            draft_customization_data: data,
            has_unpublished_changes: true
          })
          .select()
          .single();

        if (error) throw error;
        setWebsite(newWebsite);
      }

      setAutoSaveStatus('saved');
      // Clear saved status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);

    } catch (error: any) {
      console.error("Auto-save error:", error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      
      logToSupabase("Error auto-saving website draft", {
        level: 'error',
        page: 'WebsiteBuilder',
        data: { 
          error: error.message,
          templateId: selectedTemplate?.id,
          hasUser: !!user 
        }
      });
    }
  };

  const { resetAutoSave, markUserInteraction } = useAutoSave({
    data: customizationData,
    onSave: handleAutoSave,
    delay: 500,
    enabled: !!selectedTemplate && !!user
  });

  // Add beforeunload protection for unpublished changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (website?.has_unpublished_changes) {
        e.preventDefault();
        e.returnValue = 'You have unpublished changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [website?.has_unpublished_changes]);

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
      resetAutoSave(); // Reset auto-save to prevent immediate save of default data
    }
  };

  const handleCustomizationChange = (field: string, value: any) => {
    // Mark that this is a user-initiated change
    markUserInteraction();
    setCustomizationData(prev => ({ ...prev, [field]: value }));
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

  const handleOpenModal = (section: string) => {
    setOpenModal(section);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  const handleChangeTemplate = () => {
    if (website?.has_unpublished_changes) {
      setShowTemplateSwitchDialog(true);
    } else {
      proceedWithTemplateChange();
    }
  };

  const proceedWithTemplateChange = () => {
    setSelectedTemplate(null);
    setCustomizationData({});
    resetAutoSave();
    setShowTemplateSwitchDialog(false);
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
    <>
      {/* Pass website builder props to UnifiedNavigation */}
      <UnifiedNavigation
        isWebsiteBuilderPageMobile={isMobile}
        onOpenModal={handleOpenModal}
        onChangeTemplate={handleChangeTemplate}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
      
      {/* Fixed left panel for desktop */}
      {!isMobile && (
        <FixedWebsiteBuilderPanel
          onPreview={handlePreview}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}
      
      <div className={`fixed inset-0 bg-gray-50 overflow-hidden flex pt-16 ${!isMobile ? 'pl-16' : ''}`}>
        {/* Auto-save indicator */}
        <AutoSaveIndicator status={autoSaveStatus} />

        {/* Main Preview Area */}
        <div className="flex-1 overflow-auto">
          <TemplatePreview
            template={selectedTemplate}
            customizationData={customizationData}
            isFullScreen={true}
          />
        </div>

        {/* Template switch confirmation dialog */}
        <TemplateSwitchConfirmDialog
          isOpen={showTemplateSwitchDialog}
          onClose={() => setShowTemplateSwitchDialog(false)}
          onConfirm={proceedWithTemplateChange}
        />

        {/* Edit modals - keep existing code (all modal components) */}
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

        {/* Publishing modal - keep existing code */}
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
    </>
  );
}
