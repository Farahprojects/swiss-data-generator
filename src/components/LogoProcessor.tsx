import { useEffect, useState } from 'react';
import { processLogoWithTransparentBackground } from '@/utils/processLogo';
import { useToast } from '@/hooks/use-toast';

export const LogoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transparentLogoUrl, setTransparentLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleProcessLogo = async () => {
    setIsProcessing(true);
    try {
      const url = await processLogoWithTransparentBackground();
      setTransparentLogoUrl(url);
      toast({
        title: "Success!",
        description: "Logo processed with transparent background",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process logo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-process on mount
  useEffect(() => {
    handleProcessLogo();
  }, []);

  if (isProcessing) {
    return (
      <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Processing logo...</span>
        </div>
      </div>
    );
  }

  if (transparentLogoUrl) {
    return (
      <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-sm">Logo processed successfully!</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          New URL: {transparentLogoUrl}
        </div>
      </div>
    );
  }

  return null;
};