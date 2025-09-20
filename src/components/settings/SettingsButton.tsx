
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useSettingsModal } from '@/contexts/SettingsModalContext';

interface SettingsButtonProps extends ButtonProps {
  panel?: "general" | "account" | "notifications" | "delete" | "support" | "billing";
  showIcon?: boolean;
  label?: string;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  panel = "general",
  showIcon = true,
  label = "Settings",
  className,
  variant = "outline",
  size,
  ...props
}) => {
  const { openSettings } = useSettingsModal();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openSettings(panel);
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {showIcon && <Settings className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
};

export default SettingsButton;
