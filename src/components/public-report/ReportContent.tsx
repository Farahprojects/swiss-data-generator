
import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReportContentProps {
  reportContent: string;
}

export const ReportContent = ({ reportContent }: ReportContentProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg border-0 shadow-2xl">
        <CardHeader className="pb-6 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-xl font-light text-gray-900 tracking-tight">
            <FileText className="h-6 w-6 text-gray-600" />
            Report Content
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-left">
                <ReportRenderer content={reportContent} />
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
