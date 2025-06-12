
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface ReportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const reportGuides = [
  {
    type: 'Essence',
    title: 'Essence Report',
    price: '$25',
    description: 'A deep snapshot of who you are and what life\'s asking from you right now.',
    details: 'Discover your core personality traits, natural gifts, and current life themes. Perfect for self-reflection and understanding your authentic self.'
  },
  {
    type: 'Sync',
    title: 'Sync Report',
    price: '$25',
    description: 'How your energy aligns with someone - connection, tension, and flow.',
    details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.'
  },
  {
    type: 'Mindset',
    title: 'Mindset Report',
    price: '$3',
    description: 'Mood + mental clarity snapshot',
    details: 'Get insights into your current mental state, thought patterns, and cognitive strengths for better decision-making.'
  },
  {
    type: 'Flow',
    title: 'Flow Report',
    price: '$3',
    description: 'Creative/emotional openness over 7 days',
    details: 'Track your creative and emotional rhythms throughout the week to optimize your creative output and emotional well-being.'
  },
  {
    type: 'Focus',
    title: 'Focus Report',
    price: '$3',
    description: 'Best hours today for deep work or rest',
    details: 'Identify your optimal times for concentration, productivity, and rest based on your personal energy cycles.'
  },
  {
    type: 'Monthly',
    title: 'Monthly Report',
    price: '$3',
    description: 'Your personalized forecast for the current month',
    details: 'Get monthly themes, key opportunities, and timing guidance for important decisions and activities.'
  }
];

const ReportGuideModal = ({ isOpen, onClose }: ReportGuideModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            Report Guide - What Each Report Gives You
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4">
          {reportGuides.map((report) => (
            <Card key={report.type} className="border border-muted">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-primary">
                    {report.title}
                  </h3>
                  <span className="font-bold text-lg text-primary bg-primary/10 px-2 py-1 rounded">
                    {report.price}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 italic">
                  "{report.description}"
                </p>
                <p className="text-sm">
                  {report.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Still not sure? All reports provide valuable insights - choose the one that resonates most with your current needs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGuideModal;
