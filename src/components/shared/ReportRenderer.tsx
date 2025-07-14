
import React from 'react';
import { ParsedBlock, ReportParser } from '@/utils/reportParser';

interface ReportRendererProps {
  content: string;
  className?: string;
}

export const ReportRenderer: React.FC<ReportRendererProps> = ({ content, className = '' }) => {
  console.log('🔍 ReportRenderer - Raw content received:', content);
  console.log('🔍 ReportRenderer - Content type:', typeof content);
  console.log('🔍 ReportRenderer - Content length:', content?.length);
  
  const blocks = ReportParser.parseReport(content);
  console.log('🔍 ReportRenderer - Parsed blocks:', blocks);
  console.log('🔍 ReportRenderer - Number of blocks:', blocks.length);

  const renderBlock = (block: ParsedBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        return (
          <h3 key={index} className="font-light text-gray-900 text-lg mt-8 mb-4 first:mt-0 tracking-tight leading-relaxed">
            {block.text}
          </h3>
        );
      
      case 'action':
        return (
          <div key={index} className="ml-6 mb-3 text-gray-700 font-light leading-relaxed text-sm">
            {block.text}
          </div>
        );
      
      case 'tag':
        return (
          <div key={index} className="ml-6 mb-2 text-gray-500 text-xs font-light tracking-wide">
            {block.text}
          </div>
        );
      
      case 'spacer':
        return <div key={index} className="mb-6" />;
      
      default: // normal paragraph
        return (
          <p key={index} className="text-gray-700 font-light leading-relaxed mb-4 text-sm">
            {block.text}
          </p>
        );
    }
  };

  return (
    <div className={`prose prose-sm max-w-none font-light ${className}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      {blocks.map(renderBlock)}
    </div>
  );
};
