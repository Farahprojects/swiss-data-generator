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

      {/* Quoted message section */}
      {parsedContent.quotedMessage && (
        <div className="border-l-[3px] border-gray-300 pl-4 mt-8 text-sm text-gray-700">
          <div className="font-semibold text-gray-800 mb-2">
            --- Original Message ---
          </div>

          <div className="space-y-1 mb-3">
            <div>
              <span className="font-medium">From:</span>{' '}
              <span className="text-gray-600">{parsedContent.quotedMessage.from}</span>
            </div>
            {parsedContent.quotedMessage.date && (
              <div>
                <span className="font-medium">Date:</span>{' '}
                <span className="text-gray-600">{parsedContent.quotedMessage.date}</span>
              </div>
            )}
            {parsedContent.quotedMessage.subject && (
              <div>
                <span className="font-medium">Subject:</span>{' '}
                <span className="text-gray-600">{parsedContent.quotedMessage.subject}</span>
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
