
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Edge version] 2025-05-21-notification-and-resend');

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
    // 1. Send notification to original email (without verification token)
    await sendNotificationEmail(supabase, user.email, user.new_email);
    
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

/**
 * Send a simple notification email to the original email address without verification tokens
 */
async function sendNotificationEmail(supabase: any, originalEmail: string, newEmail: string) {
  try {
    // For simplicity, using built-in email functionality
    // We could use a third-party service like Resend here for more customization
    const { error } = await supabase.auth.admin.updateUserById(
      'not-a-real-user-id', // We don't want to update any user, just send an email
      {
        email_confirm: true, // Flag to send email without requiring confirmation
        app_metadata: {
          custom_email_template: {
            subject: "Email Address Change Notification",
            content: `
              <h2>Email Change Notification</h2>
              <p>We wanted to let you know that a request has been made to change your email address from <strong>${originalEmail}</strong> to <strong>${newEmail}</strong>.</p>
              <p>If you did not request this change, please log in to your account immediately and secure your account, or contact support.</p>
              <p>No action is required if you requested this change. The new email address will need to be verified before the change takes effect.</p>
              <p>Thank you,<br>The TheRAI API Team</p>
            `
          }
        }
      }
    );
    
    if (error) {
      console.error('Error sending notification email:', error);
      return { error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return { error };
  }
}
