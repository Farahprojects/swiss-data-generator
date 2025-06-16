
import React from 'react';
import { ParsedBlock, ReportParser } from '@/utils/reportParser';

interface ReportRendererProps {
  content: string;
  className?: string;
}

export const ReportRenderer: React.FC<ReportRendererProps> = ({ content, className = '' }) => {
  const blocks = ReportParser.parseReport(content);

  const renderBlock = (block: ParsedBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        return (
          <h3 key={index} className="font-semibold text-gray-900 mt-6 mb-3 first:mt-0">
            {block.text}
          </h3>
        );
      
      case 'action':
        return (
          <div key={index} className="ml-4 mb-2 text-gray-700 leading-relaxed">
            {block.text}
          </div>
        );
      
      case 'tag':
        return (
          <div key={index} className="ml-4 mb-1 text-gray-600 text-sm">
            {block.text}
          </div>
        );
      
      case 'spacer':
        return <div key={index} className="mb-4" />;
      
      default: // normal paragraph
        return (
          <p key={index} className="text-gray-700 leading-relaxed mb-3">
            {block.text}
          </p>
        );
    }
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {blocks.map(renderBlock)}
    </div>
  );
};
