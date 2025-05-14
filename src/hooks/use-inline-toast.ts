
// A simplified hook for inline toast messages that don't use the toast notification system
import { useState } from "react";

export type InlineToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const useInlineToast = () => {
  const [message, setMessage] = useState<InlineToastProps | null>(null);
  
  const showToast = (props: InlineToastProps) => {
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
  
  return { message, showToast, clearToast };
};
