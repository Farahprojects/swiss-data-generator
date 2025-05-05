
// This is a placeholder implementation that doesn't show any toasts
// You can implement your custom UI message system later

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

export function toast(_props: ToastProps) {
  // No-op implementation
  return "";
}

export function useToast() {
  return {
    toast,
  };
}
