import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Book, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PersonProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 w-full min-w-0">
      {/* Top Bar */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/therai')}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-lg font-light text-gray-900 truncate">Person</div>
            <div className="text-xs text-gray-600 truncate">Profile ID: {id}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full text-gray-700 hover:bg-gray-100">
            <MessageSquare className="w-4 h-4 mr-2" /> New Conversation
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full text-gray-700 hover:bg-gray-100">
            <Book className="w-4 h-4 mr-2" /> New Journal
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full text-gray-700 hover:bg-gray-100">
            <Sparkles className="w-4 h-4 mr-2" /> Generate Report
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full text-gray-700 hover:bg-gray-100">
            <FileText className="w-4 h-4 mr-2" /> Upload File
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Birth Data Summary */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Birth Data</div>
            <div className="text-xs text-gray-600">Date: —</div>
            <div className="text-xs text-gray-600">Time: —</div>
            <div className="text-xs text-gray-600">Location: —</div>
            <div className="pt-2">
              <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-gray-700 hover:bg-gray-100">View / Edit</Button>
            </div>
          </div>

          {/* Last Session */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Last Session</div>
            <div className="text-xs text-gray-600">Title: —</div>
            <div className="text-xs text-gray-600">Date: —</div>
            <div className="pt-2">
              <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-gray-700 hover:bg-gray-100">Open conversation</Button>
            </div>
          </div>

          {/* Insights */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Insights</div>
            <div className="text-xs text-gray-600">No insights yet.</div>
          </div>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">Conversations</div>
              <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-gray-700 hover:bg-gray-100">New</Button>
            </div>
            <div className="text-xs text-gray-600">No conversations yet.</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">Journal</div>
              <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-gray-700 hover:bg-gray-100">New</Button>
            </div>
            <div className="text-xs text-gray-600">No journal entries yet.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;


