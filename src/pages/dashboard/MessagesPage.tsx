
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { ImprovedMessageList } from '@/components/messages/ImprovedMessageList';
import { MessageDetail } from '@/components/messages/MessageDetail';
import { ComposeModal } from '@/components/messages/ComposeModal';
import { MobileComposeButton } from '@/components/messages/MobileComposeButton';
import { useIsMobile } from '@/hooks/use-mobile';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import type { MessageFilterType } from '@/components/messages/MessagesSidebar';

// Mock data for demonstration
const mockMessages = [
  {
    id: '1',
    subject: 'Welcome to our platform',
    sender: 'team@example.com',
    preview: 'Thank you for joining us. Here\'s everything you need to get started...',
    timestamp: new Date('2024-01-15T10:30:00'),
    isRead: false,
    isStarred: true,
    labels: ['inbox']
  },
  {
    id: '2',
    subject: 'Your report is ready',
    sender: 'reports@example.com',
    preview: 'Your monthly analytics report has been generated and is ready for review...',
    timestamp: new Date('2024-01-14T14:22:00'),
    isRead: true,
    isStarred: false,
    labels: ['inbox']
  },
  {
    id: '3',
    subject: 'Meeting reminder',
    sender: 'calendar@example.com',
    preview: 'Don\'t forget about your upcoming meeting tomorrow at 2 PM...',
    timestamp: new Date('2024-01-13T09:15:00'),
    isRead: false,
    isStarred: false,
    labels: ['inbox']
  }
];

const MessagesPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Get filter from URL params, default to 'inbox'
  const activeFilter = (searchParams.get('filter') as MessageFilterType) || 'inbox';
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Filter messages based on active filter
  const filteredMessages = mockMessages.filter(message => {
    switch (activeFilter) {
      case 'inbox':
        return message.labels.includes('inbox');
      case 'sent':
        return message.labels.includes('sent');
      case 'starred':
        return message.isStarred;
      case 'archive':
        return message.labels.includes('archive');
      case 'trash':
        return message.labels.includes('trash');
      default:
        return message.labels.includes('inbox');
    }
  });

  const unreadCount = mockMessages.filter(msg => !msg.isRead && msg.labels.includes('inbox')).length;
  const selectedMessage = mockMessages.find(msg => msg.id === selectedMessageId);

  const handleFilterChange = (filter: MessageFilterType) => {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    navigate(`/dashboard/messages?${params.toString()}`, { replace: true });
  };

  const handleOpenBranding = () => {
    navigate('/dashboard/email-branding');
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const handleBackToList = () => {
    setSelectedMessageId(null);
  };

  const headerHeight = 0; // No additional header in this layout

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <UnifiedNavigation 
        isMessagesPageMobile={isMobile}
        activeFilter={activeFilter}
        unreadCount={unreadCount}
        onFilterChange={handleFilterChange}
      />
      
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          <MessagesSidebar
            activeFilter={activeFilter}
            unreadCount={unreadCount}
            onFilterChange={handleFilterChange}
            onOpenBranding={handleOpenBranding}
            headerHeight={headerHeight}
          />
          <div className="flex-1 flex ml-64">
            <div className="w-80 border-r bg-white">
              <ImprovedMessageList
                messages={filteredMessages}
                selectedMessageId={selectedMessageId}
                onMessageSelect={handleMessageSelect}
                activeFilter={activeFilter}
              />
            </div>
            <div className="flex-1 bg-white">
              {selectedMessage ? (
                <MessageDetail message={selectedMessage} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <p className="text-lg">Select a message to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <MessageDetail message={selectedMessage} onBack={handleBackToList} />
          ) : (
            <div className="flex-1 bg-white">
              <ImprovedMessageList
                messages={filteredMessages}
                selectedMessageId={selectedMessageId}
                onMessageSelect={handleMessageSelect}
                activeFilter={activeFilter}
              />
            </div>
          )}
        </div>
      )}

      <MobileComposeButton onClick={() => setIsComposeOpen(true)} />
      
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
};

export default MessagesPage;
