import React, { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { setSessionIds } from '@/services/auth/sessionIds';

interface SuccessScreenProps {
  guestId: string;
  chatId?: string;
  name: string;
  email: string;
  isStripeReturn?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
  ({ guestId, chatId }, ref) => {
    const navigate = useNavigate();
    
    if (!chatId) {
      console.error('[SuccessScreen] Missing chatId for guest:', guestId);
      return null;
    }

    // Store both IDs and navigate to chat
    setSessionIds(guestId, chatId);
    navigate('/chat');
    
    return (
      <div ref={ref} />
    );
  }
);