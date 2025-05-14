
import { toast as sonnerToast } from "sonner";

export type ToastProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, action, variant = "default" }: ToastProps = {}) => {
    sonnerToast(title, {
      description,
      action,
      className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : "",
    });
  };

  return { toast };
}
