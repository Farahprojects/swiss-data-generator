import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase Setup ──
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// ── Security Utilities ──
const sanitizeString = (input: string, maxLength = 10000): string => {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const sanitizeHeaders = (headers: any): string => {
  try {
    // Convert to string and limit length to prevent huge payloads
    const headerString = typeof headers === 'string' ? headers : JSON.stringify(headers);
    return sanitizeString(headerString, 50000);
  } catch {
    return 'Invalid headers format';
  }
};

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

  // Input validation and sanitization
  if (!from_email || !to_email || !body || !direction) {
    return new Response("Missing required fields", {
      status: 400
    });
  }

  // Validate email formats
  if (!isValidEmail(from_email) || !isValidEmail(to_email)) {
    return new Response("Invalid email format", {
      status: 400
    });
  }

  // Validate direction
  if (!['incoming', 'outgoing'].includes(direction)) {
    return new Response("Invalid direction", {
      status: 400
    });
  }

  // Sanitize all inputs
  const sanitizedFromEmail = sanitizeString(from_email, 254);
  const sanitizedToEmail = sanitizeString(to_email, 254);
  const sanitizedSubject = sanitizeString(subject || '', 998); // RFC 5322 limit
  const sanitizedBody = sanitizeString(body, 1000000); // 1MB limit
  const sanitizedHeaders = sanitizeHeaders(raw_headers);

  // Parse slug and domain from recipient
  const [slug, domain] = sanitizedToEmail.toLowerCase().split("@");
  
  // Additional validation for slug and domain
  if (!slug || !domain || slug.length > 64 || domain.length > 253) {
    return new Response("Invalid email format", {
      status: 400
    });
  }
  
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
        from_address: sanitizedFromEmail,
        to_address: sanitizedToEmail,
        subject: sanitizedSubject,
        body: sanitizedBody,
        direction,
        raw_headers: sanitizedHeaders
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
