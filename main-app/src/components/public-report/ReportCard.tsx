
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ReportCardProps {
  type: string;
  icon: React.ReactNode;
  title: string;
  price: string;
  bestFor: string;
  description: string;
  details: string;
  subTypes?: string[];
}

const ReportCard = ({ 
  type, 
  icon, 
  title, 
  price, 
  bestFor, 
  description, 
  details, 
  subTypes 
}: ReportCardProps) => {
  const formatSubType = (subType: string) => {
    const parts = subType.split(' – ');
    if (parts.length === 2) {
      return (
        <>
                          <span className="text-gray-900 font-normal">{parts[0]}</span>
          <span className="text-foreground"> – {parts[1]}</span>
        </>
      );
    }
    return subType;
  };

  return (
    <Card className="border border-muted h-full">
      <CardContent className="p-6 space-y-3">
        <div className="flex justify-between items-start">
                          <h3 className="font-normal text-lg text-gray-900 flex items-center">
            {icon}
            {title}
          </h3>
                          <span className="font-normal text-lg text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {price}
          </span>
        </div>

                        <span className="text-xs text-white bg-gray-900 px-2 py-0.5 rounded-full inline-block w-fit">
          Best for {bestFor}
        </span>

        <p className="text-sm text-muted-foreground italic">
          "{description}"
        </p>

        <p className="text-sm text-foreground">
          {details}
        </p>

        {subTypes && (
          <div>
                            <h4 className="text-sm font-normal text-muted-foreground mt-2 mb-1">
              Included Report Styles
            </h4>
            <ul className="space-y-1 pl-4 list-disc text-sm">
              {subTypes.map((subType, index) => (
                <li key={index}>{formatSubType(subType)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportCard;
