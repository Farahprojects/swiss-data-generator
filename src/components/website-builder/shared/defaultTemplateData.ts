
import { CustomizationData } from "@/types/website-builder";
import { getFontStyleByName } from "@/utils/fontRegistry";

export const getDefaultTemplateData = (templateName: string, themeColor?: string): CustomizationData => {
  const defaultThemeColor = themeColor || getDefaultThemeColor(templateName);
  const fontStyle = getFontStyleByName('modern');
  
  return {
    coachName: 'Sarah Johnson',
    tagline: 'Transform Your Life with Professional Coaching',
    bio: 'I help ambitious professionals break through barriers, unlock their potential, and create the life they truly desire through personalized coaching strategies.',
    introTitle: 'About Me',
    introAlignment: 'left' as const,
    introFontStyle: 'modern',
    introTextColor: '#374151',
    heroFontStyle: 'modern',
    heroTextColor: '#1F2937',
    heroAlignment: 'left' as const,
    services: [
      { 
        title: 'Life Coaching', 
        description: 'One-on-one sessions to help you achieve your personal and professional goals',
        price: '$150/session' 
      },
      { 
        title: 'Career Coaching', 
        description: 'Navigate your career path with confidence and strategic planning',
        price: '$120/session' 
      },
      { 
        title: 'Leadership Development', 
        description: 'Develop your leadership skills and executive presence',
        price: '$200/session' 
      }
    ],
    reportService: {
      title: 'Personal Insights Report',
      description: 'Get a comprehensive analysis of your personality, strengths, and growth opportunities.',
      price: '$29',
      sectionHeading: 'Services Offered'
    },
    buttonText: 'Book a Consultation',
    buttonColor: defaultThemeColor,
    buttonTextColor: '#FFFFFF',
    buttonFontFamily: fontStyle.value,
    buttonStyle: 'bordered' as const,
    themeColor: defaultThemeColor,
    fontFamily: fontStyle.value,
    backgroundStyle: 'solid',
    footerHeading: 'Ready to Transform Your Life?',
    footerSubheading: 'Schedule your consultation today and take the first step towards achieving your goals.'
  };
};

export const getDefaultThemeColor = (templateName: string): string => {
  switch (templateName.toLowerCase()) {
    case 'modern':
      return '#6366F1';
    case 'classic':
      return '#8B5CF6';
    case 'minimal':
      return '#10B981';
    case 'creative':
      return '#F59E0B';
    case 'professional':
      return '#1E40AF';
    case 'abstract':
      return '#6B46C1';
    default:
      return '#3B82F6';
  }
};

export const mergeWithDefaults = (customizationData: any, templateName: string): CustomizationData => {
  const defaults = getDefaultTemplateData(templateName);
  
  // Deep merge, preserving user data but filling in missing fields with defaults
  return {
    ...defaults,
    ...customizationData,
    // Ensure services array has proper defaults
    services: customizationData?.services?.length > 0 
      ? customizationData.services 
      : defaults.services,
    // Ensure report service has proper defaults
    reportService: customizationData?.reportService 
      ? { ...defaults.reportService, ...customizationData.reportService }
      : defaults.reportService
  };
};
