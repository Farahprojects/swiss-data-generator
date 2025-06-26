
import React from "react";
import { Button } from "@/components/ui/button";
import { User, FileText, Image, Briefcase, Settings, Palette } from "lucide-react";

interface FloatingEditButtonsProps {
  onOpenModal: (section: string) => void;
}

const editSections = [
  { id: 'hero', label: 'Hero', icon: User },
  { id: 'intro', label: 'Intro', icon: FileText },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'cta', label: 'CTA', icon: Settings },
  { id: 'footer', label: 'Footer', icon: Palette },
];

export const FloatingEditButtons: React.FC<FloatingEditButtonsProps> = ({
  onOpenModal
}) => {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col space-y-3">
      {editSections.map((section) => {
        const Icon = section.icon;
        return (
          <Button
            key={section.id}
            variant="outline"
            size="sm"
            onClick={() => onOpenModal(section.id)}
            className="w-20 h-16 flex flex-col items-center justify-center space-y-1 bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{section.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
