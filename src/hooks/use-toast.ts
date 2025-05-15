
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
    console.log("Toast message:", props);
    setMessage(props);
  };

  const clearToast = () => {
    console.log("Clearing toast message");
    setMessage(null);
  };

  return {
    toast,
    clearToast,
    message
  };
};
