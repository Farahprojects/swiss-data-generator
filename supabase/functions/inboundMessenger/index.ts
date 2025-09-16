import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase Setup ──
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// ── Domain Slug Validation Function ──
const isValidDomainSlug = async (domain: string, slug: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("domain_slugs")
    .select(slug)
    .eq("domain", domain)
    .single();

  if (error || !data) {
    return false;
  }

  return data[slug] === true;
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
  
  // Validate domain and slug combination
  const isValid = await isValidDomainSlug(domain, slug);
  
  if (!isValid) {
    return new Response("Invalid domain/slug combination", {
      status: 400
    });
  }

  // Log message (admin-only table now)
  const { error: insertError } = await supabase
    .from("email_messages")
    .insert([
      {
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
