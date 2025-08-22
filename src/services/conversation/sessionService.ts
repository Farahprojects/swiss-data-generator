import { supabase } from '@/integrations/supabase/client';

export interface SessionResponse {
  sessionId: string;
  audioStreamUrl: string;
  status: string;
  mode: string;
}

class SessionService {
  async startSession(chat_id: string, mode: string = 'convo'): Promise<SessionResponse> {
    const { data, error } = await supabase.functions.invoke('session-start', {
      body: {
        chat_id,
        mode
      }
    });

    if (error) {
      console.error('[SessionService] Failed to start session:', error);
      throw new Error(`Failed to start session: ${error.message}`);
    }

    console.log('[SessionService] Session started:', data);
    return data as SessionResponse;
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('session-end', {
      body: {
        sessionId
      }
    });

    if (error) {
      console.error('[SessionService] Failed to end session:', error);
      // Don't throw error for cleanup operations
    } else {
      console.log('[SessionService] Session ended:', sessionId);
    }
  }
}

export const sessionService = new SessionService();
