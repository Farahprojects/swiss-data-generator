import React, { useState, useEffect } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Invisible message count validator component
 * Shows count in UI for debugging and triggers validation
 */
export const MessageCountValidator: React.FC = () => {
  const { chat_id, messages, validateMessageCount } = useMessageStore();
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Get database count for comparison
  useEffect(() => {
    if (!chat_id) {
      setDbCount(null);
      return;
    }

    const fetchDbCount = async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat_id)
          .not('context_injected', 'is', true);

        if (error) {
          console.warn('[MessageCountValidator] Failed to get DB count:', error);
          return;
        }

        setDbCount(count || 0);
      } catch (error) {
        console.warn('[MessageCountValidator] Error fetching DB count:', error);
      }
    };

    fetchDbCount();
  }, [chat_id, messages.length]); // Re-fetch when messages change

  // Manual validation trigger
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateMessageCount();
    } catch (error) {
      console.warn('[MessageCountValidator] Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Don't render if no chat
  if (!chat_id) return null;

  const storeCount = messages.length;
  const isMismatch = dbCount !== null && dbCount !== storeCount;

  return (
    <div 
      className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded opacity-50 hover:opacity-100 transition-opacity"
      style={{ fontSize: '10px', fontFamily: 'monospace' }}
    >
      <div>Store: {storeCount}</div>
      <div>DB: {dbCount ?? '...'}</div>
      {isMismatch && (
        <div className="text-red-400 font-bold">
          MISMATCH!
        </div>
      )}
      <button
        onClick={handleValidate}
        disabled={isValidating}
        className="mt-1 px-1 py-0.5 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
      >
        {isValidating ? 'Validating...' : 'Validate'}
      </button>
    </div>
  );
};
