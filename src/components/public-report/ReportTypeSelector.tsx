
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { ReportType } from '@/pages/PublicReport';

interface ReportTypeSelectorProps {
  reportTypes: ReportType[];
  onSelect: (report: ReportType) => void;
}

export const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
  reportTypes,
  onSelect
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {reportTypes.map((report) => (
        <Card 
          key={report.id} 
          className={`relative transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer ${
            report.popular ? 'ring-2 ring-primary ring-opacity-50' : ''
          }`}
          onClick={() => onSelect(report)}
        >
          {report.popular && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
              Most Popular
            </Badge>
          )}
          
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                {report.icon}
              </div>
            </div>
            <CardTitle className="text-xl">{report.name}</CardTitle>
            <CardDescription className="text-sm">
              {report.description}
            </CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold text-primary">
                ${report.price}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <ul className="space-y-3 mb-6">
              {report.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full" 
              size="lg"
              variant={report.popular ? "default" : "outline"}
            >
              Select {report.name}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
