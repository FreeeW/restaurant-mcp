// supabase/functions/event-reminder/index.ts
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
// ----------------- Helpers específicos (não migrados) -----------------
// TODO: Move date/time calc to a future MCP "dates" tool when available.
function ymdInTZ(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const y = parts.find((p)=>p.type === "year")?.value ?? "0000";
  const m = parts.find((p)=>p.type === "month")?.value ?? "00";
  const da = parts.find((p)=>p.type === "day")?.value ?? "00";
  return `${y}-${m}-${da}`;
}
function hhFromTime(t?: string | null) {
  if (!t) return "00";
  const [hh] = String(t).split(":");
  return `${hh.padStart(2, "0")}`;
}
function nowInTZ(tz: string) {
  // Obtem "agora" no TZ dado convertendo via string YYYY-MM-DDTHH:mm
  const ymd = ymdInTZ(new Date(), tz);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const hh = parts.find((p)=>p.type === "hour")?.value ?? "00";
  const mm = parts.find((p)=>p.type === "minute")?.value ?? "00";
  // cria um Date "ancorado" no UTC mas representando local
  return new Date(`${ymd}T${hh}:${mm}:00`);
}
function minutesDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}
function parseLocalEventDateTime(ymd: string, time?: string | null, tz?: string) {
  const hhmm = (time ?? "00:00").slice(0, 5);
  // Monta um Date assumindo ser "local clock" daquele TZ (aprox. suficiente p/ comparação de minutos)
  return new Date(`${ymd}T${hhmm}:00`);
}
// ----------------- ENV -----------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const META_TOKEN = Deno.env.get("META_TOKEN");
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";
const TEMPLATE_REMINDER = Deno.env.get("WABA_EVENT_TEMPLATE") || "event_reminder"; // << use "event_reminder"
const LANG = Deno.env.get("WABA_LANG") || "pt_BR";
// Defaults para teste manual
const DEFAULT_OWNER_ID = Deno.env.get("OWNER_ID") || "";
const DEFAULT_TO = Deno.env.get("OWNER_PHONE_E164") || "";
// ----------------- Handler -----------------
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: CORS
  });
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    // Query params para teste pontual
    const url = new URL(req.url);
    const qp_owner = url.searchParams.get("owner_id") || undefined;
    const qp_to = url.searchParams.get("to") || undefined;
    // 1) Carrega owners
    let owners = [];
    if (qp_owner && qp_to) {
      owners = [
        {
          id: qp_owner,
          phone_e164: qp_to,
          tz: "America/Sao_Paulo"
        }
      ];
    } else if (DEFAULT_OWNER_ID && DEFAULT_TO) {
      owners = [
        {
          id: DEFAULT_OWNER_ID,
          phone_e164: DEFAULT_TO,
          tz: "America/Sao_Paulo"
        }
      ];
    } else {
      const { data: rows, error } = await sb.from("owners").select("id, phone_e164, tz, active").eq("active", true).not("phone_e164", "is", null);
      if (error) return j({
        error: error.message
      }, 500);
      owners = (rows || []).map((r)=>({
          id: r.id,
          phone_e164: r.phone_e164,
          tz: r.tz || "America/Sao_Paulo"
        }));
    }
    const results = [];
    for (const o of owners){
      const tz = o.tz || "America/Sao_Paulo";
      const nowLocal = nowInTZ(tz);
      const targetLocal = new Date(nowLocal.getTime() + 60 * 60000); // +60 min
      const todayISO = ymdInTZ(nowLocal, tz);
      const tomorrowISO = ymdInTZ(new Date(nowLocal.getTime() + 24 * 3600 * 1000), tz);
      // 2) Busca eventos de hoje e amanhã (time não nulo)
      const { data: evsToday, error: e1 } = await sb.from("events").select("id, owner_id, date, time, title, kind, notes, created_at").eq("owner_id", o.id).eq("date", todayISO).not("time", "is", null).is("reminder_sent_at", null);
      if (e1) return j({
        error: e1.message
      }, 500);
      const { data: evsTomorrow, error: e2 } = await sb.from("events").select("id, owner_id, date, time, title, kind, notes, created_at").eq("owner_id", o.id).eq("date", tomorrowISO).not("time", "is", null).is("reminder_sent_at", null);
      if (e2) return j({
        error: e2.message
      }, 500);
      const all = [
        ...evsToday || [],
        ...evsTomorrow || []
      ];
      // 3) Filtra eventos com diferença ~ 60 ± 5 minutos
      const due = all.filter((ev)=>{
        const evLocal = parseLocalEventDateTime(ev.date, ev.time, tz);
        const diff = minutesDiff(evLocal, nowLocal); // ev - now
        return diff >= 55 && diff <= 65;
      });
      for (const ev of due){
        // Monta variáveis do template curto:
        // {{1}} dd/mm ; {{2}} HH
        const v1 = `${String(ev.date).slice(8,10)}/${String(ev.date).slice(5,7)}`;
        const v2 = hhFromTime(ev.time);
        // 4) Dispara template
        const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
        const body = {
          messaging_product: "whatsapp",
          to: o.phone_e164,
          type: "template",
          template: {
            name: TEMPLATE_REMINDER,
            language: {
              code: LANG
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: String(v1)
                  },
                  {
                    type: "text",
                    text: String(v2)
                  }
                ]
              }
            ]
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
        await sb.from("delivery_logs").insert({
          owner_id: o.id,
          channel: "whatsapp",
          to_e164: o.phone_e164,
          template_name: TEMPLATE_REMINDER,
          payload: {
            event_id: ev.id,
            variables: [
              v1,
              v2
            ],
            event: {
              date: ev.date,
              time: ev.time,
              title: ev.title,
              kind: ev.kind
            }
          },
          wa_status: String(waRes.status),
          wa_response: waJson
        });
        if (waRes.ok) {
          await sb.from("events").update({
            reminder_sent_at: new Date().toISOString()
          }).eq("id", ev.id);
        }
        results.push({
          owner: o.id,
          to: o.phone_e164,
          event_id: ev.id,
          date: ev.date,
          time: ev.time,
          nowLocal: nowLocal.toISOString(),
          status: waRes.status,
          response: waJson
        });
      }
    }
    return j({
      ok: true,
      sent: results.length,
      results
    });
  } catch (e: unknown) {
    return j({
      error: e instanceof Error ? e.message : String(e)
    }, 500);
  }
});
