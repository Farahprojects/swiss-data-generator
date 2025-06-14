
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MobileComposeButtonProps {
  onClick: () => void;
}

export const MobileComposeButton: React.FC<MobileComposeButtonProps> = ({ onClick }) => (
  <button
    aria-label="Compose"
    onClick={onClick}
    className="fixed z-50 bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full w-14 h-14 flex items-center justify-center transition-all duration-150 active:scale-95"
    style={{ boxShadow: "0 2px 16px rgba(30,64,175,0.18)" }}
  >
    <Plus className="w-7 h-7" />
  </button>
);
