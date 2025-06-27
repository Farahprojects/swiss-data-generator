
import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface FloatingSideMenuProps {
  onPreview: () => void;
  website?: any;
}

export const FloatingSideMenu: React.FC<FloatingSideMenuProps> = ({
  onPreview,
  website
}) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onPreview}
        className="w-20 h-16 flex flex-col items-center justify-center space-y-1 bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Eye className="h-4 w-4" />
        <span className="text-xs font-medium">Preview</span>
      </Button>
      
      {website?.has_unpublished_changes && (
        <div className="w-20 px-2 py-1 text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Changes
          </span>
        </div>
      )}
    </div>
  );
};
