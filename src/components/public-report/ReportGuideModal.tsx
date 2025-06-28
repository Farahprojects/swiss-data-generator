import React from 'react';
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

interface ReportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const reportGuides = [
  {
    type: 'Essence',
    icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'They Self Report',
    price: '$25',
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
    price: '$25',
    bestFor: 'Compatibility',
    description: 'How your energy aligns with someone - connection, tension, and flow.',
    details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.',
    subTypes: [
      'Personal Sync – Romantic, emotional, or close social connection',
      'Professional Sync – Team dynamics, leadership compatibility, working styles'
    ]
  },
  {
    type: 'Mindset',
    icon: <Brain className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Mindset Report',
    price: '$3',
    bestFor: 'Mental clarity',
    description: 'Mood + mental clarity snapshot',
    details: 'Get insights into your current mental state, thought patterns, and cognitive strengths for better decision-making.'
  },
  {
    type: 'Flow',
    icon: <Repeat className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Flow Report',
    price: '$3',
    bestFor: 'Emotional rhythm',
    description: 'Creative/emotional openness over 7 days',
    details: 'Track your creative and emotional rhythms throughout the week to optimize your creative output and emotional well-being.'
  },
  {
    type: 'Focus',
    icon: <Target className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Focus Report',
    price: '$3',
    bestFor: 'Productivity',
    description: 'Best hours today for deep work or rest',
    details: 'Identify your optimal times for concentration, productivity, and rest based on your personal energy cycles.'
  },
  {
    type: 'Monthly',
    icon: <CalendarDays className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Energy Month Report',
    price: '$3',
    bestFor: 'Monthly planning',
    description: 'Your personalized forecast for the current month',
    details: 'Get monthly themes, key opportunities, and timing guidance for important decisions and activities.'
  }
];

const ReportGuideModal = ({ isOpen, onClose }: ReportGuideModalProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            Report Guide – What Each Report Gives You
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          {reportGuides.map((report) => (
            <Card key={report.type} className="border border-muted">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-primary flex items-center">
                    {report.icon}
                    {report.title}
                  </h3>
                  <span className="font-bold text-lg text-primary bg-primary/10 px-2 py-1 rounded">
                    {report.price}
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
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Still not sure? All reports provide valuable insights – choose the one that resonates most with your current needs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGuideModal;
