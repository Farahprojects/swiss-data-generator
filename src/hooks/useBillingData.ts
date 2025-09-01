import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BillingData {
  profile: any;
  credits: any;
  paymentMethods: any[];
  apiUsage: any;
  transactions: any[];
}

interface BillingCache {
  data: BillingData | null;
  lastFetch: Record<string, number>;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BILLING_CACHE_KEY = 'billing_cache';

export const useBillingData = () => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Load cached data
  const loadCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(BILLING_CACHE_KEY);
      if (cached) {
        const parsedCache: BillingCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
          setBillingData(parsedCache.data);
          setLastUpdated(new Date(parsedCache.timestamp));
          return parsedCache;
        }
      }
    } catch (error) {
      console.error('Error loading cached billing data:', error);
    }
    return null;
  }, []);

  // Save data to cache
  const saveToCache = useCallback((data: BillingData) => {
    try {
      const cache: BillingCache = {
        data,
        lastFetch: {
          profile: Date.now(),
          credits: Date.now(),
          paymentMethods: Date.now(),
          apiUsage: Date.now(),
          transactions: Date.now(),
        },
        timestamp: Date.now()
      };
      localStorage.setItem(BILLING_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving billing data to cache:', error);
    }
  }, []);

  // Fetch billing data from Supabase
  const fetchBillingData = useCallback(async (forceFresh = false) => {
    if (!user) return;

    setIsLoading(true);
    
    try {
      const cachedData = forceFresh ? null : loadCachedData();
      
      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch credits
      const { data: credits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch payment methods
      const { data: paymentMethods } = await supabase
        .from('payment_method')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('ts', { ascending: false });

      // Fetch API usage (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: apiUsage } = await supabase
        .from('api_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Calculate monthly total
      const monthlyTotal = apiUsage?.reduce((sum, usage) => sum + (usage.total_cost_usd || 0), 0) || 0;

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('ts', { ascending: false })
        .limit(50);

      const newBillingData: BillingData = {
        profile,
        credits,
        paymentMethods: paymentMethods || [],
        apiUsage: {
          monthly_total: monthlyTotal,
          daily_usage: apiUsage || []
        },
        transactions: transactions || []
      };

      setBillingData(newBillingData);
      saveToCache(newBillingData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadCachedData, saveToCache]);

  // Setup WebSocket for real-time updates
  const setupWebSocket = useCallback(() => {
    if (!user) return;

    const wsUrl = `wss://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/functions/v1/billing-websocket`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log('Billing WebSocket connected');
      setIsConnected(true);
      
      // Send authentication
      const { data: { session } } = await supabase.auth.getSession();
      ws.send(JSON.stringify({
        type: 'auth',
        token: session?.access_token
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'billing_update':
            // Merge update with existing data
            setBillingData(prev => prev ? {
              ...prev,
              ...message.data
            } : message.data);
            setLastUpdated(new Date());
            break;
            
          case 'transaction_update':
            // Add new transaction to list
            setBillingData(prev => prev ? {
              ...prev,
              transactions: [message.transaction, ...prev.transactions.slice(0, 49)]
            } : prev);
            break;
            
          case 'usage_update':
            // Update usage data
            setBillingData(prev => prev ? {
              ...prev,
              apiUsage: {
                ...prev.apiUsage,
                ...message.usage
              }
            } : prev);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Billing WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (user) {
          setupWebSocket();
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [user]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    fetchBillingData(true);
  }, [fetchBillingData]);

  // Initialize
  useEffect(() => {
    if (user) {
      // Load cached data first for instant display
      const cached = loadCachedData();
      if (!cached) {
        fetchBillingData();
      } else {
        setIsLoading(false);
        // Still fetch fresh data in background
        fetchBillingData();
      }
      
      // Setup WebSocket for real-time updates
      const cleanup = setupWebSocket();
      
      return cleanup;
    }
  }, [user, fetchBillingData, setupWebSocket, loadCachedData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return {
    billingData,
    isLoading,
    isConnected,
    refreshData,
    lastUpdated
  };
};