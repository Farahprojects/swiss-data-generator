
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { FeatureGate } from '@/components/profile/FeatureGate';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const { isVerified } = useProfileContext();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-light mb-8">
          Chat with <span className="italic">AI Assistant</span>
        </h1>
        
        {/* Basic chat - always available for guests and users */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-light mb-4">Basic Chat</h2>
          <p className="text-gray-600 mb-4">
            This chat functionality is available to everyone, including guests.
          </p>
          {/* Chat interface would go here */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Chat interface placeholder</p>
          </div>
        </div>

        {/* Verified user features */}
        {user && (
          <FeatureGate requireVerification>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-light">Verified User Features</h2>
              </div>
              <p className="text-blue-700 mb-4">
                ✨ These features are unlocked because your email is verified!
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="mr-2">
                  Save Conversations
                </Button>
                <Button variant="outline" className="mr-2">
                  Export Chat History
                </Button>
                <Button variant="outline">
                  Advanced Settings
                </Button>
              </div>
            </div>
          </FeatureGate>
        )}

        {/* Premium features example */}
        {user && (
          <FeatureGate requireFeature="premium_models">
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <h2 className="text-xl font-light mb-4">Premium AI Models</h2>
              <p className="text-purple-700 mb-4">
                Access to GPT-4, Claude, and other premium models.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Use Premium Models
              </Button>
            </div>
          </FeatureGate>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Current Status:</h3>
          <div className="text-sm space-y-1">
            <p>User: {user ? '✅ Authenticated' : '❌ Guest'}</p>
            {user && <p>Verified: {isVerified ? '✅ Yes' : '❌ No'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
