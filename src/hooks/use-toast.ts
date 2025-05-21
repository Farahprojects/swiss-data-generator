
import { useState } from "react";

export type ToastVariant = "default" | "destructive" | "success";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export const useToast = () => {
  const [message, setMessage] = useState<ToastProps | null>(null);

  const toast = (props: ToastProps) => {
    logToSupabase("Toast message displayed", {
      level: 'debug',
      page: 'InlineToast',
      data: { 
        title: props.title,
        variant: props.variant
      }
    });
    setMessage(props);
  };

  const clearToast = () => {
    setMessage(null);
  };

  return {
    toast,
    clearToast,
    message
  };
};

// Add the import for logToSupabase
import { logToSupabase } from "@/utils/batchedLogManager";
