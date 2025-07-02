
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
import { useReportGuidePricing } from '@/hooks/useReportGuidePricing';

interface ReportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideModal = ({ isOpen, onClose, targetReportType }: ReportGuideModalProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { pricing, isLoading, formatPrice } = useReportGuidePricing();

  const reportGuides = [
    {
      type: 'Essence',
      icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Personal Insights',
      priceKey: 'essence_personal',
      bestFor: 'Self-understanding',
      isRecommended: true,
      description: 'Discover who you are and what drives you',
      details: 'Understand your core personality, decision-making style, and natural strengths. Perfect for personal growth and self-awareness.',
      subTypes: [
        'Personal – Your authentic self and emotional patterns',
        'Professional – How you work best and lead others', 
        'Relational – Your relationship style and communication needs'
      ]
    },
    {
      type: 'Sync',
      icon: <Users className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Compatibility Analysis',
      priceKey: 'sync',
      bestFor: 'Relationships',
      description: 'See how you connect with someone else',
      details: 'Analyze relationship dynamics, compatibility, and areas of harmony or challenge with another person.',
      subTypes: [
        'Personal Sync – Romantic and close relationships',
        'Professional Sync – Work partnerships and team dynamics'
      ]
    },
    {
      type: 'Monthly',
      icon: <CalendarDays className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Monthly Forecast',
      priceKey: 'monthly',
      bestFor: 'Planning ahead',
      description: 'Know the best times to act this month',
      details: 'Get personalized timing for important decisions, key opportunities, and monthly themes.'
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
          <span className="text-primary font-semibold">{parts[0]}</span>
          <span className="text-foreground"> – {parts[1]}</span>
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
      'Energy Month': 'Monthly',
      'Mindset': 'Mindset',
      'Focus': 'Focus',
      'Flow': 'Flow'
    };
    return nameToType[reportName] || reportName;
  };

  return (
    <div className="hidden md:block">
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogHeader>
            <DialogTitle className="text-3xl font-light text-center mb-2">
              Choose Your Report
            </DialogTitle>
            <p className="text-gray-600 text-center">Select the insights that matter most to you right now</p>
          </DialogHeader>

          <div className="space-y-6">
            {reportGuides.map((report) => {
              const isTargeted = targetReportType && getReportType(targetReportType) === report.type;
              const price = pricing[report.priceKey];
              
              return (
                <Card 
                  key={report.type} 
                  className={`border transition-all duration-300 relative ${
                    isTargeted 
                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
                      : report.isRecommended 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  ref={isTargeted ? targetRef : null}
                >
                  {report.isRecommended && (
                    <div className="absolute -top-3 left-6">
                      <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl text-primary flex items-center mb-1">
                          {report.icon}
                          {report.title}
                        </h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Best for {report.bestFor}
                        </span>
                      </div>
                      <span className="font-bold text-2xl text-primary">
                        {isLoading ? '...' : formatPrice(price)}
                      </span>
                    </div>

                    <p className="text-lg text-gray-700 mb-3 font-medium">
                      {report.description}
                    </p>

                    <p className="text-sm text-gray-600 mb-4">
                      {report.details}
                    </p>

                    {report.subTypes && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Report Types Included:
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {report.subTypes.map((subType, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary mr-2">•</span>
                              {formatSubType(subType)}
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

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Not sure which one? Start with Personal Insights – it&apos;s our most comprehensive report.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportGuideModal;
