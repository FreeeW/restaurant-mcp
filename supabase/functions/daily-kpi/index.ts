// supabase/functions/daily-kpi/index.ts
// UPDATED FOR MULTI-TENANT: Processes all active owners
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

const ddmm = (ymd: string) => isYMD(ymd) ? `${ymd.slice(8,10)}/${ymd.slice(5,7)}` : "00/00";

const hhmmFromTime = (t?: string | null) => (t ?? "").slice(0,5) || "00:00";

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---- env ----------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const META_TOKEN = Deno.env.get("META_TOKEN");
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";
const DEFAULT_TEMPLATE = Deno.env.get("WABA_TEMPLATE") || "hello_world";
const DEFAULT_LANG = Deno.env.get("WABA_LANG") || "en_US";

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

        // 2) Prepare WhatsApp message variables
        const variables = [
          ddmm(target_day),           // {{1}} - Date
          intBR(netSales),            // {{2}} - Sales
          intBR(foodCost),            // {{3}} - Food cost
          intBR(labourCost)           // {{4}} - Labour cost
        ];

        // 3) Send WhatsApp message (skip if test mode)
        if (test_mode) {
          console.log(`TEST MODE - Would send to ${owner.phone_e164}:`, variables);
          results.push({
            owner_id: owner.id,
            business_name: owner.business_name,
            status: "test_mode",
            phone: owner.phone_e164,
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
            kpi_day: target_day
          },
          wa_status: String(waRes.status),
          wa_response: waJson
        };

        await supabase.from("delivery_logs").insert(logRow);

        results.push({
          owner_id: owner.id,
          business_name: owner.business_name,
          status: "sent",
          phone: owner.phone_e164,
          wa_status: waRes.status,
          wa_response: waJson
        });

        console.log(`✅ Sent KPI to ${owner.business_name || owner.phone_e164}`);

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
      total_owners: owners.length,
      sent: results.filter(r => r.status === "sent").length,
      no_data: results.filter(r => r.status === "no_data").length,
      errors: results.filter(r => r.status === "error").length,
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
