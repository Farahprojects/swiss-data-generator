
import { toast as sonnerToast } from "sonner";

// Re-export Sonner's toast function
export { sonnerToast as toast };

// Export our custom useToast hook from the hooks folder
export { useToast, toast, type ToastProps } from "@/hooks/use-toast";
