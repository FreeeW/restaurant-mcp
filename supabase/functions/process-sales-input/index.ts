// supabase/functions/process-sales-input/index.ts
// Processes manager responses to closing reminder, saves to form_submissions

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonResponse = (body: unknown, status: number = 200) => 
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" }
  });

// Parse amount from text (handles various formats)
function parseAmount(text: string): number | null {
  // Remove all non-numeric except comma and dot
  const cleaned = text.replace(/[^\d.,]/g, '');
  
  // Handle Brazilian format (1.234,56) and US format (1,234.56)
  let normalized = cleaned;
  
  // If has both . and , - assume last one is decimal separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be thousands or decimal
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      // Likely decimal: 1234,56
      normalized = cleaned.replace(',', '.');
    } else {
      // Likely thousands: 1,234
      normalized = cleaned.replace(/,/g, '');
    }
  }
  
  const amount = parseFloat(normalized);
  return isNaN(amount) ? null : amount;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
    const META_TOKEN = Deno.env.get("META_TOKEN");
    const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v22.0";

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { from_phone, message_text } = await req.json();

    if (!from_phone || !message_text) {
      return jsonResponse({
        success: false,
        error: "Missing from_phone or message_text"
      }, 400);
    }

    // Find pending sales input for this phone
    const { data: pending, error: pendingError } = await supabase
      .from("pending_sales_input")
      .select("*, owners!inner(id, business_name, phone_e164)")
      .eq("manager_phone", from_phone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pendingError || !pending) {
      // No pending input, just acknowledge
      return jsonResponse({
        success: true,
        action: "no_pending",
        message: "Nenhum fechamento pendente para este número"
      });
    }

    // Parse the amount from message
    const amount = parseAmount(message_text);
    
    if (!amount || amount <= 0) {
      // Invalid amount, ask to resend
      const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
      
      await fetch(waUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from_phone,
          type: "text",
          text: {
            body: "❌ Valor não reconhecido. Por favor, envie apenas o valor das vendas.\n\nExemplo: 3450 ou 3.450,00"
          }
        })
      });

      return jsonResponse({
        success: false,
        error: "invalid_amount",
        parsed: amount
      });
    }

    // Update pending record
    await supabase
      .from("pending_sales_input")
      .update({
        sales_amount: amount,
        response_received_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq("id", pending.id);

    // Get today's date in owner's timezone
    const tz = pending.owners.tz || "America/Sao_Paulo";
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit", 
      day: "2-digit"
    }).format(new Date());

    // Save to form_submissions (same as form would do)
    const { error: submissionError } = await supabase
      .from("form_submissions")
      .insert({
        owner_id: pending.owner_id,
        source_form: "vendas",
        submitted_by_phone: from_phone,
        payload: {
          date: today,
          net_sales: amount,
          tips: 0,
          notes: "Via WhatsApp closing reminder"
        }
      });

    if (submissionError) throw submissionError;

    // Calculate basic KPIs for response
    const { data: monthData } = await supabase
      .from("form_submissions")
      .select("payload")
      .eq("owner_id", pending.owner_id)
      .eq("source_form", "vendas")
      .gte("submitted_at", today.substring(0, 7) + "-01T00:00:00");

    const monthSales = monthData?.reduce((sum, item) => 
      sum + (item.payload?.net_sales || 0), 0) || 0;

    // Send confirmation
    const confirmationText = `✅ Vendas registradas: R$ ${amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2
    })}

📊 Resumo do mês:
• Total: R$ ${monthSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Média diária: R$ ${(monthSales / new Date().getDate()).toLocaleString('pt-BR', {
      minimumFractionDigits: 2
    })}

Obrigado e bom descanso! 🌙`;

    const waUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
    
    await fetch(waUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from_phone,
        type: "text",
        text: { body: confirmationText }
      })
    });

    return jsonResponse({
      success: true,
      action: "sales_recorded",
      amount,
      owner_id: pending.owner_id,
      date: today
    });

  } catch (error) {
    console.error("Error processing sales input:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
