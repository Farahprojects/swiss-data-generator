
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
import type { EmailMessage } from '@/types/email';

// Mock data for demonstration
const mockMessages: EmailMessage[] = [
  {
    id: '1',
    subject: 'Welcome to our platform',
    body: 'Thank you for joining us. Here\'s everything you need to get started with our comprehensive platform...',
    from_address: 'team@example.com',
    to_address: 'user@example.com',
    direction: 'incoming',
    created_at: '2024-01-15T10:30:00Z',
    sent_via: 'email',
    is_read: false,
    is_starred: true,
    is_archived: false
  },
  {
    id: '2',
    subject: 'Your report is ready',
    body: 'Your monthly analytics report has been generated and is ready for review. Please find the detailed insights attached.',
    from_address: 'reports@example.com',
    to_address: 'user@example.com',
    direction: 'incoming',
    created_at: '2024-01-14T14:22:00Z',
    sent_via: 'email',
    is_read: true,
    is_starred: false,
    is_archived: false
  },
  {
    id: '3',
    subject: 'Meeting reminder',
    body: 'Don\'t forget about your upcoming meeting tomorrow at 2 PM. We\'ll be discussing the quarterly results and future plans.',
    from_address: 'calendar@example.com',
    to_address: 'user@example.com',
    direction: 'incoming',
    created_at: '2024-01-13T09:15:00Z',
    sent_via: 'email',
    is_read: false,
    is_starred: false,
    is_archived: false
  }
];

const MessagesPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Get filter from URL params, default to 'inbox'
  const activeFilter = (searchParams.get('filter') as MessageFilterType) || 'inbox';
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Filter messages based on active filter
  const filteredMessages = mockMessages.filter(message => {
    switch (activeFilter) {
      case 'inbox':
        return message.direction === 'incoming' && !message.is_archived;
      case 'sent':
        return message.direction === 'outgoing';
      case 'starred':
        return message.is_starred;
      case 'archive':
        return message.is_archived;
      case 'trash':
        return false; // No trash messages in mock data
      default:
        return message.direction === 'incoming' && !message.is_archived;
    }
  });

  const unreadCount = mockMessages.filter(msg => !msg.is_read && msg.direction === 'incoming' && !msg.is_archived).length;
  const selectedMessage = mockMessages.find(msg => msg.id === selectedMessageId) || null;

  const handleFilterChange = (filter: MessageFilterType) => {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    navigate(`/dashboard/messages?${params.toString()}`, { replace: true });
  };

  const handleOpenBranding = () => {
    navigate('/dashboard/email-branding');
  };

  const handleMessageSelect = (message: EmailMessage) => {
    setSelectedMessageId(message.id);
  };

  const handleSelectMessageCheckbox = (messageId: string, checked: boolean) => {
    const newSelectedMessages = new Set(selectedMessages);
    if (checked) {
      newSelectedMessages.add(messageId);
    } else {
      newSelectedMessages.delete(messageId);
    }
    setSelectedMessages(newSelectedMessages);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(new Set(filteredMessages.map(msg => msg.id)));
    } else {
      setSelectedMessages(new Set());
    }
  };

  const handleBackToList = () => {
    setSelectedMessageId(null);
  };

  const handleClose = () => {
    setSelectedMessageId(null);
  };

  const handleReply = () => {
    // TODO: Implement reply functionality
    console.log('Reply clicked');
  };

  const handleForward = () => {
    // TODO: Implement forward functionality
    console.log('Forward clicked');
  };

  const handleArchive = () => {
    // TODO: Implement archive functionality
    console.log('Archive clicked');
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log('Delete clicked');
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
                selectedMessages={selectedMessages}
                selectedMessage={selectedMessage}
                onSelectMessage={handleMessageSelect}
                onSelectMessageCheckbox={handleSelectMessageCheckbox}
                onSelectAll={handleSelectAll}
              />
            </div>
            <div className="flex-1 bg-white">
              {selectedMessage ? (
                <MessageDetail 
                  message={selectedMessage}
                  onClose={handleClose}
                  onReply={handleReply}
                  onForward={handleForward}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
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
            <MessageDetail 
              message={selectedMessage}
              onClose={handleBackToList}
              onReply={handleReply}
              onForward={handleForward}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 bg-white">
              <ImprovedMessageList
                messages={filteredMessages}
                selectedMessages={selectedMessages}
                selectedMessage={selectedMessage}
                onSelectMessage={handleMessageSelect}
                onSelectMessageCheckbox={handleSelectMessageCheckbox}
                onSelectAll={handleSelectAll}
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
