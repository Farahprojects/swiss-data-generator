
import React, { useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
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

interface ReportGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideDrawer = ({ isOpen, onClose, targetReportType }: ReportGuideDrawerProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { pricing, isLoading, formatPrice } = useReportGuidePricing();

  const reportGuides = [
    {
      type: 'Essence',
      icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'The Self Report',
      priceKey: 'essence',
      bestFor: 'Self-understanding',
      description: 'A deep snapshot of who you are and what life\'s asking from you right now.',
      details: 'Discover your core personality traits, natural gifts, and current life themes. Perfect for self-reflection and understanding your authentic self.',
      subTypes: [
        'Personal – Self-awareness, emotional behavior, inner wiring',
        'Professional – How you operate at work: decision-making, productivity, and team dynamics. Useful for hiring, coaching, or leadership insight.', 
        'Relational – How you show up in relationships (patterns, openness, tension)'
      ]
    },
    {
      type: 'Sync',
      icon: <Users className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Compatibility Report',
      priceKey: 'sync',
      bestFor: 'Compatibility',
      description: 'How your energy aligns with someone - connection, tension, and flow.',
      details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.',
      subTypes: [
        'Personal Sync – Romantic, emotional, or close social connection',
        'Professional Sync – Team dynamics, leadership compatibility, working styles'
      ]
    },
    {
      type: 'Monthly',
      icon: <CalendarDays className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Energy Month Report',
      priceKey: 'monthly',
      bestFor: 'Monthly planning',
      description: 'Your personalized forecast for the current month',
      details: 'Get monthly themes, key opportunities, and timing guidance for important decisions and activities.'
    },
    {
      type: 'Mindset',
      icon: <Brain className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Mindset Report',
      priceKey: 'mindset',
      bestFor: 'Mental clarity',
      description: 'Mood + mental clarity snapshot',
      details: 'Get insights into your current mental state, thought patterns, and cognitive strengths for better decision-making.'
    },
    {
      type: 'Focus',
      icon: <Target className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Focus Report',
      priceKey: 'focus',
      bestFor: 'Productivity',
      description: 'Best hours today for deep work or rest',
      details: 'Identify your optimal times for concentration, productivity, and rest based on your personal energy cycles.'
    },
    {
      type: 'Flow',
      icon: <Repeat className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'Flow Report',
      priceKey: 'flow',
      bestFor: 'Emotional rhythm',
      description: 'Creative/emotional openness over 7 days',
      details: 'Track your creative and emotional rhythms throughout the week to optimize your creative output and emotional well-being.'
    },
  ];

  useEffect(() => {
    if (isOpen && targetReportType && targetRef.current) {
      // Wait for the drawer to fully render before scrolling
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
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
    <Drawer open={isOpen} onOpenChange={onClose} dismissible={false}>
      <DrawerContent className="h-[100dvh] max-h-[100dvh] flex flex-col rounded-none [&>div:first-child]:hidden">
        {/* Close button - positioned absolutely in top-right */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DrawerHeader className="flex-shrink-0 pt-12 pb-4">
          <DrawerTitle className="text-xl font-bold text-center">
            Report Guide – What Each Report Gives You
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ touchAction: 'pan-y' }}>
          <div className="space-y-4">
            {reportGuides.map((report) => {
              const isTargeted = targetReportType && getReportType(targetReportType) === report.type;
              const price = pricing[report.priceKey];
              
              return (
                <Card 
                  key={report.type} 
                  className={`border transition-all duration-300 ${
                    isTargeted 
                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
                      : 'border-muted'
                  }`}
                  ref={isTargeted ? targetRef : null}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-primary flex items-center">
                        {report.icon}
                        {report.title}
                      </h3>
                      <span className="font-bold text-lg text-primary bg-primary/10 px-2 py-1 rounded">
                        {isLoading ? '...' : formatPrice(price)}
                      </span>
                    </div>

                    <span className="text-xs text-white bg-primary px-2 py-0.5 rounded-full inline-block w-fit">
                      Best for {report.bestFor}
                    </span>

                    <p className="text-sm text-muted-foreground italic">
                      "{report.description}"
                    </p>

                    <p className="text-sm text-foreground">
                      {report.details}
                    </p>

                    {report.subTypes && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mt-2 mb-1">
                          Included Report Styles
                        </h4>
                        <ul className="space-y-1 pl-4 list-disc text-sm">
                          {report.subTypes.map((subType, index) => (
                            <li key={index}>{formatSubType(subType)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Still not sure? All reports provide valuable insights – choose the one that resonates most with your current needs.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ReportGuideDrawer;
