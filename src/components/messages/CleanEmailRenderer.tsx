
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmailParser, ParsedEmailContent } from '@/utils/emailParser';

interface CleanEmailRendererProps {
  body: string;
  sentVia?: string;
  direction: 'incoming' | 'outgoing';
}

export const CleanEmailRenderer = ({ body, sentVia, direction }: CleanEmailRendererProps) => {
  const parsedContent: ParsedEmailContent = EmailParser.parseEmailContent(body);
  const formattedMainContent = EmailParser.formatText(parsedContent.mainContent);

  return (
    <div className="prose max-w-none">
      {/* Main message content */}
      <div className="text-gray-800 leading-relaxed text-base mb-6">
        {formattedMainContent.split('\n').map((paragraph, index) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return <div key={index} className="h-4" />; // Spacer for empty lines
          
          return (
            <p key={index} className="mb-3 last:mb-0">
              {trimmed}
            </p>
          );
        })}
      </div>

      {/* Via badge for sent messages */}
      {direction === 'outgoing' && sentVia && sentVia !== 'email' && (
        <div className="mb-4">
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            via {sentVia}
          </Badge>
        </div>
      )}

      {/* Quoted message section */}
      {parsedContent.quotedMessage && (
        <div className="border-l-3 border-gray-300 pl-4 mt-6 text-sm text-gray-600 bg-gray-50 py-3 rounded-r">
          <div className="font-semibold text-gray-700 mb-2">
            --- Original Message ---
          </div>
          
          <div className="space-y-1 mb-3 text-xs">
            <div>
              <span className="font-medium text-gray-700">From:</span> {parsedContent.quotedMessage.from}
            </div>
            {parsedContent.quotedMessage.date && (
              <div>
                <span className="font-medium text-gray-700">Date:</span> {parsedContent.quotedMessage.date}
              </div>
            )}
            {parsedContent.quotedMessage.subject && (
              <div>
                <span className="font-medium text-gray-700">Subject:</span> {parsedContent.quotedMessage.subject}
              </div>
            )}
          </div>

          <div className="text-gray-600 leading-relaxed">
            {parsedContent.quotedMessage.content.split('\n').map((line, index) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={index} className="h-2" />;
              
              return (
                <p key={index} className="mb-2 last:mb-0">
                  {trimmed}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
