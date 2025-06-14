import { supabase } from "@/integrations/supabase/client";
import type { EmailMessage } from "@/types/email";
import type { ToastProps } from "@/hooks/use-toast";

/**
 * Star/unstar a message in Supabase.
 */
export async function toggleStarMessage(
  message: EmailMessage,
  toast: (message: ToastProps) => void
): Promise<void> {
  const { error } = await supabase
    .from("email_messages")
    .update({ is_starred: !message.is_starred })
    .eq("id", message.id);

  if (error) {
    toast({ title: "Error", description: "Could not update star.", variant: "destructive" });
    throw error;
  }
  toast({ title: message.is_starred ? "Unstarred" : "Starred", description: "Star status updated.", variant: "default" });
}

/**
 * Archive messages by setting is_archived true in Supabase.
 */
export async function archiveMessages(
  messageIds: string[],
  toast: (message: ToastProps) => void
): Promise<void> {
  const { error } = await supabase.from("email_messages")
    .update({ is_archived: true })
    .in("id", messageIds);

  if (error) {
    toast({ title: "Error", description: "Could not archive messages.", variant: "destructive" });
    throw error;
  }
  toast({ title: "Archive", description: "Message archived." });
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

/**
 * Mark a message as read (single message).
 */
export async function markMessageRead(
  messageId: string
): Promise<void> {
  await supabase.from("email_messages")
    .update({ is_read: true })
    .eq("id", messageId);
}
