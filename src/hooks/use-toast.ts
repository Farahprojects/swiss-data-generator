
import { useState } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
};

// Our main useToast hook for inline toast messages
export function useToast() {
  const [message, setMessage] = useState<ToastProps | null>(null);
  
  const toast = (props: ToastProps = {}) => {
    setMessage(props);
    
    // Auto-clear success messages after 3 seconds
    if (props.variant !== "destructive") {
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };
  
  const clearToast = () => {
    setMessage(null);
  };
  
  return { toast, message, clearToast };
}

// We no longer export a standalone toast function since we're moving to inline toasts
