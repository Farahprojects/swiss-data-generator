
import React from "react";
import { Button } from "@/components/ui/button";
import { Type, User, Image, Briefcase, MessageSquare, MapPin } from "lucide-react";

interface FloatingSideButtonsProps {
  onOpenModal: (modalType: string) => void;
}

export const FloatingSideButtons: React.FC<FloatingSideButtonsProps> = ({
  onOpenModal
}) => {
  const buttons = [
    { id: 'hero', icon: Type, label: 'Hero', tooltip: 'Edit hero section' },
    { id: 'intro', icon: User, label: 'Intro', tooltip: 'Edit intro section' },
    { id: 'images', icon: Image, label: 'Images', tooltip: 'Manage images' },
    { id: 'services', icon: Briefcase, label: 'Services', tooltip: 'Edit services' },
    { id: 'cta', icon: MessageSquare, label: 'CTA', tooltip: 'Edit call-to-action' },
    { id: 'footer', icon: MapPin, label: 'Footer', tooltip: 'Edit footer' }
  ];

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 space-y-2">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <Button
            key={button.id}
            variant="outline"
            size="sm"
            onClick={() => onOpenModal(button.id)}
            className="w-12 h-12 p-0 bg-white shadow-lg hover:shadow-xl transition-all duration-200 border-gray-200 hover:border-gray-300"
            title={button.tooltip}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
};
