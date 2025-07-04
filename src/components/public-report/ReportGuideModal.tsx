
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
import { usePriceFetch } from '@/hooks/usePriceFetch';

interface ReportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideModal = ({ isOpen, onClose, targetReportType }: ReportGuideModalProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { getReportPrice } = usePriceFetch();
  
  const formatPrice = (price: number) => `$${Math.round(price)}`;
  
  const getPrice = (reportType: string, subType?: string) => {
    const formData = { reportType, essenceType: subType, relationshipType: subType };
    return getReportPrice(formData);
  };

  const getSubTypesWithPricing = (type: string) => {
    switch (type) {
      case 'Essence':
        return [
          `Personal – Your authentic self and emotional patterns (${formatPrice(getPrice('essence', 'personal'))})`,
          `Professional – How you work best and lead others (${formatPrice(getPrice('essence', 'professional'))})`,
          `Relational – Your relationship style and communication needs (${formatPrice(getPrice('essence', 'relational'))})`
        ];
      case 'Sync':
        return [
          `Personal Sync – Romantic and close relationships (${formatPrice(getPrice('sync', 'personal'))})`,
          `Professional Sync – Work partnerships and team dynamics (${formatPrice(getPrice('sync', 'professional'))})`
        ];
      case 'Snapshots':
        return [
          `Focus – Best hours for deep work or rest today (${formatPrice(getPrice('focus'))})`,
          `Mindset – Current mental clarity and cognitive strengths (${formatPrice(getPrice('mindset'))})`,
          `Monthly – Personal forecast for the current month (${formatPrice(getPrice('monthly'))})`
        ];
      case 'AstroData':
        return [
          `Essence Data – Complete personality chart calculations (${formatPrice(getPrice('essence'))})`,
          `Sync Data – Relationship compatibility calculations (${formatPrice(getPrice('sync'))})`
        ];
      default:
        return [];
    }
  };

  const reportGuides = [
    {
      type: 'Essence',
      icon: <UserCircle className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Personal Insights',
      priceKey: 'essence_personal',
      bestFor: 'Self-understanding',
      isRecommended: true,
      description: 'Discover who you are and what drives you',
      details: 'Understand your core personality, decision-making style, and natural strengths. Perfect for personal growth and self-awareness.',
      subTypes: getSubTypesWithPricing('Essence')
    },
    {
      type: 'Sync',
      icon: <Users className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Compatibility Analysis',
      priceKey: 'sync_personal',
      bestFor: 'Relationships',
      description: 'See how you connect with someone else',
      details: 'Analyze relationship dynamics, compatibility, and areas of harmony or challenge with another person.',
      subTypes: getSubTypesWithPricing('Sync')
    },
    {
      type: 'Snapshots',
      icon: <CalendarDays className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Snapshot Reports',
      priceKey: 'focus',
      bestFor: 'Quick insights',
      description: 'Fast, focused insights for daily life',
      details: 'Get quick snapshots of your mental state, focus times, and emotional rhythms.',
      subTypes: getSubTypesWithPricing('Snapshots')
    },
    {
      type: 'AstroData',
      icon: <Brain className="h-6 w-6 text-gray-700 inline-block mr-2" />,
      title: 'Astro Data',
      priceKey: 'essence',
      bestFor: 'Raw astrological data',
      description: 'Pure astrological calculations and data',
      details: 'Access precise birth chart calculations, planetary positions, and astrological house data.',
      subTypes: getSubTypesWithPricing('AstroData')
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
      // Check if there's a price in parentheses
      const priceMatch = parts[1].match(/^(.*)\s+\((\$\d+)\)$/);
      if (priceMatch) {
        return (
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-gray-900 font-medium">{parts[0]}</span>
              <span className="text-gray-600"> – {priceMatch[1]}</span>
            </div>
            <span className="text-lg font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded ml-3">
              {priceMatch[2]}
            </span>
          </div>
        );
      }
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
      'The Self': 'Essence',
      'Compatibility': 'Sync',
      'Energy Month': 'Snapshots',
      'Mindset': 'Snapshots',
      'Focus': 'Snapshots',
      'Flow': 'Snapshots'
    };
    return nameToType[reportName] || reportName;
  };

  return (
    <div className="hidden md:block">
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reportGuides.map((report) => {
              const isTargeted = targetReportType && getReportType(targetReportType) === report.type;
              const price = getPrice(report.type === 'Essence' ? 'essence' : 'sync', 'personal');
              
              return (
                <Card 
                  key={report.type} 
                  className={`border transition-all duration-300 relative overflow-hidden group hover:shadow-lg hover:border-gray-300/60 ${
                    isTargeted 
                      ? 'border-gray-400 bg-gray-50/50 shadow-lg ring-2 ring-gray-300/30' 
                      : report.isRecommended 
                      ? 'border-gray-300 bg-gray-50/30 shadow-md' 
                      : 'border-gray-200/50 bg-white/80 backdrop-blur-sm'
                  }`}
                  ref={isTargeted ? targetRef : null}
                >
                  {report.isRecommended && (
                    <div className="absolute -top-3 left-8">
                      <span className="bg-gray-900 text-white text-xs px-4 py-1.5 rounded-full font-medium tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <CardContent className="p-8">
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
                      {(report.type === 'Essence' || report.type === 'Sync') && (
                        <span className="font-light text-3xl text-gray-900">
                          {formatPrice(price)}
                        </span>
                      )}
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
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 font-light">
              Not sure which one? Start with Personal Insights – it's our most comprehensive report.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportGuideModal;
