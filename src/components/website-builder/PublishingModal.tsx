
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Copy, CheckCircle } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";

interface CoachWebsite {
  id: string;
  site_slug: string;
  is_published: boolean;
}

interface PublishingModalProps {
  website: CoachWebsite;
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
  const [customSlug, setCustomSlug] = useState(userSlug || website.site_slug);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const websiteUrl = `https://theraiastro.com/${customSlug}`;

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      // Update coach_websites table
      const { error: websiteError } = await supabase
        .from('coach_websites')
        .update({
          site_slug: customSlug,
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', website.id);

      if (websiteError) throw websiteError;

      // Update api_keys table to sync the slug
      const { error: apiKeyError } = await supabase
        .from('api_keys')
        .update({
          slug_coach: customSlug
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (apiKeyError) {
        console.warn('Failed to update api_keys slug:', apiKeyError);
        // Don't throw here as the website is already published
      }

      logToSupabase("Website published successfully", {
        level: 'info',
        page: 'PublishingModal',
        data: { websiteId: website.id, slug: customSlug }
      });

      toast({
        title: "Website Published!",
        description: `Your website is now live at ${websiteUrl}`,
      });

      onPublished();
      
    } catch (error: any) {
      logToSupabase("Error publishing website", {
        level: 'error',
        page: 'PublishingModal',
        data: { error: error.message }
      });
      
      toast({
        variant: "destructive",
        title: "Publishing Failed",
        description: "There was an error publishing your website. Please try again."
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      setCopiedUrl(true);
      toast({
        title: "URL Copied",
        description: "Website URL has been copied to clipboard"
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard"
      });
    }
  };

  const validateSlug = (slug: string) => {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
  };

  const isValidSlug = validateSlug(customSlug);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>{website.is_published ? 'Update Website' : 'Publish Website'}</span>
          </DialogTitle>
          <DialogDescription>
            {website.is_published 
              ? 'Update your live website settings'
              : 'Make your coaching website live for the world to see'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="slug">Website URL</Label>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">theraiastro.com/</span>
              <Input
                id="slug"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-name"
                className={!isValidSlug ? 'border-red-300' : ''}
              />
            </div>
            {!isValidSlug && (
              <p className="text-sm text-red-600 mt-1">
                URL must be 3-50 characters, letters, numbers, and hyphens only
              </p>
            )}
          </div>

          {website.is_published && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Currently Live</p>
                  <p className="text-sm text-green-600 break-all">{websiteUrl}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="flex items-center space-x-1"
                >
                  {copiedUrl ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens when you publish?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your website becomes accessible to everyone</li>
              <li>• You'll receive a confirmation email with the live link</li>
              <li>• You can update your content anytime</li>
              <li>• SEO optimized for search engines</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!isValidSlug || isPublishing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPublishing ? 'Publishing...' : website.is_published ? 'Update Site' : 'Publish Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
