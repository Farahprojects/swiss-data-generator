
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface WebsiteBuilderContextType {
  templates: WebsiteTemplate[];
  selectedTemplate: WebsiteTemplate | null;
  website: CoachWebsite | null;
  customizationData: any;
  isLoading: boolean;
  isSaving: boolean;
  setSelectedTemplate: (template: WebsiteTemplate) => void;
  updateCustomizationData: (field: string, value: any) => void;
  saveWebsite: () => Promise<void>;
  loadWebsiteData: () => Promise<void>;
}

const WebsiteBuilderContext = createContext<WebsiteBuilderContextType | null>(null);

export const useWebsiteBuilder = () => {
  const context = useContext(WebsiteBuilderContext);
  if (!context) {
    throw new Error("useWebsiteBuilder must be used within WebsiteBuilderProvider");
  }
  return context;
};

interface WebsiteBuilderProviderProps {
  children: ReactNode;
}

export const WebsiteBuilderProvider = ({ children }: WebsiteBuilderProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [website, setWebsite] = useState<CoachWebsite | null>(null);
  const [customizationData, setCustomizationData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadWebsiteData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
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
        // Set default customization data for new users
        setCustomizationData({
          coachName: user?.email?.split('@')[0] || 'Your Name',
          tagline: 'Professional Coach',
          bio: 'I help people transform their lives through personalized coaching.',
          services: [
            { title: 'Life Coaching', description: '1-on-1 sessions to help you achieve your goals', price: '$150/session' },
            { title: 'Career Coaching', description: 'Navigate your career path with confidence', price: '$120/session' }
          ],
          buttonText: 'Book a Consultation',
          themeColor: '#3B82F6',
          fontFamily: 'Inter',
          backgroundStyle: 'solid'
        });
      }

    } catch (error: any) {
      if (error.code !== 'PGRST116') { // Not found error is expected for new users
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load website builder data."
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomizationData = (field: string, value: any) => {
    setCustomizationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveWebsite = async () => {
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save website changes."
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadWebsiteData();
  }, [user]);

  const contextValue: WebsiteBuilderContextType = {
    templates,
    selectedTemplate,
    website,
    customizationData,
    isLoading,
    isSaving,
    setSelectedTemplate,
    updateCustomizationData,
    saveWebsite,
    loadWebsiteData
  };

  return (
    <WebsiteBuilderContext.Provider value={contextValue}>
      {children}
    </WebsiteBuilderContext.Provider>
  );
};
