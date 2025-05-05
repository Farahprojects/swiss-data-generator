
import { toast as sonnerToast, ToastT } from "sonner";

export type ToastProps = ToastT & {
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
