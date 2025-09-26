import React, { useState, useEffect } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Invisible message count validator component
 * Shows count in UI for debugging and triggers validation
 */
export const MessageCountValidator: React.FC = () => {
  const { chat_id, messages, validateMessageCount, validateMessageOrder } = useMessageStore();
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [dbOrder, setDbOrder] = useState<any[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Get database count and order for comparison
  useEffect(() => {
    if (!chat_id) {
      setDbCount(null);
      setDbOrder(null);
      return;
    }

    const fetchDbData = async () => {
      try {
        // Get count
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat_id)
          .not('context_injected', 'is', true);

        if (countError) {
          console.warn('[MessageCountValidator] Failed to get DB count:', countError);
          return;
        }

        // Get order
        const { data: orderData, error: orderError } = await supabase
          .from('messages')
          .select('id, message_number')
          .eq('chat_id', chat_id)
          .not('context_injected', 'is', true)
          .order('message_number', { ascending: true });

        if (orderError) {
          console.warn('[MessageCountValidator] Failed to get DB order:', orderError);
          return;
        }

        setDbCount(count || 0);
        setDbOrder(orderData || []);
      } catch (error) {
        console.warn('[MessageCountValidator] Error fetching DB data:', error);
      }
    };

    fetchDbData();
  }, [chat_id, messages.length]); // Re-fetch when messages change

  // Manual validation trigger
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateMessageOrder();
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
  const storeOrder = messages.map(m => ({ id: m.id, message_number: m.message_number }));
  
  const isCountMismatch = dbCount !== null && dbCount !== storeCount;
  const isOrderMismatch = dbOrder && storeOrder.length > 0 && 
    !storeOrder.every((storeMsg, index) => {
      const dbMsg = dbOrder[index];
      return dbMsg && storeMsg.id === dbMsg.id && storeMsg.message_number === dbMsg.message_number;
    });

  return (
    <div 
      className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded opacity-50 hover:opacity-100 transition-opacity"
      style={{ fontSize: '10px', fontFamily: 'monospace' }}
    >
      <div>Count: Store={storeCount} DB={dbCount ?? '...'}</div>
      <div>Order: {isOrderMismatch ? '❌ MISMATCH' : '✅ OK'}</div>
      {isCountMismatch && (
        <div className="text-red-400 font-bold">
          COUNT MISMATCH!
        </div>
      )}
      {isOrderMismatch && (
        <div className="text-orange-400 font-bold">
          ORDER MISMATCH!
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
