
import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';

interface ReportContentProps {
  reportContent: string;
}

export const ReportContent = ({ reportContent }: ReportContentProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Report Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-lg max-w-none text-left">
            <ReportRenderer content={reportContent} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
