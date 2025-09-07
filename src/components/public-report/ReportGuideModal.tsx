
import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import {
  MessageCircle,
  Heart,
  Brain,
  Sparkles,
  Zap,
  Clock,
} from 'lucide-react';
import { usePricing } from '@/contexts/PricingContext';
interface ReportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideModal = ({ isOpen, onClose, targetReportType }: ReportGuideModalProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { getPriceById } = usePricing();

  // Helper function to get price for a subcategory
  const getSubcategoryPrice = (reportType: string, subcategory: string): string => {
    let priceId = '';
    
    if (reportType === 'TheSelf') {
      switch (subcategory.toLowerCase()) {
        case 'personal': priceId = 'essence_personal'; break;
        case 'professional': priceId = 'essence_professional'; break;
        case 'relational': priceId = 'essence_relational'; break;
        default: priceId = 'essence_personal';
      }
    } else if (reportType === 'Compatibility') {
      switch (subcategory.toLowerCase()) {
        case 'personal': priceId = 'sync_personal'; break;
        case 'professional': priceId = 'sync_professional'; break;
        default: priceId = 'sync_personal';
      }
    } else if (reportType === 'AstroData') {
      switch (subcategory.toLowerCase()) {
        case 'the self': priceId = 'essence'; break;
        case 'compatibility': priceId = 'sync'; break;
        default: priceId = 'essence';
      }
    } else if (reportType === 'SnapShot') {
      switch (subcategory.toLowerCase()) {
        case 'focus': priceId = 'focus'; break;
        case 'mindset': priceId = 'mindset'; break;
        // monthly priceId removed
        default: priceId = 'focus';
      }
    }

    const priceData = getPriceById(priceId);
    return priceData ? `$${priceData.unit_price_usd}` : '$--';
  };

  // Helper function to get base price for a report type
  const getBasePrice = (reportType: string): string => {
    let priceId = '';
    
    switch (reportType) {
      case 'TheSelf': priceId = 'essence_personal'; break;
      case 'Compatibility': priceId = 'sync_personal'; break;
      case 'AstroData': priceId = 'essence'; break;
      case 'SnapShot': priceId = 'focus'; break;
      default: priceId = 'essence_personal';
    }

    const priceData = getPriceById(priceId);
    return priceData ? `$${priceData.unit_price_usd}` : '$--';
  };

  const chatExperiences = [
    {
      type: 'PersonalGuidance',
      icon: <MessageCircle className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Personal Guidance',
      bestFor: 'Self-discovery',
      isRecommended: true,
      description: 'Chat with AI that understands your unique planetary influences and how they shape your life',
      salesCopy: 'Unlock deep self-awareness through personalized conversations. Our AI learns how your planetary energies manifest in your daily experiences, relationships, and life decisions. Get insights that go beyond generic horoscopes – discover the specific ways cosmic influences shape your unique path.'
    },
    {
      type: 'RelationshipInsights',
      icon: <Heart className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Relationship Insights',
      bestFor: 'Connections',
      description: 'AI-powered conversations about your relationships and compatibility dynamics',
      salesCopy: 'Navigate relationships with cosmic clarity. Our AI analyzes compatibility patterns and helps you understand the energetic dynamics between you and others. Whether it\'s romantic partnerships, friendships, or professional relationships, discover how planetary influences shape your connections.'
    },
    {
      type: 'EnergeticTuning',
      icon: <Sparkles className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Energetic Tuning',
      bestFor: 'Deep understanding',
      description: 'AI that maps planetary influences to your lived experiences through conversation',
      salesCopy: 'Experience the future of astrology. Our AI doesn\'t just read your chart – it learns how planetary energies actually show up in your life through our conversation. Each chat teaches the AI more about how cosmic influences translate into your real-world experiences and decisions.'
    },
    {
      type: 'CurrentFlow',
      icon: <Zap className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Current Flow',
      bestFor: 'Present moment',
      description: 'Real-time AI guidance on your current energetic state and timing',
      salesCopy: 'Stay aligned with cosmic timing. Get real-time guidance on your current energetic state, optimal timing for decisions, and how to flow with planetary influences happening right now. Perfect for navigating daily choices with cosmic awareness.'
    }
  ];

  useEffect(() => {
    if (isOpen && targetReportType && targetRef.current) {
      // Wait for the modal to fully render before scrolling
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [isOpen, targetReportType]);

  const formatSubType = (subType: string) => {
    const parts = subType.split(' – ');
    if (parts.length === 2) {
      return (
        <>
          <span className="text-gray-900 font-medium">{parts[0]}</span>
          <span className="text-gray-600"> – {parts[1]}</span>
        </>
      );
    }
    return subType;
  };

  const getReportType = (reportName: string) => {
    // Map display names to report types
    const nameToType: { [key: string]: string } = {
      'The Self': 'TheSelf',
      'Compatibility': 'Compatibility',
      'SnapShot': 'SnapShot',
      'Astro Data': 'AstroData'
    };
    return nameToType[reportName] || reportName;
  };

  return (
    <div className="hidden sm:block">
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <DialogClose className="absolute right-6 top-6 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl lg:text-6xl font-light text-gray-900 text-center mb-6 tracking-tight">
              Start Your AI Chat
            </DialogTitle>
            <p className="text-gray-500 text-center leading-relaxed">Choose your conversation focus and begin chatting with our energetically-tuned AI</p>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-6">
            {chatExperiences.map((experience) => {
              const isTargeted = targetReportType && getReportType(targetReportType) === experience.type;
              
              return (
                <div key={experience.type} className="relative">
                  {experience.isRecommended && (
                    <div className="absolute -top-3 left-8 z-10">
                      <span className="bg-gray-900 text-white text-xs px-4 py-1.5 rounded-full font-medium tracking-wide shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <Card 
                    className={`border transition-all duration-300 relative ${
                      isTargeted 
                        ? 'border-gray-400 bg-gray-50/50 shadow-lg ring-2 ring-gray-300/30' 
                        : experience.isRecommended 
                        ? 'border-gray-300 bg-gray-50/30 shadow-md' 
                        : 'border-gray-200/50 bg-white/80 backdrop-blur-sm'
                    }`}
                    ref={isTargeted ? targetRef : null}
                  >
                  
                  <CardContent className="p-10 min-h-[420px]">
                    <div className="mb-6">
                      <div>
                        <h3 className="font-medium text-2xl text-gray-900 flex items-center mb-3 tracking-tight">
                          {experience.icon}
                          {experience.title}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100/60 px-3 py-1.5 rounded-full font-light">
                          Best for {experience.bestFor}
                        </span>
                      </div>
                    </div>

                    <p className="text-lg text-gray-700 mb-6 font-light leading-relaxed">
                      {experience.description}
                    </p>

                    <div className="border-t border-gray-200/50 pt-6">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {experience.salesCopy}
                      </p>
                    </div>
                  </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 font-light">
              Not sure which one? Start with Personal Guidance – it\'s our most comprehensive AI chat experience.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportGuideModal;
