import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Trash2, Users } from 'lucide-react';
import { inviteUserToConversation, removeUserFromConversation, getConversationInvitees, unshareConversation } from '@/services/conversations';
import { ConversationInvitee } from '@/services/conversations';

interface InviteUserModalProps {
  conversationId: string;
  conversationTitle?: string;
  onClose: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  conversationId,
  conversationTitle,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitees, setInvitees] = useState<ConversationInvitee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing invitees
  useEffect(() => {
    const loadInvitees = async () => {
      try {
        const inviteesList = await getConversationInvitees(conversationId);
        setInvitees(inviteesList);
      } catch (error) {
        console.error('Error loading invitees:', error);
      }
    };

    loadInvitees();
  }, [conversationId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteUserToConversation(conversationId, email.trim());
      setSuccess(`Invited ${email} successfully`);
      setEmail('');
      
      // Reload invitees
      const updatedInvitees = await getConversationInvitees(conversationId);
      setInvitees(updatedInvitees);
    } catch (error: any) {
      setError(error.message || 'Failed to invite user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userEmail: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await removeUserFromConversation(conversationId, userEmail);
      
      // Reload invitees
      const updatedInvitees = await getConversationInvitees(conversationId);
      setInvitees(updatedInvitees);
    } catch (error: any) {
      setError(error.message || 'Failed to remove user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshareAll = async () => {
    if (!confirm('Remove access for all invited users? This cannot be undone.')) return;

    setIsLoading(true);
    setError(null);

    try {
      await unshareConversation(conversationId);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to remove all access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Share Conversation</h2>
              <p className="text-sm text-gray-500">{conversationTitle || 'Untitled'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite by email
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!email.trim() || isLoading}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              </div>
            </div>
          </form>

          {/* Messages */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Invitees List */}
          {invitees.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Invited users</h3>
              <div className="space-y-2">
                {invitees.map((invitee) => (
                  <div
                    key={invitee.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invitee.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(invitee.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(invitee.email)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {invitees.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleUnshareAll}
                disabled={isLoading}
                className="w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
              >
                Remove all access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
