// // supabase/functions/daily-kpi/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
const j = (b: unknown, s: number = 200)=>new Response(JSON.stringify(b), {
    status: s,
    headers: {
      ...CORS,
      "content-type": "application/json"
    }
  });
// ---- helpers ------------------------------------------------------------
// number -> "5.000"
const intBR = (n: number | string)=>Number(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
// fraction (0.225) -> "22,5"
const pct1BR = (f: number | null | undefined)=>f == null ? "—" : (Math.round(f * 1000) / 10).toString().replace(".", ",");
const isYMD = (s: string)=>/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const ddmm = (ymd: string)=>isYMD(ymd) ? `${ymd.slice(8,10)}/${ymd.slice(5,7)}` : "00/00";
const hhmmFromTime = (t?: string | null)=> (t ?? "").slice(0,5) || "00:00";
// ---- env ----------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const META_TOKEN = Deno.env.get("META_TOKEN");
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";
const DEFAULT_TEMPLATE = Deno.env.get("WABA_TEMPLATE") || "hello_world";
const DEFAULT_LANG = Deno.env.get("WABA_LANG") || "en_US";
// MVP single-owner (override via query if quiser)
const DEFAULT_OWNER_ID = Deno.env.get("OWNER_ID") || "";
const DEFAULT_TO = Deno.env.get("OWNER_PHONE_E164") || "";
// ---- handler ------------------------------------------------------------
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: CORS
  });
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
    // params
    const url = new URL(req.url);
    const owner_id = url.searchParams.get("owner_id") || DEFAULT_OWNER_ID;
    const to = url.searchParams.get("to") || DEFAULT_TO;
    const day = url.searchParams.get("day") || ""; // YYYY-MM-DD (required)
    const template = url.searchParams.get("template") || DEFAULT_TEMPLATE; // "daily_kpi" em produção
    const lang = url.searchParams.get("lang") || DEFAULT_LANG; // "pt_BR" em produção
    const events_start = url.searchParams.get("events_start") || ""; // optional for agenda template
    const events_end = url.searchParams.get("events_end") || "";   // optional for agenda template
    if (!owner_id || !to || !isYMD(day)) return j({
      error: "Missing owner_id/to/day (YYYY-MM-DD)"
    }, 400);
    // 1) KPI detalhado do dia (percentuais, vendas e custos)
    const { data: kpi, error: kpiErr } = await supabase.rpc("get_daily_kpi_on_date", {
      p_owner: owner_id,
      p_day: day
    });
    if (kpiErr) return j({
      error: kpiErr.message
    }, 500);
    const netSales = Number(kpi?.net_sales || 0);
    const foodCost = Number(kpi?.food_cost || 0);
    const labourCost = Number(kpi?.labour_cost || 0);
    // 3) Variables depending on template
    // Existing KPI numbers:
    const variablesKpi = [
      ddmm(day),
      intBR(netSales),
      intBR(foodCost),
      intBR(labourCost) // {{4}}
    ];
    let variables = variablesKpi;
    // If using the long template with agenda, append week events (next Monday .. Sunday)
    if (template === "daily_kpis_with_agenda") {
      if (!isYMD(events_start) || !isYMD(events_end)) {
        variables = variablesKpi; // fallback to KPI-only
      } else {
        const { data: eventsJson, error: evErr } = await supabase.rpc("get_events_range", {
          p_owner: owner_id,
          p_start: events_start,
          p_end: events_end
        });
        if (evErr) return j({ error: evErr.message }, 500);
        const evs = Array.isArray(eventsJson?.events) ? eventsJson.events : [];
        const slot = (i)=>{
          const ev = evs[i];
          if (!ev) return { ddmm: "00/00", hhmm: "00:00" };
          return { ddmm: ddmm(String(ev.date)), hhmm: hhmmFromTime(ev.time) };
        };
        const s1 = slot(0), s2 = slot(1), s3 = slot(2);
        const count = Math.min(evs.length, 3);
        variables = [
          ...variablesKpi,
          String(count),
          s1.ddmm, s1.hhmm,
          s2.ddmm, s2.hhmm,
          s3.ddmm, s3.hhmm
        ];
      }
    } else {
      // legacy/simple (only KPI numbers)
      variables = variablesKpi;
    }
    // 4) Enviar via WhatsApp Template
    const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
    const isHelloWorld = template === "hello_world";
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: {
          code: lang
        },
        ...isHelloWorld ? {} : {
          components: [
            {
              type: "body",
              parameters: variables.map((v)=>({
                  type: "text",
                  text: String(v)
                }))
            }
          ]
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
    } catch  {
      waJson = {
        raw: waText
      };
    }
    // 5) Log
    const logRow = {
      owner_id,
      day,
      channel: "whatsapp",
      to_e164: to,
      template_name: template,
      payload: {
        variables: isHelloWorld ? [] : variables,
        kpi,
        kpi_day: day
      },
      wa_status: String(waRes.status),
      wa_response: waJson
    };
    await supabase.from("delivery_logs").insert(logRow);
    return j({
      ok: true,
      owner_id,
      day,
      to,
      wa_status: waRes.status,
      wa_response: waJson
    });
  } catch (e) {
    return j({
      error: e?.message || String(e)
    }, 500);
  }
});
