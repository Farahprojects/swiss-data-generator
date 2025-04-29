import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({ message: "Function is alive!" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
});
