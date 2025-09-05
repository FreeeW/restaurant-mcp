// supabase/functions/ingest-form/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// CORS básico
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// util: executar select().single() e lançar erro padrão
async function selectSingle(q: Promise<{ data: any; error: { message?: string } | null }>) {
  const { data, error } = await q;
  if (error) throw new Error(error.message || String(error));
  return data;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    // auth simples por header
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== Deno.env.get("WEBHOOK_SECRET")) {
      return new Response("Unauthorized", {
        status: 401,
        headers: cors
      });
    }
    const body = await req.json().catch(()=>null);
    if (!body?.owner_id || !body?.payload || !body?.source_form) {
      return new Response("Bad Request", {
        status: 400,
        headers: cors
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500, headers: cors });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const owner_id = body.owner_id;
    const source_form = body.source_form;
    const payload = body.payload;
    // 1) Regras específicas por tipo de formulário
    let computedPayload = payload;
    // a) Cadastro de Funcionário → upsert em employees (unique: owner_id, code)
    if (source_form === "cadastro_funcionario") {
      const row = {
        owner_id,
        code: String(payload.code ?? "").trim(),
        name: payload.name ?? null,
        hourly_rate: Number(payload.hourly_rate ?? 0),
        active: payload.active ?? true
      };
      if (!row.code || !row.hourly_rate) {
        return new Response("Missing code/hourly_rate", {
          status: 400,
          headers: cors
        });
      }
      await selectSingle(supabase.from("employees").upsert(row, {
        onConflict: "owner_id,code"
      }).select().single());
    }
    // b) Turnos/Mão de Obra → lookup hourly_rate e calcular labour_cost
    if (source_form === "mao_de_obra") {
      const code = String(payload.code ?? "").trim();
      const hours = Number(payload.hours ?? 0);
      if (!code || !Number.isFinite(hours) || hours <= 0) {
        return new Response("Missing/invalid code or hours", {
          status: 400,
          headers: cors
        });
      }
      const emp = await selectSingle(supabase.from("employees").select("hourly_rate, active").eq("owner_id", owner_id).eq("code", code).single());
      if (!emp?.active) return new Response("Employee inactive", {
        status: 400,
        headers: cors
      });
      const hourly = Number(emp.hourly_rate) || 0;
      const labour_cost = +(hourly * hours).toFixed(2);
      computedPayload = {
        ...payload,
        hourly_rate: hourly,
        labour_cost
      };
    }
    // 2) Registrar submissão (idempotente por source_sheet,source_row)
    const insertRow = {
      owner_id,
      source_form,
      payload: computedPayload,
      source_sheet: body.source_sheet ?? null,
      source_row: body.source_row ?? null
    };
    const q = body.source_sheet && Number.isInteger(body.source_row) ? supabase.from("form_submissions").upsert(insertRow, {
      onConflict: "source_sheet,source_row"
    }).select().single() : supabase.from("form_submissions").insert(insertRow).select().single();
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({
      ok: true,
      id: data.id
    }), {
      headers: {
        ...cors,
        "content-type": "application/json"
      }
    });
  } catch (err) {
    return new Response(err?.message ?? String(err), {
      status: 500,
      headers: cors
    });
  }
});
