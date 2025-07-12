
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";

interface PublishingModalProps {
  website: {
    id: string;
    site_slug: string;
    is_published: boolean;
    draft_customization_data: any;
    customization_data: any;
    has_unpublished_changes: boolean;
  };
  userSlug: string;
  onClose: () => void;
  onPublished: () => void;
}

export const PublishingModal: React.FC<PublishingModalProps> = ({
  website,
  userSlug,
  onClose,
  onPublished
}) => {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const websiteUrl = `${window.location.origin}/coach/${website.site_slug}`;

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      console.log("Publishing website...", { websiteId: website.id });
      
      // Copy draft data to published data and mark as published
      const { error } = await supabase
        .from('coach_websites')
        .update({
          customization_data: website.draft_customization_data || website.customization_data,
          is_published: true,
          has_unpublished_changes: false,
          published_at: new Date().toISOString()
        })
        .eq('id', website.id);

      if (error) {
        console.error("Publish error:", error);
        throw error;
      }

      console.log("Website published successfully");
      
      setIsPublished(true);
      
      toast({
        title: "Website Published! 🎉",
        description: "Your coaching website is now live and accessible to visitors."
      });

      logToSupabase("Website published successfully", {
        level: 'info',
        page: 'PublishingModal',
        data: { 
          websiteId: website.id,
          slug: website.site_slug,
          url: websiteUrl
        }
      });

    } catch (error: any) {
      console.error("Publishing failed:", error);
      
      logToSupabase("Website publishing failed", {
        level: 'error',
        page: 'PublishingModal',
        data: { 
          error: error.message,
          websiteId: website.id,
          slug: website.site_slug
        }
      });
      
      toast({
        variant: "destructive",
        title: "Publishing Failed",
        description: error.message || "There was an error publishing your website. Please try again."
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(websiteUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast({
      title: "URL Copied",
      description: "Website URL has been copied to your clipboard."
    });
  };

  const openWebsite = () => {
    window.open(websiteUrl, '_blank');
  };

  const handleClose = () => {
    onClose();
    if (isPublished) {
      onPublished();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <span>
              {isPublished ? "Website Published!" : "Publish Your Website"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isPublished ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your website is now live! 🎉
                </h3>
                <p className="text-gray-600 text-sm">
                  Your coaching website has been published and is accessible to visitors.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                {website.is_published 
                  ? "Update your live website with the latest changes?"
                  : "Ready to make your coaching website live? This will publish your current draft and make it accessible to visitors."
                }
              </p>
              
              {website.has_unpublished_changes && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 text-sm">
                    <span className="font-medium">Note:</span> You have unpublished changes that will go live when you publish.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Website URL:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={websiteUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyUrl}
                className="shrink-0"
              >
                {urlCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!isPublished ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isPublishing ? "Publishing..." : website.is_published ? "Update Site" : "Publish Website"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={openWebsite}
                  className="flex-1 flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Website</span>
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1"
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
