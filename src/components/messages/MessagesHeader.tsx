
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface MessagesHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const MessagesHeader = ({ searchTerm, onSearchChange }: MessagesHeaderProps) => {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-normal text-gray-900 min-w-fit">Messages</h1>
        
        {/* Slimmer Search */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search mail"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-full h-8 text-sm focus:bg-white focus:shadow-sm transition-all placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
};
