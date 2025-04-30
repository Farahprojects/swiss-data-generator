
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*─────────────────────────── ENV */
const SWISS_TRANSLATOR_URL = Deno.env.get("ASTRO_GATEWAY_URL")!; // e.g. https://<ref>.functions.supabase.co/astro_gateway
if (!SWISS_TRANSLATOR_URL) throw new Error("ASTRO_GATEWAY_URL env var missing");

const SB_URL  = Deno.env.get("SUPABASE_URL")!;
const SB_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SB_URL || !SB_KEY) throw new Error("Supabase env vars missing");
const sb = createClient(SB_URL, SB_KEY);

/*─────────────────────────── CONFIG */
const MAX_BODY = 1_048_576; // 1 MB
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s=200)=>new Response(JSON.stringify(b),{status:s,headers:corsHeaders});

/*─────────────────────────── Helpers */
async function readBody(req: Request): Promise<Uint8Array> {
  const ab = await req.arrayBuffer();
  if (ab.byteLength > MAX_BODY) throw new Error("Body too large");
  return new Uint8Array(ab);
}

function extractApiKey({headers, url, bodyBytes}:{headers:Headers; url:URL; bodyBytes?:Uint8Array}): string|null {
  // A) Authorization header
  const auth = headers.get("authorization");
  if (auth){
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : auth;
  }
  // B) query param
  const qp = url.searchParams.get("api_key");
  if (qp) return qp;
  // C) body JSON { api_key }
  if(bodyBytes){
    try{
      const txt = new TextDecoder().decode(bodyBytes);
      console.log("Decoded body:", txt); // Debug log
      const j = JSON.parse(txt);
      if(typeof j?.api_key === "string") return j.api_key;
    }catch(e){ 
      console.error("Error parsing JSON body:", e);
    }
  }
  return null;
}

async function validateKey(k:string){
  const {data,error}=await sb.from("api_keys").select("user_id,is_active").eq("api_key",k).maybeSingle();
  if(error) throw new Error(error.message);
  return data&&data.is_active? data.user_id as string : null;
}

async function recordUsage(uid:string){
  await sb.from("api_usage").insert({user_id:uid});
}

/*─────────────────────────── Handler */
serve(async (req)=>{
  console.log("Request received:", req.method, req.url);
  
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
  if(!["GET","POST"].includes(req.method)) return json({success:false,message:"Method not allowed"},405);

  // Clone the request before reading the body
  const bodyBytes = req.method==="POST" ? new Uint8Array(await req.clone().arrayBuffer()) : undefined;
  
  const urlObj = new URL(req.url);
  const apiKey = extractApiKey({headers:req.headers,url:urlObj,bodyBytes});
  console.log("API Key extracted:", apiKey ? "present" : "missing");
  
  if(!apiKey) return json({success:false,message:"API key required"},401);

  const userId = await validateKey(apiKey);
  console.log("User ID from key validation:", userId);
  
  if(!userId) return json({success:false,message:"Invalid or inactive API key"},401);
  recordUsage(userId).catch((e)=>{
    console.error("Error recording usage:", e);
  }); // fire‑and‑forget

  /*────────────────── forward to translator */
  // remove api_key from query to avoid confusing downstream
  urlObj.searchParams.delete("api_key");
  
  console.log("Forwarding request to:", SWISS_TRANSLATOR_URL + urlObj.search);

  const fwdHeaders = new Headers(req.headers);
  fwdHeaders.delete("authorization");        // internal call needs no bearer
  // ensure proper CT for POST
  if(req.method==="POST" && !fwdHeaders.get("content-type"))
    fwdHeaders.set("Content-Type","application/json");

  try {
    const resp = await fetch(SWISS_TRANSLATOR_URL + urlObj.search, {
      method: req.method,
      headers: fwdHeaders,
      body: bodyBytes,
    });

    console.log("Response status from translator:", resp.status);
    
    // pipe result + CORS
    const txt = await resp.text();
    return new Response(txt,{status:resp.status,headers:{...corsHeaders}});
  } catch(error) {
    console.error("Error forwarding request:", error);
    return json({success:false,message:"Error forwarding request: " + error.message},500);
  }
});
