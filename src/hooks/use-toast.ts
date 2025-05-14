
import { toast } from "sonner";

export type ToastProps = {
  title?: string;
  description?: string;
  duration?: number;
  variant?: "default" | "destructive";
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const useToast = () => {
  const showToast = ({ 
    title, 
    description, 
    variant = "default", 
    duration = 5000,
    action
  }: ToastProps) => {
    if (variant === "destructive") {
      toast.error(title, {
        description,
        duration,
        action
      });
    } else {
      toast(title, {
        description,
        duration,
        action
      });
    }
  };

  return { toast: showToast };
};

export { toast };
