import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillingClient {
  socket: WebSocket;
  userId: string;
  authenticated: boolean;
}

const connectedClients = new Map<string, BillingClient>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = crypto.randomUUID();
  
  console.log(`[BILLING-WS] New connection: ${clientId}`);

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let client: BillingClient = {
    socket,
    userId: '',
    authenticated: false
  };

  socket.onopen = () => {
    console.log(`[BILLING-WS] Connection opened: ${clientId}`);
    connectedClients.set(clientId, client);
    
    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[BILLING-WS] Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'auth':
          await handleAuthentication(message, client, supabase);
          break;
          
        case 'fetch_billing_data':
          await handleFetchBillingData(client, supabase);
          break;
          
        case 'refresh_section':
          await handleRefreshSection(message, client, supabase);
          break;
          
        default:
          console.log(`[BILLING-WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[BILLING-WS] Error processing message:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  };

  socket.onclose = () => {
    console.log(`[BILLING-WS] Connection closed: ${clientId}`);
    connectedClients.delete(clientId);
  };

  socket.onerror = (error) => {
    console.error(`[BILLING-WS] WebSocket error for ${clientId}:`, error);
    connectedClients.delete(clientId);
  };

  return response;
});

async function handleAuthentication(
  message: any, 
  client: BillingClient, 
  supabase: any
) {
  try {
    if (!message.token) {
      client.socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'No token provided'
      }));
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(message.token);
    
    if (error || !user) {
      console.error('[BILLING-WS] Authentication failed:', error);
      client.socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid token'
      }));
      return;
    }

    client.userId = user.id;
    client.authenticated = true;

    console.log(`[BILLING-WS] User authenticated: ${user.id}`);
    
    client.socket.send(JSON.stringify({
      type: 'auth_success',
      userId: user.id
    }));

    // Automatically send initial billing data
    await handleFetchBillingData(client, supabase);
    
  } catch (error) {
    console.error('[BILLING-WS] Authentication error:', error);
    client.socket.send(JSON.stringify({
      type: 'auth_error',
      message: 'Authentication failed'
    }));
  }
}

async function handleFetchBillingData(client: BillingClient, supabase: any) {
  if (!client.authenticated) {
    client.socket.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }

  try {
    console.log(`[BILLING-WS] Fetching billing data for user: ${client.userId}`);

    // Fetch all billing data in parallel
    const [
      { data: profile },
      { data: credits },
      { data: paymentMethods },
      { data: apiUsage },
      { data: transactions }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', client.userId)
        .single(),
      
      supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', client.userId)
        .single(),
        
      supabase
        .from('payment_method')
        .select('*')
        .eq('user_id', client.userId)
        .eq('active', true)
        .order('ts', { ascending: false }),
        
      supabase
        .from('api_usage')
        .select('*')
        .eq('user_id', client.userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
        
      supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', client.userId)
        .order('ts', { ascending: false })
        .limit(50)
    ]);

    // Calculate monthly total
    const monthlyTotal = apiUsage?.reduce((sum: number, usage: any) => 
      sum + (usage.total_cost_usd || 0), 0) || 0;

    const billingData = {
      profile,
      credits,
      paymentMethods: paymentMethods || [],
      apiUsage: {
        monthly_total: monthlyTotal,
        daily_usage: apiUsage || []
      },
      transactions: transactions || []
    };

    client.socket.send(JSON.stringify({
      type: 'billing_update',
      data: billingData,
      timestamp: new Date().toISOString()
    }));

    console.log(`[BILLING-WS] Billing data sent to user: ${client.userId}`);
    
  } catch (error) {
    console.error('[BILLING-WS] Error fetching billing data:', error);
    client.socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to fetch billing data'
    }));
  }
}

async function handleRefreshSection(
  message: any, 
  client: BillingClient, 
  supabase: any
) {
  if (!client.authenticated) {
    client.socket.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }

  try {
    const { section } = message;
    console.log(`[BILLING-WS] Refreshing section: ${section} for user: ${client.userId}`);

    let data;

    switch (section) {
      case 'profile':
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', client.userId)
          .single();
        data = { profile };
        break;

      case 'credits':
        const { data: credits } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', client.userId)
          .single();
        data = { credits };
        break;

      case 'payment_methods':
        const { data: paymentMethods } = await supabase
          .from('payment_method')
          .select('*')
          .eq('user_id', client.userId)
          .eq('active', true)
          .order('ts', { ascending: false });
        data = { paymentMethods: paymentMethods || [] };
        break;

      case 'transactions':
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', client.userId)
          .order('ts', { ascending: false })
          .limit(50);
        data = { transactions: transactions || [] };
        break;

      case 'usage':
        const { data: apiUsage } = await supabase
          .from('api_usage')
          .select('*')
          .eq('user_id', client.userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
          
        const monthlyTotal = apiUsage?.reduce((sum: number, usage: any) => 
          sum + (usage.total_cost_usd || 0), 0) || 0;
          
        data = {
          apiUsage: {
            monthly_total: monthlyTotal,
            daily_usage: apiUsage || []
          }
        };
        break;

      default:
        client.socket.send(JSON.stringify({
          type: 'error',
          message: `Unknown section: ${section}`
        }));
        return;
    }

    client.socket.send(JSON.stringify({
      type: 'section_update',
      section,
      data,
      timestamp: new Date().toISOString()
    }));

    console.log(`[BILLING-WS] Section ${section} refreshed for user: ${client.userId}`);
    
  } catch (error) {
    console.error(`[BILLING-WS] Error refreshing section:`, error);
    client.socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to refresh section'
    }));
  }
}

// Function to broadcast updates to all connected clients for a specific user
export async function broadcastBillingUpdate(userId: string, updateType: string, data: any) {
  const userClients = Array.from(connectedClients.values())
    .filter(client => client.userId === userId && client.authenticated);

  if (userClients.length > 0) {
    const message = JSON.stringify({
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    });

    userClients.forEach(client => {
      try {
        client.socket.send(message);
      } catch (error) {
        console.error('[BILLING-WS] Error sending update to client:', error);
      }
    });

    console.log(`[BILLING-WS] Broadcasted ${updateType} to ${userClients.length} clients for user: ${userId}`);
  }
}