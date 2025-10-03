import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, MessageSquare, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PersonProfile {
  id: string;
  name: string;
  chatsCount: number;
  journalCount: number;
  chats: Array<{
    id: string;
    title: string;
  }>;
  journal: Array<{
    id: string;
    title: string;
  }>;
}

interface PersonProfilesListProps {
  profiles: PersonProfile[];
  onProfileClick: (profileId: string) => void;
  onChatClick: (profileId: string, chatId: string) => void;
  onJournalClick: (profileId: string, journalId: string) => void;
  onNewChat: (profileId: string) => void;
  onNewJournal: (profileId: string) => void;
}

export const PersonProfilesList: React.FC<PersonProfilesListProps> = ({
  profiles,
  onProfileClick,
  onChatClick,
  onJournalClick,
  onNewChat,
  onNewJournal,
}) => {
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  const toggleProfile = (profileId: string) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
    }
    setExpandedProfiles(newExpanded);
  };

  if (profiles.length === 0) {
    return (
      <div className="text-xs text-gray-500 px-3 py-2">
        No person profiles yet. Create your first profile!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {profiles.map((profile) => {
        const isExpanded = expandedProfiles.has(profile.id);
        
        return (
          <div key={profile.id} className="space-y-0.5">
            {/* Profile Header */}
            <button
              onClick={() => onProfileClick(profile.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <ChevronRight className="w-3 h-3 text-gray-500" />
              <Folder className="w-4 h-4 text-gray-600" />
              <span className="flex-1 text-left">{profile.name}</span>
            </button>

            {/* Expanded Content */}
            {/* No inline expansion; clicking navigates to profile view */}
          </div>
        );
      })}
    </div>
  );
};
