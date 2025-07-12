
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

