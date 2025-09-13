// supabase/functions/closing-reminder/index.ts
// Sends daily closing reminder to managers via WhatsApp template

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define the Owner interface for type safety
interface Owner {
  id: string;
  business_name: string;
  manager_phone_e164: string;
  closing_time: string;
  tz: string;
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

// Get current time in timezone
function getCurrentTimeInTZ(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  
  const hour = parts.find(p => p.type === "hour")?.value ?? "00";
  const minute = parts.find(p => p.type === "minute")?.value ?? "00";
  
  return `${hour}:${minute}`;
}

// Check if current time matches target time (within 5 minute window)
function isTimeToSend(currentTime: string, targetTime: string): boolean {
  const [currHour, currMin] = currentTime.split(':').map(Number);
  const [targetHour, targetMin] = targetTime.split(':').map(Number);
  
  const currMinutes = currHour * 60 + currMin;
  const targetMinutes = targetHour * 60 + targetMin;
  
  const diff = Math.abs(currMinutes - targetMinutes);
  return diff <= 5; // Within 5 minute window
}

serve(async (req) => {
  console.log("[CLOSING-REMINDER] Function started", new Date().toISOString());
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
    const CLOSING_TEMPLATE = Deno.env.get("WABA_CLOSING_TEMPLATE") || "closing_reminder";
    const TEMPLATE_LANG = Deno.env.get("WABA_LANG") || "pt_BR";
    const TEMPLATE_HAS_VARS = (Deno.env.get("WABA_TEMPLATE_HAS_VARS") ?? "false") === "true";

    console.log("[CLOSING-REMINDER] Environment check:", {
      has_supabase_url: !!SUPABASE_URL,
      has_service_role: !!SERVICE_ROLE,
      has_whatsapp_id: !!WHATSAPP_PHONE_ID,
      has_meta_token: !!META_TOKEN,
      template_name: CLOSING_TEMPLATE,
      template_has_vars: TEMPLATE_HAS_VARS
    });

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Check if this is a manual trigger or scheduled run
    const url = new URL(req.url);
    const manualOwnerId = url.searchParams.get("owner_id");
    const forceRun = url.searchParams.get("force") === "true";

    console.log("[CLOSING-REMINDER] Query params:", {
      manualOwnerId,
      forceRun,
      url: req.url
    });

    let owners: Owner[] = [];

    if (manualOwnerId) {
      // Manual trigger for specific owner
      const { data, error } = await supabase
        .from("owners")
        .select("id, business_name, manager_phone_e164, closing_time, tz")
        .eq("id", manualOwnerId)
        .single();

      if (error) {
        console.error("[CLOSING-REMINDER] Error fetching manual owner:", error);
        throw error;
      }
      console.log("[CLOSING-REMINDER] Manual owner data:", data);
      if (data && data.manager_phone_e164) {
        owners = [data];
      } else {
        console.log("[CLOSING-REMINDER] Owner has no manager phone");
      }
    } else {
      // Scheduled run - find owners that need reminders now
      const { data, error } = await supabase
        .from("owners")
        .select("id, business_name, manager_phone_e164, closing_time, tz")
        .eq("closing_reminder_enabled", true)
        .not("manager_phone_e164", "is", null);

      if (error) {
        console.error("[CLOSING-REMINDER] Error fetching owners:", error);
        throw error;
      }
      
      console.log("[CLOSING-REMINDER] Found owners with reminders enabled:", data?.length || 0);
      
      // Filter owners where it's time to send
      const allOwners = data || [];
      owners = allOwners.filter(owner => {
        const tz = owner.tz || "America/Sao_Paulo";
        const currentTime = getCurrentTimeInTZ(tz);
        const targetTime = owner.closing_time || "21:30";
        
        const shouldSend = forceRun || isTimeToSend(currentTime, targetTime);
        console.log(`[CLOSING-REMINDER] Owner ${owner.id}: tz=${tz}, current=${currentTime}, target=${targetTime}, shouldSend=${shouldSend}`);
        return shouldSend;
      });
      
      console.log(`[CLOSING-REMINDER] Filtered to ${owners.length} owners for processing`);
    }

    console.log("[CLOSING-REMINDER] Processing", owners.length, "owners");
    const results = [];
    
    for (const owner of owners) {
      console.log(`[CLOSING-REMINDER] Processing owner ${owner.id} (${owner.business_name})`);
      try {
        // Check if we already sent a reminder today
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from("pending_sales_input")
          .select("id")
          .eq("owner_id", owner.id)
          .gte("reminder_sent_at", `${today}T00:00:00`)
          .single();

        if (existing && !forceRun) {
          console.log(`[CLOSING-REMINDER] Skipping ${owner.id} - already sent today`);
          results.push({
            owner_id: owner.id,
            status: "skipped",
            reason: "already_sent_today"
          });
          continue;
        }
        console.log(`[CLOSING-REMINDER] No existing reminder for ${owner.id} today, proceeding...`);

        // Create pending sales input record
        const { data: pending, error: pendingError } = await supabase
          .from("pending_sales_input")
          .insert({
            owner_id: owner.id,
            manager_phone: owner.manager_phone_e164,
            status: 'pending'
          })
          .select()
          .single();

        if (pendingError) {
          console.error(`[CLOSING-REMINDER] Error creating pending record:`, pendingError);
          throw pendingError;
        }
        console.log(`[CLOSING-REMINDER] Created pending record:`, pending.id);

        // Send WhatsApp template
        const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
        
        // Extract first name from business name or use generic
        const firstName = owner.business_name?.split(' ')[0] || "Gestor";
        console.log(`[CLOSING-REMINDER] Preparing WhatsApp message:`, {
          to: owner.manager_phone_e164,
          template: CLOSING_TEMPLATE,
          firstName: firstName
        });
        
        const template: Record<string, unknown> = {
          name: CLOSING_TEMPLATE,
          language: { code: TEMPLATE_LANG }
        };
        if (TEMPLATE_HAS_VARS) {
          (template as Record<string, unknown>)["components"] = [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: firstName
                }
              ]
            }
          ];
        }

        const waBody = {
          messaging_product: "whatsapp",
          to: owner.manager_phone_e164,
          type: "template",
          template
        };

        console.log(`[CLOSING-REMINDER] Sending WhatsApp request to:`, waUrl);
        console.log(`[CLOSING-REMINDER] Request body:`, JSON.stringify(waBody, null, 2));
        
        const waResponse = await fetch(waUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${META_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(waBody)
        });
        
        console.log(`[CLOSING-REMINDER] WhatsApp response status:`, waResponse.status);

        const waResult = await waResponse.json();
        console.log(`[CLOSING-REMINDER] WhatsApp response body:`, JSON.stringify(waResult, null, 2));

        // Log delivery
        await supabase
          .from("delivery_logs")
          .insert({
            owner_id: owner.id,
            day: today,  // Add day field like daily-kpi does
            channel: "whatsapp",
            to_e164: owner.manager_phone_e164,
            template_name: CLOSING_TEMPLATE,
            payload: {
              pending_id: pending.id,
              business_name: owner.business_name
            },
            wa_status: String(waResponse.status),
            wa_response: waResult
          });

        results.push({
          owner_id: owner.id,
          business: owner.business_name,
          to: owner.manager_phone_e164,
          status: waResponse.ok ? "sent" : "failed",
          pending_id: pending.id,
          wa_response: waResult
        });

      } catch (error) {
        console.error(`[CLOSING-REMINDER] Error processing owner ${owner.id}:`, error);
        results.push({
          owner_id: owner.id,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error("[CLOSING-REMINDER] Fatal error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
