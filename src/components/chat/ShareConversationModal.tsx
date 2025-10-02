import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { shareConversation, unshareConversation } from '@/services/conversations';

interface ShareConversationModalProps {
  conversationId: string | null;
  isShared: boolean;
  shareToken: string | null;
  initialMode?: 'view_only' | 'join_conversation';
  onSuccess: (token: string) => void;
  onUnshare: () => void;
  onClose: () => void;
}

export const ShareConversationModal: React.FC<ShareConversationModalProps> = ({
  conversationId,
  isShared,
  shareToken,
  initialMode,
  onSuccess,
  onUnshare,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(shareToken);
  const [mode, setMode] = useState<'view_only' | 'join_conversation'>(initialMode || 'view_only');

  const handleCreate = async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const token = await shareConversation(conversationId, mode);
      setLocalShareToken(token);
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
    // Use the computed shareUrl so it respects the selected mode
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const shareUrl = localShareToken
    ? mode === 'join_conversation'
      ? `https://therai.co/join/${localShareToken}`
      : `https://therai.co/shared/${localShareToken}`
    : '';
  const hasLink = !!localShareToken;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-normal text-gray-900">
            Share link to chat
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : hasLink ? (
            <div className="space-y-6">
              <p className="text-[15px] text-gray-600 leading-relaxed">
                {mode === 'join_conversation'
                  ? 'Anyone with this link (signed in) can join and participate in this conversation.'
                  : "Anyone with the URL can view this conversation. Messages you send after creating the link won't be shared."}
              </p>
              
              {/* Link Input with Copy Button */}
              <div className="relative">
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-3 text-[15px] text-gray-700 bg-white border-none outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-6 py-3 bg-black hover:bg-gray-800 text-white text-[15px] font-medium transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stop Sharing Button */}
              <button
                onClick={handleUnshare}
                disabled={isLoading}
                className="w-full px-4 py-3 text-[15px] font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Removing link...' : 'Delete link'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div
                  className={`rounded-lg border ${mode === 'view_only' ? 'border-gray-900' : 'border-gray-200'} p-4 cursor-pointer hover:border-gray-900 transition-colors`}
                  onClick={() => setMode('view_only')}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border ${mode === 'view_only' ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`} />
                    <div className="text-[15px] text-gray-900">Share for viewing only</div>
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Others can read the chat</div>
                </div>

                <div
                  className={`rounded-lg border ${mode === 'join_conversation' ? 'border-gray-900' : 'border-gray-200'} p-4 cursor-pointer hover:border-gray-900 transition-colors`}
                  onClick={() => setMode('join_conversation')}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border ${mode === 'join_conversation' ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`} />
                    <div className="text-[15px] text-gray-900">Share to join conversation</div>
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Others can participate (requires sign-in)</div>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full px-4 py-3 text-[15px] font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors"
              >
                Create share link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
