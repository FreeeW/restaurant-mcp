// supabase/functions/whatsapp-webhook/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parseInbound, sendText } from "./wa.ts";
import { insertBotLog, mapPhoneToOwnerId } from "./db.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const WA_VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (b: unknown, s: number = 200) => new Response(JSON.stringify(b), {
  status: s,
  headers: { ...CORS, "content-type": "application/json" }
});

const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL");
const AI_GATEWAY_TOKEN = Deno.env.get("AI_GATEWAY_TOKEN") ?? Deno.env.get("GATEWAY_SECRET");

// Check if this is a manager responding to closing reminder
async function isManagerResponse(phone: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return false;
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  const { data } = await supabase
    .from("pending_sales_input")
    .select("id")
    .eq("manager_phone", phone)
    .eq("status", "pending")
    .single();
  
  return !!data;
}

// Process sales input from manager
async function processSalesInput(phone: string, text: string): Promise<string> {
  const PROCESS_SALES_URL = `${SUPABASE_URL}/functions/v1/process-sales-input`;
  
  try {
    const response = await fetch(PROCESS_SALES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`
      },
      body: JSON.stringify({
        from_phone: phone,
        message_text: text
      })
    });
    
    const result = await response.json();
    
    // The process-sales-input function handles the response message
    // We just return a simple confirmation
    return result.success ? "" : "Erro ao processar. Tente novamente.";
  } catch (error) {
    console.error("Error processing sales input:", error);
    return "Erro ao registrar vendas. Por favor, tente novamente.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  
  // Webhook verification
  if (req.method === "GET") {
    const u = new URL(req.url);
    const mode = u.searchParams.get("hub.mode");
    const token = u.searchParams.get("hub.verify_token");
    const challenge = u.searchParams.get("hub.challenge");
    
    if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
      return new Response(challenge ?? "", { headers: CORS });
    }
    return new Response("verify failed", { status: 403, headers: CORS });
  }
  
  // Inbound notifications
  try {
    let payload = null;
    try {
      payload = await req.json();
    } catch {
      const _raw = await req.text();
      return json({ ok: true, note: "non-json payload" });
    }
    
    const items = parseInbound(payload); // [{from, text, messageId}]
    if (!items.length) return json({ ok: true, ignored: true });
    
    for (const it of items) {
      // First check if this is a manager responding to closing reminder
      const isManager = await isManagerResponse(it.from);
      
      if (isManager) {
        // Process as sales input, not as bot conversation
        await processSalesInput(it.from, it.text);
        
        // Log the interaction
        await insertBotLog({
          owner_id: null, // Will be set by process-sales-input
          from_e164: it.from,
          direction: "in",
          message: it.text,
          intent: "sales_input",
          payload: { message_id: it.messageId }
        });
        
        continue; // Skip normal bot processing
      }
      
      // Normal bot flow for owners
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
        intent: "gateway",
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
      
      // Send reply
      await sendText(it.from, reply);
      
      // log OUT
      await insertBotLog({
        owner_id,
        from_e164: it.from,
        direction: "out",
        message: reply,
        intent: "gateway",
        payload: {}
      });
    }
    
    return json({ ok: true, processed: items.length });
  } catch (e: unknown) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
