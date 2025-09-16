import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase Setup ──
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// ── Domain to Column Mapping ──
const DOMAIN_COLUMN_MAP = {
  "therai.coach": "slug_coach",
  "therai.win": "slug_win",
  "therai.life": "slug_life",
  "therai.store": "slug_store",
  "therai.co": "slug_co"
};

// ── Main ──
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }

  const payload = await req.json();
  const { from_email, to_email, subject, body, raw_headers, direction } = payload;

  if (!from_email || !to_email || !body || !direction) {
    return new Response("Missing required fields", {
      status: 400
    });
  }

  // Parse slug and domain from recipient
  const [slug, domain] = to_email.toLowerCase().split("@");
  const column = DOMAIN_COLUMN_MAP[domain];

  if (!column) {
    return new Response("Unsupported domain", {
      status: 400
    });
  }

  // Lookup user
  const { data: users, error: userError } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq(column, slug)
    .limit(1);

  if (userError || !users?.length) {
    console.error("User lookup failed", userError);
    return new Response("Unknown recipient", {
      status: 404
    });
  }

  const user_id = users[0].user_id;

  // Optional client match
  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("coach_user_id", user_id)
    .eq("email", from_email)
    .limit(1);

  const client_id = clients?.[0]?.id || null;

  // Log message
  const { error: insertError } = await supabase
    .from("email_messages")
    .insert([
      {
        user_id,
        client_id,
        from_address: from_email,
        to_address: to_email,
        subject,
        body,
        direction,
        raw_headers
      }
    ]);

  if (insertError) {
    console.error("Insert failed", insertError);
    return new Response("Database error", {
      status: 500
    });
  }

  return new Response("Message logged", {
    status: 200
  });
});
