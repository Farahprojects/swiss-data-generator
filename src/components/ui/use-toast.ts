
import { toast } from "sonner";

// Re-export toast without useToast since sonner doesn't provide it
export { toast };

// Export our custom useToast hook from the hooks folder
export { useToast } from "@/hooks/use-toast";
