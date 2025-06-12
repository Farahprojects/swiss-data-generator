
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface ReportTypeOption {
  value: string;
  title: string;
  description: string;
  features: string[];
}

const reportTypes: ReportTypeOption[] = [
  {
    value: 'natal',
    title: 'Natal Report',
    description: 'Your complete birth chart analysis revealing personality traits, strengths, and life purpose.',
    features: ['Personality insights', 'Life purpose', 'Strengths & challenges', 'Career guidance']
  },
  {
    value: 'compatibility',
    title: 'Compatibility Report',
    description: 'Discover relationship dynamics and compatibility with your partner or potential partner.',
    features: ['Relationship dynamics', 'Communication styles', 'Compatibility score', 'Growth areas']
  },
  {
    value: 'essence',
    title: 'Essence Report',
    description: 'Deep dive into your core essence and authentic self.',
    features: ['Core essence', 'Authentic self', 'Hidden talents', 'Soul purpose']
  },
  {
    value: 'flow',
    title: 'Flow Report',
    description: 'Understand your natural rhythms and optimal timing for decisions.',
    features: ['Natural rhythms', 'Decision timing', 'Energy cycles', 'Best practices']
  },
  {
    value: 'mindset',
    title: 'Mindset Report',
    description: 'Explore your mental patterns and cognitive strengths.',
    features: ['Mental patterns', 'Cognitive strengths', 'Learning style', 'Problem-solving']
  },
  {
    value: 'monthly',
    title: 'Monthly Forecast',
    description: 'Your personalized forecast for the current month.',
    features: ['Monthly themes', 'Key dates', 'Opportunities', 'Challenges to watch']
  }
];

interface ReportTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const ReportTypeSelector = ({ value, onChange, error }: ReportTypeSelectorProps) => {
  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
        {reportTypes.map((type) => (
          <div key={type.value} className="relative">
            <RadioGroupItem
              value={type.value}
              id={type.value}
              className="peer sr-only"
            />
            <Label htmlFor={type.value} className="cursor-pointer">
              <Card className="transition-colors hover:bg-muted/50 peer-checked:ring-2 peer-checked:ring-primary peer-checked:bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-4 h-4 rounded-full border-2 border-muted-foreground peer-checked:border-primary peer-checked:bg-primary flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                      <p className="text-muted-foreground mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {type.features.map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs bg-muted px-2 py-1 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
};

export default ReportTypeSelector;
