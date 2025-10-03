import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

interface AddPersonButtonProps {
  onClick: () => void;
  className?: string;
}

export const AddPersonButton: React.FC<AddPersonButtonProps> = ({ onClick, className }) => {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`w-full flex items-center justify-start gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light ${className || ''}`}
    >
      <UserPlus className="w-4 h-4" />
      Person
    </Button>
  );
};
