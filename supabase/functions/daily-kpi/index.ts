// supabase/functions/daily-kpi/index.ts
// UPDATED FOR MULTI-TENANT with proper event/agenda support
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const j = (b: unknown, s: number = 200) => new Response(JSON.stringify(b), {
  status: s,
  headers: {
    ...CORS,
    "content-type": "application/json"
  }
});

// ---- helpers ------------------------------------------------------------
// number -> "5.000"
const intBR = (n: number | string) => Number(n || 0).toLocaleString("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

// fraction (0.225) -> "22,5"
const pct1BR = (f: number | null | undefined) => f == null ? "—" : (Math.round(f * 1000) / 10).toString().replace(".", ",");

const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// Convert YYYY-MM-DD to DD/MM
const ddmm = (ymd: string) => isYMD(ymd) ? `${ymd.slice(8,10)}/${ymd.slice(5,7)}` : "00/00";

// Extract HH:MM from time string
const hhmmFromTime = (t?: string | null) => {
  if (!t) return "00:00";
  // If it's just HH:MM, return as is
  if (t.length === 5) return t;
  // If it's HH:MM:SS, take first 5 chars
  return t.slice(0, 5);
};

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get start and end of current week (Monday to Sunday)
function getCurrentWeekRange(): { start: string; end: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate days to Monday (if Sunday = 0, we need to go back 6 days)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Get Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  
  // Get Sunday (6 days after Monday)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // Format as YYYY-MM-DD
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday)
  };
}

// ---- env ----------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const META_TOKEN = Deno.env.get("META_TOKEN");
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";
const DEFAULT_TEMPLATE = Deno.env.get("WABA_TEMPLATE") || "daily_kpi";
const DEFAULT_LANG = Deno.env.get("WABA_LANG") || "pt_BR";

// ---- handler ------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return j({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Check for query parameters (for testing specific owner or override)
    const url = new URL(req.url);
    const specific_owner_id = url.searchParams.get("owner_id");
    const override_day = url.searchParams.get("day");
    const template = url.searchParams.get("template") || DEFAULT_TEMPLATE;
    const lang = url.searchParams.get("lang") || DEFAULT_LANG;
    const test_mode = url.searchParams.get("test") === "true";
    
    // Use yesterday's date unless overridden
    const target_day = override_day || getYesterdayDate();
    
    if (!isYMD(target_day)) {
      return j({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }

    // Get current week range for events
    const weekRange = getCurrentWeekRange();
    const events_start = url.searchParams.get("events_start") || weekRange.start;
    const events_end = url.searchParams.get("events_end") || weekRange.end;

    // Get owners to process
    let owners = [];
    
    if (specific_owner_id) {
      // Process specific owner (for testing)
      const { data: owner, error: ownerErr } = await supabase
        .from("owners")
        .select("id, phone_e164, business_name, active")
        .eq("id", specific_owner_id)
        .single();
      
      if (ownerErr || !owner) {
        return j({ error: `Owner not found: ${specific_owner_id}` }, 404);
      }
      
      owners = [owner];
      console.log(`Processing specific owner: ${owner.business_name || owner.phone_e164}`);
    } else {
      // Process ALL active owners (production mode)
      const { data: allOwners, error: ownersErr } = await supabase
        .from("owners")
        .select("id, phone_e164, business_name, active")
        .eq("active", true);
      
      if (ownersErr || !allOwners?.length) {
        return j({ error: "No active owners found" }, 404);
      }
      
      owners = allOwners;
      console.log(`Processing ${owners.length} active owners`);
    }

    // Process each owner
    const results = [];
    
    for (const owner of owners) {
      try {
        console.log(`Processing owner: ${owner.business_name || owner.phone_e164}`);
        
        // 1) Get KPI for this owner
        const { data: kpi, error: kpiErr } = await supabase.rpc("get_daily_kpi_on_date", {
          p_owner: owner.id,
          p_day: target_day
        });

        if (kpiErr) {
          console.error(`KPI error for owner ${owner.id}:`, kpiErr);
          results.push({
            owner_id: owner.id,
            business_name: owner.business_name,
            status: "error",
            error: kpiErr.message
          });
          continue;
        }

        const netSales = Number(kpi?.net_sales || 0);
        const foodCost = Number(kpi?.food_cost || 0);
        const labourCost = Number(kpi?.labour_cost || 0);

        // Skip if no sales data
        if (netSales === 0) {
          console.log(`No sales data for owner ${owner.id} on ${target_day}`);
          results.push({
            owner_id: owner.id,
            business_name: owner.business_name,
            status: "no_data",
            message: "No sales data for this day"
          });
          continue;
        }

        // 2) Prepare message variables based on template
        let variables = [];
        
        // Check if using the agenda template
        const useAgendaTemplate = template === "daily_kpis_with_agenda" || template === "daily_kpi";
        
        if (useAgendaTemplate) {
          // Get events for this owner for the week
          const { data: eventsData, error: eventsErr } = await supabase.rpc("get_events_range", {
            p_owner: owner.id,
            p_start: events_start,
            p_end: events_end
          });

          let events = [];
          if (!eventsErr && eventsData) {
            // Extract events array from the JSON response
            events = Array.isArray(eventsData.events) ? eventsData.events : [];
          }
          
          console.log(`Found ${events.length} events for owner ${owner.id} between ${events_start} and ${events_end}`);

          // Prepare event slots (need 3 events for the template)
          const eventSlots = [];
          for (let i = 0; i < 3; i++) {
            if (events[i]) {
              eventSlots.push({
                date: ddmm(String(events[i].date)),
                time: hhmmFromTime(events[i].time)
              });
            } else {
              // Empty slot
              eventSlots.push({
                date: "00/00",
                time: "00:00"
              });
            }
          }

          // Build all 11 parameters for the template
          variables = [
            ddmm(target_day),                    // {{1}} - KPI Date
            intBR(netSales),                     // {{2}} - Sales
            intBR(foodCost),                     // {{3}} - Food cost
            intBR(labourCost),                   // {{4}} - Labour cost
            String(Math.min(events.length, 3)),  // {{5}} - Number of events (max 3)
            eventSlots[0].date,                  // {{6}} - Event 1 date
            eventSlots[0].time,                  // {{7}} - Event 1 time
            eventSlots[1].date,                  // {{8}} - Event 2 date
            eventSlots[1].time,                  // {{9}} - Event 2 time
            eventSlots[2].date,                  // {{10}} - Event 3 date
            eventSlots[2].time                   // {{11}} - Event 3 time
          ];
          
          console.log(`Prepared ${variables.length} variables for template ${template}`);
        } else {
          // Simple template with just 4 KPI parameters
          variables = [
            ddmm(target_day),
            intBR(netSales),
            intBR(foodCost),
            intBR(labourCost)
          ];
        }

        // 3) Send WhatsApp message (skip if test mode)
        if (test_mode) {
          console.log(`TEST MODE - Would send to ${owner.phone_e164}:`, variables);
          results.push({
            owner_id: owner.id,
            business_name: owner.business_name,
            status: "test_mode",
            phone: owner.phone_e164,
            template: template,
            variables,
            kpi
          });
          continue;
        }

        const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
        const isHelloWorld = template === "hello_world";
        
        const body = {
          messaging_product: "whatsapp",
          to: owner.phone_e164,
          type: "template",
          template: {
            name: template,
            language: { code: lang },
            ...isHelloWorld ? {} : {
              components: [{
                type: "body",
                parameters: variables.map(v => ({
                  type: "text",
                  text: String(v)
                }))
              }]
            }
          }
        };

        console.log(`Sending WhatsApp with template ${template} and ${variables.length} parameters`);

        const waRes = await fetch(waUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const waText = await waRes.text();
        let waJson = null;
        try {
          waJson = JSON.parse(waText);
        } catch {
          waJson = { raw: waText };
        }

        // 4) Log delivery
        const logRow = {
          owner_id: owner.id,
          day: target_day,
          channel: "whatsapp",
          to_e164: owner.phone_e164,
          template_name: template,
          payload: {
            variables: isHelloWorld ? [] : variables,
            kpi,
            kpi_day: target_day,
            events_range: { start: events_start, end: events_end }
          },
          wa_status: String(waRes.status),
          wa_response: waJson
        };

        await supabase.from("delivery_logs").insert(logRow);

        results.push({
          owner_id: owner.id,
          business_name: owner.business_name,
          status: waRes.status === 200 ? "sent" : "failed",
          phone: owner.phone_e164,
          template: template,
          wa_status: waRes.status,
          wa_response: waJson
        });

        console.log(`${waRes.status === 200 ? '✅' : '❌'} WhatsApp status ${waRes.status} for ${owner.business_name || owner.phone_e164}`);

      } catch (ownerError) {
        console.error(`Error processing owner ${owner.id}:`, ownerError);
        results.push({
          owner_id: owner.id,
          business_name: owner.business_name,
          status: "error",
          error: ownerError?.message || String(ownerError)
        });
      }
    }

    // Summary
    const summary = {
      date: target_day,
      week_range: { start: events_start, end: events_end },
      total_owners: owners.length,
      sent: results.filter(r => r.status === "sent").length,
      no_data: results.filter(r => r.status === "no_data").length,
      errors: results.filter(r => r.status === "error" || r.status === "failed").length,
      test_mode: test_mode
    };

    return j({
      ok: true,
      summary,
      results
    });

  } catch (e) {
    console.error("Fatal error in daily-kpi:", e);
    return j({
      error: e?.message || String(e)
    }, 500);
  }
});
