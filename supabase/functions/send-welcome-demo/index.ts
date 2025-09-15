// supabase/functions/send-welcome-demo/index.ts
// Sends welcome_message_demo template to specified owner via WhatsApp

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define the Owner interface for type safety
interface Owner {
  id: string;
  business_name: string;
  manager_phone_e164: string;
  tz?: string;
}

interface OwnerPhoneRow {
  id: string;
  business_name: string;
  phone_e164?: string | null;
  tz?: string | null;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// Helper to return JSON responses
const jsonResponse = (body: unknown, status: number = 200) => 
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" }
  });

// WhatsApp API response typing and guard
type WaMessage = { id?: string };
type WaResponse = { messages?: WaMessage[] };

function isWaResponse(val: unknown): val is WaResponse {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  if (!("messages" in obj)) return false;
  const msgs = obj.messages as unknown;
  if (msgs == null) return true;
  if (!Array.isArray(msgs)) return false;
  for (const m of msgs) {
    if (!m || typeof m !== "object") return false;
    const mo = m as Record<string, unknown>;
    if ("id" in mo && mo.id != null && typeof mo.id !== "string") return false;
  }
  return true;
}

serve(async (req) => {
  console.log("[WELCOME-DEMO] Function started", new Date().toISOString());
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    // Environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
    const META_TOKEN = Deno.env.get("META_TOKEN");
    const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";
    const TEMPLATE_LANG = Deno.env.get("WABA_LANG") || "pt_BR";

    // Template name is hardcoded as requested
    const TEMPLATE_NAME = "welcome_message_demo";

    console.log("[WELCOME-DEMO] Environment check:", {
      has_supabase_url: !!SUPABASE_URL,
      has_service_role: !!SERVICE_ROLE,
      has_whatsapp_id: !!WHATSAPP_PHONE_ID,
      has_meta_token: !!META_TOKEN,
      template_name: TEMPLATE_NAME,
      template_lang: TEMPLATE_LANG,
      graph_version: GRAPH_VERSION
    });

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required Supabase environment variables");
    }

    if (!WHATSAPP_PHONE_ID || !META_TOKEN) {
      throw new Error("Missing required WhatsApp/Meta environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Parse request parameters
    const url = new URL(req.url);
    let ownerId = url.searchParams.get("owner_id") || url.searchParams.get("ownerId");
    let phoneNumber = url.searchParams.get("phone_number") || url.searchParams.get("to") || url.searchParams.get("phone"); // Optional: direct phone number

    // Optionally accept POST JSON body too
    if (!ownerId && !phoneNumber && req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        ownerId = ownerId || body?.owner_id || body?.ownerId || null;
        phoneNumber = phoneNumber || body?.phone_number || body?.to || body?.phone || null;
      } catch (_) {
        // ignore body parse errors
      }
    }

    // Fallback to env defaults for demo usage (similar to event-reminder)
    if (!ownerId && !phoneNumber) {
      const ENV_OWNER = Deno.env.get("OWNER_ID") || undefined;
      const ENV_TO = Deno.env.get("OWNER_PHONE_E164") || Deno.env.get("WELCOME_DEMO_TO") || undefined;
      ownerId = ENV_OWNER || null;
      phoneNumber = ENV_TO || null;
    }

    console.log("[WELCOME-DEMO] Request params:", {
      ownerId,
      phoneNumber,
      url: req.url
    });

    if (!ownerId && !phoneNumber) {
      return jsonResponse({
        success: false,
        error: "Missing required parameter: owner_id or phone_number"
      }, 400);
    }

    let targetPhone: string | null = null;
    let owner: Owner | null = null;

    // If phone number is provided directly, use it
    if (phoneNumber) {
      targetPhone = phoneNumber;
      console.log("[WELCOME-DEMO] Using provided phone number:", targetPhone);
    } 
    // Otherwise, fetch from owner record
    else if (ownerId) {
      // First try manager_phone_e164 (used by closing-reminder)
      const { data, error } = await supabase
        .from("owners")
        .select("id, business_name, manager_phone_e164, tz")
        .eq("id", ownerId)
        .single();

      if (error) {
        console.error("[WELCOME-DEMO] Error fetching owner:", error);
        return jsonResponse({
          success: false,
          error: `Owner not found: ${error.message}`
        }, 404);
      }

      // prefer manager_phone_e164; if absent, try fetching phone_e164
      let resolvedPhone = data?.manager_phone_e164 as string | null | undefined;
      if (!resolvedPhone) {
        const { data: data2, error: e2 } = await supabase
          .from("owners")
          .select("id, business_name, phone_e164, tz")
          .eq("id", ownerId)
          .single();
        if (!e2 && (data2 as OwnerPhoneRow)?.phone_e164) {
          const row = data2 as OwnerPhoneRow;
          resolvedPhone = row.phone_e164 as string;
          // Merge minimal owner info
          owner = {
            id: row.id,
            business_name: row.business_name,
            manager_phone_e164: resolvedPhone,
            tz: row.tz ?? undefined
          };
        } else {
          console.error("[WELCOME-DEMO] Owner has no phone number");
          return jsonResponse({
            success: false,
            error: "Owner has no registered phone number"
          }, 400);
        }
      }

      // If owner not set via fallback branch, set from first query
      if (!owner) owner = data as Owner;
      targetPhone = resolvedPhone as string;
      console.log("[WELCOME-DEMO] Found owner:", {
        id: owner.id,
        business_name: owner.business_name,
        phone: targetPhone
      });
    }

    // Sanitize phone: WhatsApp API typically expects digits only (E.164 without "+")
    if (!targetPhone) {
      return jsonResponse({ success: false, error: "No target phone resolved" }, 400);
    }
    targetPhone = targetPhone.replace(/\D/g, "");
    if (!targetPhone) {
      return jsonResponse({ success: false, error: "Invalid phone_number after sanitization" }, 400);
    }

    // Prepare WhatsApp API request
    const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
    
    // Template without variables
    const template = {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANG }
    } as const;

    const waBody = {
      messaging_product: "whatsapp",
      to: targetPhone,
      type: "template",
      template
    };

    console.log("[WELCOME-DEMO] Sending WhatsApp request to:", waUrl);
    console.log("[WELCOME-DEMO] Request body:", JSON.stringify(waBody, null, 2));
    
    // Send WhatsApp message
    const waResponse = await fetch(waUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(waBody)
    });
    
    console.log("[WELCOME-DEMO] WhatsApp response status:", waResponse.status);

    let waResult: unknown = null;
    try {
      waResult = await waResponse.json();
    } catch (_) {
      const txt = await waResponse.text().catch(() => "");
      waResult = { raw: txt };
    }
    console.log("[WELCOME-DEMO] WhatsApp response body:", JSON.stringify(waResult, null, 2));

    // Log delivery if we have an owner_id
    if (ownerId) {
      const today = new Date().toISOString().split('T')[0];
      const { error: logError } = await supabase
        .from("delivery_logs")
        .insert({
          owner_id: ownerId,
          day: today,
          channel: "whatsapp",
          to_e164: targetPhone,
          template_name: TEMPLATE_NAME,
          payload: {
            business_name: owner?.business_name,
            trigger: "manual",
            type: "welcome_demo"
          },
          wa_status: String(waResponse.status),
          wa_response: waResult
        });
      if (logError) {
        console.error("[WELCOME-DEMO] Failed to log delivery:", logError);
      } else {
        console.log("[WELCOME-DEMO] Delivery logged successfully");
      }
    }

    // Check if WhatsApp request was successful
    if (!waResponse.ok) {
      console.error("[WELCOME-DEMO] WhatsApp API error:", waResult);
      return jsonResponse({
        success: false,
        error: "Failed to send WhatsApp message",
        details: waResult
      }, waResponse.status);
    }

    // Return success response
    const messageId = isWaResponse(waResult) ? waResult.messages?.[0]?.id : undefined;
    return jsonResponse({
      success: true,
      message: "Welcome demo message sent successfully",
      result: {
        to: targetPhone,
        template: TEMPLATE_NAME,
        owner_id: ownerId,
        business_name: owner?.business_name,
        wa_message_id: messageId,
        wa_response: waResult
      }
    });

  } catch (error) {
    console.error("[WELCOME-DEMO] Fatal error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});


