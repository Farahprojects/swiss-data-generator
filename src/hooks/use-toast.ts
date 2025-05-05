
import { toast as sonnerToast } from "sonner";

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

export function toast(props: ToastProps) {
  const { title, description, variant = "default" } = props;

  switch (variant) {
    case "destructive":
      return sonnerToast.error(title, {
        description,
      });
    case "success":
      return sonnerToast.success(title, {
        description,
      });
    default:
      return sonnerToast(title, {
        description,
      });
  }
}

export function useToast() {
  return {
    toast,
  };
}
