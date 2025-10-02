import React, { useState, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(!isShared && !shareToken);
  const [copied, setCopied] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(shareToken);

  // Auto-create link when modal opens if not already shared
  useEffect(() => {
    const createShareLink = async () => {
      if (!conversationId || isShared || shareToken) return;
      
      setIsLoading(true);
      try {
        const token = await shareConversation(conversationId);
        setLocalShareToken(token);
        onSuccess(token);
      } catch (error) {
        console.error('Error sharing conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    createShareLink();
  }, [conversationId, isShared, shareToken, onSuccess]);

  const handleUnshare = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      await unshareConversation(conversationId);
      setLocalShareToken(null);
      onUnshare();
      onClose(); // Close modal after stopping share
    } catch (error) {
      console.error('Error unsharing conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!localShareToken) return;
    
    const shareUrl = `https://therai.co/shared/${localShareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const shareUrl = localShareToken ? `https://therai.co/shared/${localShareToken}` : '';
  const hasLink = !!localShareToken;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Share Conversation
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        ) : hasLink ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Anyone with this link can view the conversation.</p>
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
            
            <button
              onClick={handleUnshare}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Stopping...' : 'Stop Sharing'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
