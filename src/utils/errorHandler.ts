import { supabase } from '@/integrations/supabase/client';

export const logUserError = async (
  guestReportId: string | null,
  errorType: string,
  errorMessage?: string,
  email?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('log-user-error', {
      body: {
        guestReportId: guestReportId || null,
        errorType,
        errorMessage,
        email: email || 'unknown',
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.warn('Failed to log user error:', error.message);
      return null;
    }

    return data?.case_number || 'CASE-' + Date.now();
  } catch (err) {
    console.error('❌ Error logging user error:', err);
    return null;
  }
};

export const handleMissingReportId = async (email?: string): Promise<string> => {
  try {
    const caseNumber = await logUserError(
      null,
      'missing_report_id',
      'No guest report ID detected in URL or localStorage',
      email
    );
    
    // Clear any stale state
    localStorage.removeItem('currentGuestReportId');
    window.history.replaceState({}, '', window.location.pathname);
    
    return caseNumber || 'MISSING-' + Date.now();
  } catch (err) {
    console.error('❌ Error handling missing ID:', err);
    return 'MISSING-' + Date.now();
  }
};