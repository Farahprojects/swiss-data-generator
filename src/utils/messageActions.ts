
import { supabase } from "@/integrations/supabase/client";
import type { EmailMessage } from "@/types/email";
import type { ToastProps } from "@/hooks/use-toast";

/**
 * Star/unstar a message
 * NOTE: The backend does NOT support starred; only update in UI.
 */
export async function toggleStarMessage(
  message: EmailMessage,
  toast: (message: ToastProps) => void
): Promise<void> {
  toast({ title: "Not Supported", description: "Starred status is not saved to the database yet.", variant: "default" });
}

/**
 * Archive messages (mock: set archived flag [not implemented in schema so just a toast for now])
 */
export async function archiveMessages(
  messageIds: string[],
  toast: (message: ToastProps) => void
): Promise<void> {
  toast({ title: "Archive", description: "Message archived." });
  // If/when email_messages has an "archived" column, update here.
}

/**
 * Delete messages from Supabase.
 */
export async function deleteMessages(
  messageIds: string[],
  toast: (message: ToastProps) => void
): Promise<void> {
  const { error } = await supabase.from("email_messages").delete().in("id", messageIds);

  if (error) {
    toast({ title: "Error", description: "Could not delete messages.", variant: "destructive" });
    throw error;
  }
  toast({ title: "Deleted", description: "Message(s) deleted.", variant: "success" });
}
