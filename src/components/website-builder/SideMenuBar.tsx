
import React from "react";
import { Button } from "@/components/ui/button";
import { Globe, Save, Palette } from "lucide-react";

interface SideMenuBarProps {
  onSave: () => void;
  onPublish: () => void;
  onChangeTemplate: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  saveButtonText: string;
  publishButtonText: string;
  hasUnpublishedChanges?: boolean;
}

export const SideMenuBar: React.FC<SideMenuBarProps> = ({
  onSave,
  onPublish,
  onChangeTemplate,
  isSaving,
  isPublishing,
  saveButtonText,
  publishButtonText,
  hasUnpublishedChanges
}) => {
  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 space-y-3">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="w-full flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span className="text-xs">{saveButtonText}</span>
        </Button>
        
        <Button
          onClick={onPublish}
          disabled={isPublishing}
          className="w-full flex items-center space-x-2 bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs">{publishButtonText}</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={onChangeTemplate}
          className="w-full flex items-center space-x-2"
          size="sm"
        >
          <Palette className="h-4 w-4" />
          <span className="text-xs">Template</span>
        </Button>
        
        {hasUnpublishedChanges && (
          <div className="text-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Unpublished
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
