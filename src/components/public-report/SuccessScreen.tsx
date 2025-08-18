import React, { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { setChatTokens } from '@/services/auth/chatTokens';

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
    // Store tokens minimally; token acquisition is assumed handled elsewhere per new flow
    // For now, just persist the guestId; token can be set when obtained
    setChatTokens(guestId, '', chatId);
    navigate('/chat');
    return (
      <div ref={ref} />
    );
  }
);
