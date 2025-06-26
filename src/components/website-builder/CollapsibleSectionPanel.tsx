
import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, FileText, Image, Briefcase, Settings, Palette, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface CollapsibleSectionPanelProps {
  onOpenModal: (section: string) => void;
  onChangeTemplate: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const editSections = [
  { id: 'hero', label: 'Hero', icon: User },
  { id: 'intro', label: 'Intro', icon: FileText },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'cta', label: 'CTA', icon: Settings },
  { id: 'footer', label: 'Footer', icon: Palette },
];

export const CollapsibleSectionPanel: React.FC<CollapsibleSectionPanelProps> = ({
  onOpenModal,
  onChangeTemplate,
  isExpanded,
  onToggle
}) => {
  return (
    <TooltipProvider>
      <div
        data-panel="collapsible-section"
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg z-[60] transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {isExpanded && (
            <h2 className="text-lg font-semibold text-gray-900">Edit Sections</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2 hover:bg-gray-100"
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Section Buttons */}
        <div className="p-2 space-y-2">
          {editSections.map((section) => {
            const Icon = section.icon;
            
            if (isExpanded) {
              return (
                <Button
                  key={section.id}
                  variant="ghost"
                  onClick={() => onOpenModal(section.id)}
                  className="w-full h-12 flex items-center justify-start space-x-3 px-4 hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{section.label}</span>
                </Button>
              );
            }

            return (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenModal(section.id)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="h-5 w-5 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>{section.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Templates Button */}
        <div className="absolute bottom-4 left-2 right-2">
          <div className="border-t border-gray-200 pt-4">
            {isExpanded ? (
              <Button
                variant="outline"
                onClick={onChangeTemplate}
                className="w-full h-12 flex items-center justify-start space-x-3 px-4 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Templates</span>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={onChangeTemplate}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>Templates</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
