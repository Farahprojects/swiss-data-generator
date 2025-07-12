

import { supabase } from '@/integrations/supabase/client';

/**
 * Types of email notifications supported by the system
 */
export enum NotificationType {
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  SECURITY_ALERT = 'security_alert'
}

/**
 * Interface for notification variables that can be passed to templates
 */
export interface NotificationVariables {
  [key: string]: string | number | boolean | null;
}

/**
 * Sends an email notification using the templates stored in Supabase
 * 
 * @param type The type of notification to send
 * @param recipientEmail The email address to send the notification to
 * @param variables Optional variables to include in the template
 * @returns Promise resolving to a success status and optional error message
 */
export const sendEmailNotification = async (
  type: NotificationType,
  recipientEmail: string,
  variables: NotificationVariables = {}
): Promise<{ success: boolean; error?: string }> => {
  try {

    // Call the edge function to send the notification (no auth token required)
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        templateType: type,
        recipientEmail,
        variables
      }
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to send notification' 
      };
    }
    
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred sending notification' 
    };
  }
};

/**
 * Sends a password change notification email
 * 
 * @param email The recipient's email address
 * @param variables Optional variables for the template
 * @returns Promise resolving to a success status and optional error
 */
export const sendPasswordChangeNotification = async (
  email: string,
  variables: NotificationVariables = {}
): Promise<{ success: boolean; error?: string }> => {
  return sendEmailNotification(NotificationType.PASSWORD_CHANGE, email, variables);
};

/**
 * Sends an email change notification to the previous email address
 * 
 * @param previousEmail The previous email address
 * @param newEmail The new email address (will be added to variables)
 * @param variables Additional variables for the template
 * @returns Promise resolving to a success status and optional error
 */
export const sendEmailChangeNotification = async (
  previousEmail: string,
  newEmail: string,
  variables: NotificationVariables = {}
): Promise<{ success: boolean; error?: string }> => {
  return sendEmailNotification(
    NotificationType.EMAIL_CHANGE, 
    previousEmail,
    { 
      ...variables,
      newEmail 
    }
  );
};

/**
 * Sends a security alert notification email
 * 
 * @param email The recipient's email address
 * @param alertType The type of security alert
 * @param variables Optional variables for the template
 * @returns Promise resolving to a success status and optional error
 */
export const sendSecurityAlertNotification = async (
  email: string,
  alertType: string,
  variables: NotificationVariables = {}
): Promise<{ success: boolean; error?: string }> => {
  return sendEmailNotification(
    NotificationType.SECURITY_ALERT,
    email,
    {
      ...variables,
      alertType
    }
  );
};
