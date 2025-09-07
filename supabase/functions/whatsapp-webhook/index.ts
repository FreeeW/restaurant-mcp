// supabase/functions/whatsapp-webhook/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parseInbound, sendText } from "./wa.ts";
import { insertBotLog, mapPhoneToOwnerId } from "./db.ts";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
const WA_VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN");
const json = (b: unknown, s: number = 200)=>new Response(JSON.stringify(b), {
    status: s,
    headers: {
      ...CORS,
      "content-type": "application/json"
    }
  });
const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL");
const AI_GATEWAY_TOKEN = Deno.env.get("AI_GATEWAY_TOKEN") ?? Deno.env.get("GATEWAY_SECRET");
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: CORS
  });
  // Webhook verification
  if (req.method === "GET") {
    const u = new URL(req.url);
    const mode = u.searchParams.get("hub.mode");
    const token = u.searchParams.get("hub.verify_token");
    const challenge = u.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
      return new Response(challenge ?? "", {
        headers: CORS
      });
    }
    return new Response("verify failed", {
      status: 403,
      headers: CORS
    });
  }
  // Inbound notifications
  try {
    let payload = null;
    try {
      payload = await req.json();
    } catch  {
      const _raw = await req.text();
      return json({
        ok: true,
        note: "non-json payload"
      });
    }
    const items = parseInbound(payload); // [{from, text, messageId}]
    if (!items.length) return json({
      ok: true,
      ignored: true
    });
    for (const it of items) {
      const owner_id = await mapPhoneToOwnerId(it.from);
      if (!owner_id) {
        const reply = "Número não reconhecido. Me envie o telefone cadastrado ou peça para o administrador vincular seu WhatsApp.";
        await sendText(it.from, reply);
        await insertBotLog({
          owner_id: null,
          from_e164: it.from,
          direction: "out",
          message: reply,
          intent: "unlinked",
          payload: {}
        });
        continue;
      }
      // log IN
      await insertBotLog({
        owner_id,
        from_e164: it.from,
        direction: "in",
        message: it.text,
        intent: null,
        payload: { message_id: it.messageId }
      });
      // Forward to AI Gateway
      let reply = 'Ok.';
      if (!AI_GATEWAY_URL) {
        reply = 'Gateway indisponível. Tente novamente em instantes.';
      } else {
        try {
          const resp = await fetch(AI_GATEWAY_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(AI_GATEWAY_TOKEN ? { Authorization: `Bearer ${AI_GATEWAY_TOKEN}` } : {})
            },
            body: JSON.stringify({ owner_id, from: it.from, text: it.text })
          });
          const json = await resp.json().catch(() => ({}));
          reply = String(json?.reply || 'tendi nada');
        } catch (_e) {
          reply = 'Erro temporário ao acessar o gateway.';
        }
      }
      // send + log OUT
      const { status, data } = await sendText(it.from, reply);
      await insertBotLog({
        owner_id,
        from_e164: it.from,
        direction: "out",
        message: reply,
        intent: "gateway",
        payload: {
          wa_status: status,
          wa_response: data
        }
      });
    }
    return json({
      ok: true
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({
      ok: true,
      error: msg
    });
  }
});
