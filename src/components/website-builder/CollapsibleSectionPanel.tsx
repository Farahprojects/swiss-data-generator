
import React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, FileText, Image, Briefcase, Settings, Palette, Menu, ArrowLeft } from "lucide-react";

interface CollapsibleSectionPanelProps {
  onOpenModal: (section: string) => void;
  onChangeTemplate: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
  isOpen,
  onOpenChange
}) => {
  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed left-4 top-4 z-[70] bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Sections</h2>
          </div>

          {/* Section Buttons */}
          <div className="p-2 space-y-2">
            {editSections.map((section) => {
              const Icon = section.icon;
              
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
            })}
          </div>

          {/* Templates Button */}
          <div className="absolute bottom-4 left-2 right-2">
            <div className="border-t border-gray-200 pt-4">
              <Button
                variant="outline"
                onClick={onChangeTemplate}
                className="w-full h-12 flex items-center justify-start space-x-3 px-4 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Templates</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};
