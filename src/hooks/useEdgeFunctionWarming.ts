
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEdgeFunctionWarming = () => {
  const warmupFunction = useCallback(async (functionName: string) => {
    try {
      await supabase.functions.invoke(functionName, {
        body: { action: 'warmup' }
      });
      console.log(`Warmed up edge function: ${functionName}`);
    } catch (error) {
      console.log(`Warmup sent for ${functionName} (response not critical)`);
    }
  }, []);

  const startPeriodicWarming = useCallback((functionName: string, intervalMs: number = 240000) => {
    // Initial warmup
    warmupFunction(functionName);
    
    // Set up periodic warming
    const interval = setInterval(() => {
      warmupFunction(functionName);
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [warmupFunction]);

  // Auto-warm critical functions on mount
  useEffect(() => {
    const cleanup1 = startPeriodicWarming('streaming-speech-to-text');
    const cleanup2 = startPeriodicWarming('google-speech-to-text');
    
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [startPeriodicWarming]);

  return { warmupFunction, startPeriodicWarming };
};
