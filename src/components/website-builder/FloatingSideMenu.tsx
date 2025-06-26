
import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, Globe, Save, ArrowLeft } from "lucide-react";

interface FloatingSideMenuProps {
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  onChangeTemplate: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  saveButtonText: string;
  publishButtonText: string;
  website?: any;
}

export const FloatingSideMenu: React.FC<FloatingSideMenuProps> = ({
  onPreview,
  onSave,
  onPublish,
  onChangeTemplate,
  isSaving,
  isPublishing,
  saveButtonText,
  publishButtonText,
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
      
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="w-20 h-16 flex flex-col items-center justify-center space-y-1 bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Save className="h-4 w-4" />
        <span className="text-xs font-medium text-center">{isSaving ? 'Saving...' : 'Save'}</span>
      </Button>
      
      <Button
        size="sm"
        onClick={onPublish}
        disabled={isPublishing}
        className="w-20 h-16 flex flex-col items-center justify-center space-y-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium text-center">{isPublishing ? 'Publishing...' : 'Publish'}</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onChangeTemplate}
        className="w-20 h-16 flex flex-col items-center justify-center space-y-1 bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-medium text-center">Templates</span>
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
