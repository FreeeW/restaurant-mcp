// supabase/functions/generate-owner-links/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { owner_id } = await req.json();
    
    if (!owner_id) {
      return new Response(
        JSON.stringify({ error: "owner_id is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify owner exists
    const { data: owner, error: ownerError } = await supabase
      .from("owners")
      .select("id, phone_e164, business_name, email")
      .eq("id", owner_id)
      .single();

    if (ownerError || !owner) {
      return new Response(
        JSON.stringify({ error: "Owner not found" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Check if token already exists for this owner
    const { data: existingToken } = await supabase
      .from("owner_tokens")
      .select("token")
      .eq("owner_id", owner_id)
      .eq("active", true)
      .single();

    let token;
    
    if (existingToken) {
      token = existingToken.token;
      console.log(`Using existing token for owner ${owner_id}`);
    } else {
      // Generate new token
      token = crypto.randomUUID();
      
      // Save token to database
      const { error: tokenError } = await supabase
        .from("owner_tokens")
        .insert({
          token,
          owner_id,
          metadata: { 
            generated_by: "generate-owner-links",
            purpose: "forms"
          }
        });

      if (tokenError) {
        console.error("Error saving token:", tokenError);
        return new Response(
          JSON.stringify({ error: "Failed to generate token" }),
          { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Generated new token for owner ${owner_id}`);
    }

    // Get form configurations
    const { data: formConfigs, error: configError } = await supabase
      .from("form_config")
      .select("*");

    if (configError || !formConfigs) {
      return new Response(
        JSON.stringify({ error: "Failed to get form configurations" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Generate pre-filled links
    const links: Record<string, string> = {};
    
    for (const config of formConfigs) {
      const url = new URL(`https://docs.google.com/forms/d/e/${config.form_id}/viewform`);
      url.searchParams.set("usp", "pp_url");
      url.searchParams.set(config.token_entry_id, token);
      
      links[config.form_type] = url.toString();
    }

    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        owner_id,
        owner_name: owner.business_name || owner.phone_e164,
        token,
        links,
        message: "Links generated successfully. Save these links for daily use."
      }),
      { 
        status: 200, 
        headers: { ...CORS, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in generate-owner-links:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
