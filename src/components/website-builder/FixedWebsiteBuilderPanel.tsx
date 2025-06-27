
import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Globe } from 'lucide-react';

interface FixedWebsiteBuilderPanelProps {
  onPreview: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
}

export const FixedWebsiteBuilderPanel: React.FC<FixedWebsiteBuilderPanelProps> = ({
  onPreview,
  onPublish,
  isPublishing = false
}) => {
  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-16 bg-white border-r border-gray-200 z-40 flex flex-col items-center py-4 space-y-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreview}
        className="w-12 h-12 rounded-lg hover:bg-gray-100"
        title="Preview"
      >
        <Eye className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onPublish}
        disabled={isPublishing}
        className="w-12 h-12 rounded-lg hover:bg-gray-100"
        title={isPublishing ? "Publishing..." : "Publish"}
      >
        {isPublishing ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        ) : (
          <Globe className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};
