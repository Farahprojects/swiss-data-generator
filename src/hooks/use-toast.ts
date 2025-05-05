
import { toast as sonnerToast, type Toast } from "sonner";

export type ToastProps = Toast & {
  variant?: "default" | "destructive" | "success";
};

export function toast({ variant = "default", ...props }: ToastProps) {
  return sonnerToast(props);
}

export function useToast() {
  return {
    toast,
  };
}
