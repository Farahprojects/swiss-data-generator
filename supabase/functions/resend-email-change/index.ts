
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Edge version] 2025-05-24-fixed-notification');

  if (req.method === 'OPTIONS')
    return new Response(null, { headers: CORS });

  /* ─ Parse body ─ */
  let primary = '';
  try {
    const { email } = await req.json();
    primary = (email ?? '').toLowerCase();
  } catch {
    return badRequest('Invalid JSON');
  }
  if (!primary) return badRequest('Email required');

  /* ─ Supabase client ─ */
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  /* ─ Lookup user by PRIMARY email ─ */
  let user: any | null = null;
  let lookupErr: any = null;

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error: lookupErr } =
      await supabase.auth.admin.getUserByEmail(primary));
  } else {
    /* fallback using listUsers */
    const { data, error } = await supabase.auth.admin.listUsers({ email: primary });
    lookupErr = error;
    user = data?.users.find((u: any) => (u.email ?? '').toLowerCase() === primary) ?? null;
  }

  if (lookupErr)
    return serverError('Lookup failed', lookupErr.message);
  if (!user)
    return ok('no_user_found');

  if (!user.new_email)      // <── pending e-mail lives here
    return ok('no_pending_change');

  /* ─ Two separate email handling processes ─ */
  try {
    // 1. Send notification to original email using our notification service
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const notificationResponse = await fetch(`${url}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          templateType: 'email_change',
          recipientEmail: user.email,
          variables: {
            newEmail: user.new_email,
            oldEmail: user.email,
            date: new Date().toLocaleDateString()
          }
        })
      });

      if (!notificationResponse.ok) {
        console.error('Failed to send notification email:', await notificationResponse.text());
        // Don't fail the whole operation if notification fails
      } else {
        console.log('Notification email sent successfully to:', user.email);
      }
    }
    
    // 2. Resend verification email to new email address
    const { error: resendErr } = await supabase.auth.resend({
      type: 'email_change',
      email: user.new_email,
    });

    if (resendErr)
      return serverError('Verification resend failed', resendErr.message);

    return ok('resent');
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return serverError('Email sending failed', error.message);
  }

  /* helpers */
  function ok(status: string) {
    return new Response(
      JSON.stringify({ status }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
  function badRequest(msg: string) {
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
  function serverError(msg: string, details?: string) {
    return new Response(
      JSON.stringify({ error: msg, details }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
});
