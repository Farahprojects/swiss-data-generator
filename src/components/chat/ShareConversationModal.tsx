import React, { useState } from 'react';
import { Copy, Check, Share2, X } from 'lucide-react';
import { shareConversation, unshareConversation } from '@/services/conversations';

interface ShareConversationModalProps {
  conversationId: string | null;
  isShared: boolean;
  shareToken: string | null;
  onSuccess: (token: string) => void;
  onUnshare: () => void;
  onClose: () => void;
}

export const ShareConversationModal: React.FC<ShareConversationModalProps> = ({
  conversationId,
  isShared,
  shareToken,
  onSuccess,
  onUnshare,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const token = await shareConversation(conversationId);
      onSuccess(token);
    } catch (error) {
      console.error('Error sharing conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      await unshareConversation(conversationId);
      onUnshare();
    } catch (error) {
      console.error('Error unsharing conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareToken) return;
    
    const shareUrl = `https://therai.co/shared/${shareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const shareUrl = shareToken ? `https://therai.co/shared/${shareToken}` : '';

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-900">
              {isShared ? 'Manage Share' : 'Share Conversation'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isShared ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">This conversation is shared publicly.</p>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1">Link copied to clipboard!</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleUnshare}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Stopping...' : 'Stop Sharing'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Create a public link to share this conversation. Anyone with the link will be able to view it.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Share Link'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
