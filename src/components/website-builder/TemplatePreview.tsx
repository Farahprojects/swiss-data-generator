
import { motion } from "framer-motion";
import { X, Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

interface TemplatePreviewProps {
  template: any;
  customizationData: any;
  isFullScreen?: boolean;
  onClose?: () => void;
}

type PreviewSize = 'desktop' | 'tablet' | 'mobile';

export const TemplatePreview = ({ 
  template, 
  customizationData, 
  isFullScreen = false, 
  onClose 
}: TemplatePreviewProps) => {
  const [previewSize, setPreviewSize] = useState<PreviewSize>('desktop');

  const previewUrl = useMemo(() => {
    const templateType = template?.template_data?.layout || 'modern';
    const encodedData = encodeURIComponent(JSON.stringify(customizationData));
    return `/template-preview?template=${templateType}&data=${encodedData}`;
  }, [template, customizationData]);

  const getPreviewDimensions = () => {
    switch (previewSize) {
      case 'desktop':
        return { width: '100%', height: '600px', scale: 1 };
      case 'tablet':
        return { width: '768px', height: '600px', scale: 0.8 };
      case 'mobile':
        return { width: '375px', height: '600px', scale: 0.7 };
      default:
        return { width: '100%', height: '600px', scale: 1 };
    }
  };

  const dimensions = getPreviewDimensions();

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
          <div className="flex items-center bg-white rounded-lg shadow-lg border p-1">
            <Button
              variant={previewSize === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewSize('desktop')}
              className="p-2"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewSize === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewSize('tablet')}
              className="p-2"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={previewSize === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewSize('mobile')}
              className="p-2"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="bg-white shadow-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-full flex items-center justify-center p-8 pt-16">
          <div 
            className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              transform: `scale(${dimensions.scale})`,
              transformOrigin: 'center center'
            }}
          >
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Template Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
      <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={previewSize === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewSize('desktop')}
            className="p-1 h-6 w-6"
          >
            <Monitor className="h-3 w-3" />
          </Button>
          <Button
            variant={previewSize === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewSize('mobile')}
            className="p-1 h-6 w-6"
          >
            <Smartphone className="h-3 w-3" />
          </Button>
          <div className="text-xs text-gray-500 ml-2">Preview</div>
        </div>
      </div>
      
      <div className="flex justify-center p-4 bg-gray-50">
        <div 
          className="bg-white rounded shadow-lg overflow-hidden transition-all duration-300"
          style={{ 
            width: previewSize === 'mobile' ? '200px' : '320px',
            height: '240px'
          }}
        >
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Template Preview"
            sandbox="allow-same-origin allow-scripts"
            style={{ 
              transform: previewSize === 'mobile' ? 'scale(0.53)' : 'scale(0.33)',
              transformOrigin: 'top left',
              width: previewSize === 'mobile' ? '377px' : '970px',
              height: '727px'
            }}
          />
        </div>
      </div>
    </div>
  );
};
