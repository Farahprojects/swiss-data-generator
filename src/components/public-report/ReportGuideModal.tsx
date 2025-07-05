
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
  UserCircle,
  Users,
  Brain,
  Repeat,
  Target,
  CalendarDays,
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
        case 'monthly': priceId = 'monthly'; break;
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

  const reportGuides = [
    {
      type: 'TheSelf',
      icon: <UserCircle className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'The Self',
      price: getBasePrice('TheSelf'),
      bestFor: 'Self-understanding',
      isRecommended: true,
      description: 'A deep snapshot of who you are and what life\'s asking from you right now.',
      details: 'Discover your core personality traits, natural gifts, and current life themes. Perfect for self-reflection and understanding your authentic self.',
      subTypes: [
        'Personal – Discover insights about your identity, emotions, and natural strengths.',
        'Professional – Understand your career path, purpose, and ambition patterns.',
        'Relational – Explore how you connect, love, and grow with others.'
      ]
    },
    {
      type: 'Compatibility',
      icon: <Users className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Compatibility',
      price: getBasePrice('Compatibility'),
      bestFor: 'Compatibility',
      description: 'How your energy aligns with someone - connection, tension, and flow.',
      details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.',
      subTypes: [
        'Personal – Compare your chart with a partner or friend to explore chemistry and differences.',
        'Professional – Map out collaboration dynamics and working relationships.'
      ]
    },
    {
      type: 'AstroData',
      icon: <Target className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Astro Data',
      price: getBasePrice('AstroData'),
      bestFor: 'Raw Data',
      description: 'Raw planetary data and alignments with no interpretation',
      details: 'Get the pure astronomical data and chart information without analysis or commentary.',
      subTypes: [
        'The Self – Raw planetary data and alignments tailored to you.',
        'Compatibility – Synastry and composite charts with no interpretation.'
      ]
    },
    {
      type: 'SnapShot',
      icon: <CalendarDays className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'SnapShot',
      price: getBasePrice('SnapShot'),
      bestFor: 'Timing insights',
      description: 'Your personalized forecast and timing guidance',
      details: 'Get focused insights on current energies, mental patterns, and monthly themes.',
      subTypes: [
        'Focus – A quick energetic check-in on where your attention naturally flows.',
        'Mindset – See how your thinking patterns are currently influenced.',
        'Monthly – A real-time look at how the stars are shaping your month.'
      ]
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
    <div className="hidden md:block">
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <DialogClose className="absolute right-6 top-6 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl md:text-5xl font-light text-gray-900 text-center mb-4 tracking-tight">
              Choose Your Report
            </DialogTitle>
            <p className="text-gray-500 text-center leading-relaxed">Select the insights that matter most to you right now</p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {reportGuides.map((report) => {
              const isTargeted = targetReportType && getReportType(targetReportType) === report.type;
              
              return (
                <div key={report.type} className="relative">
                  {report.isRecommended && (
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
                        : report.isRecommended 
                        ? 'border-gray-300 bg-gray-50/30 shadow-md' 
                        : 'border-gray-200/50 bg-white/80 backdrop-blur-sm'
                    }`}
                    ref={isTargeted ? targetRef : null}
                  >
                  
                  <CardContent className="p-10 min-h-[420px]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-medium text-2xl text-gray-900 flex items-center mb-3 tracking-tight">
                          {report.icon}
                          {report.title}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100/60 px-3 py-1.5 rounded-full font-light">
                          Best for {report.bestFor}
                        </span>
                      </div>
                      <span className="font-light text-3xl text-gray-900">
                        {report.price}
                      </span>
                    </div>

                    <p className="text-lg text-gray-700 mb-4 font-light leading-relaxed">
                      {report.description}
                    </p>

                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      {report.details}
                    </p>

                    {report.subTypes && (
                      <div className="border-t border-gray-200/50 pt-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-4 tracking-wide uppercase">
                          Choose Your Focus:
                        </h4>
                        <ul className="space-y-3 text-sm">
                          {report.subTypes.map((subType, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-gray-400 mr-3 mt-1.5">•</span>
                              <div className="leading-relaxed flex-1">{formatSubType(subType)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 font-light">
              Not sure which one? Start with The Self – it's our most comprehensive report.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportGuideModal;
