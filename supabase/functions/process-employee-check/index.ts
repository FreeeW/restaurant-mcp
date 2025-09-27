// supabase/functions/process-employee-check/index.ts
// Process employee check-in/out from WhatsApp messages

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Helper to return JSON responses
const jsonResponse = (body: unknown, status: number = 200) => 
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" }
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required environment variables");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Parse request body
    const { phone_e164, message_text, timestamp } = await req.json();

    console.log(`[EMPLOYEE-CHECK] Processing message from ${phone_e164}: "${message_text}"`);

    if (!phone_e164 || !message_text) {
      return jsonResponse({ 
        error: "missing_params",
        message: "Missing phone_e164 or message_text" 
      }, 400);
    }

    // Parse message to determine action
    const normalizedMessage = message_text.toLowerCase().trim();
    
    // Check for check-in commands
    const isCheckIn = normalizedMessage === '1' || 
                      normalizedMessage === 'cheguei' ||
                      normalizedMessage === 'entrada' ||
                      normalizedMessage === 'in' ||
                      normalizedMessage === 'e';

    // Check for check-out commands  
    const isCheckOut = normalizedMessage === '2' || 
                       normalizedMessage === 'sai' ||
                       normalizedMessage === 'saí' ||
                       normalizedMessage === 'saida' ||
                       normalizedMessage === 'saída' ||
                       normalizedMessage === 'out' ||
                       normalizedMessage === 's';

    // If neither, return help message
    if (!isCheckIn && !isCheckOut) {
      console.log(`[EMPLOYEE-CHECK] Invalid command: ${normalizedMessage}`);
      return jsonResponse({
        success: false,
        error: "invalid_command",
        message: "❓ Comando não reconhecido\n\nPara registrar:\n1️⃣ ou 'cheguei' = Entrada\n2️⃣ ou 'sai' = Saída"
      });
    }

    // Get timestamp (use provided or current)
    const checkTimestamp = timestamp ? new Date(timestamp) : new Date();
    
    // Call the appropriate RPC function
    let result;
    if (isCheckIn) {
      console.log(`[EMPLOYEE-CHECK] Processing check-in for ${phone_e164}`);
      
      const { data, error } = await supabase.rpc('process_employee_checkin', {
        p_phone_e164: phone_e164,
        p_timestamp: checkTimestamp.toISOString()
      });

      if (error) {
        console.error('[EMPLOYEE-CHECK] Check-in error:', error);
        throw error;
      }
      
      result = data;
    } else {
      console.log(`[EMPLOYEE-CHECK] Processing check-out for ${phone_e164}`);
      
      const { data, error } = await supabase.rpc('process_employee_checkout', {
        p_phone_e164: phone_e164,
        p_timestamp: checkTimestamp.toISOString()
      });

      if (error) {
        console.error('[EMPLOYEE-CHECK] Check-out error:', error);
        throw error;
      }
      
      result = data;
    }

    console.log('[EMPLOYEE-CHECK] Result:', result);

    // Handle different result types
    if (result?.error === 'not_found') {
      return jsonResponse({
        success: false,
        error: result.error,
        message: "📱 Número não cadastrado\n\nPeça ao seu gerente para cadastrar seu WhatsApp no sistema."
      });
    }

    if (result?.error === 'not_allowed') {
      return jsonResponse({
        success: false,
        error: result.error,
        message: "🚫 Sistema de ponto via WhatsApp desativado\n\nUse o formulário para registrar o ponto."
      });
    }

    if (result?.error === 'already_checked_in') {
      return jsonResponse({
        success: false,
        error: result.error,
        message: result.message || "⚠️ Você já registrou entrada hoje"
      });
    }

    if (result?.error === 'already_checked_out') {
      return jsonResponse({
        success: false,
        error: result.error,
        message: result.message || "⚠️ Você já registrou saída hoje"
      });
    }

    if (result?.error === 'no_checkin') {
      return jsonResponse({
        success: false,
        error: result.error,
        message: "❌ Você precisa registrar entrada primeiro\n\nEnvie '1' para registrar entrada"
      });
    }

    // Success! Return the formatted message
    if (result?.success) {
      // Build a nice response message
      let responseMessage = result.message || "✅ Ponto registrado";
      
      // Add extra info if available
      if (isCheckOut && result.hours_worked) {
        const hours = parseFloat(result.hours_worked);
        const hoursFormatted = Math.floor(hours);
        const minutesFormatted = Math.round((hours - hoursFormatted) * 60);
        
        responseMessage += `\n⏱️ Total: ${hoursFormatted}h${minutesFormatted > 0 ? minutesFormatted + 'min' : ''}`;
        
        if (result.overtime_hours && parseFloat(result.overtime_hours) > 0) {
          responseMessage += `\n⚡ Hora extra: ${result.overtime_hours}h`;
        }
      }
      
      return jsonResponse({
        success: true,
        message: responseMessage,
        data: result
      });
    }

    // Unknown error
    return jsonResponse({
      success: false,
      error: "unknown_error",
      message: "❌ Erro ao processar. Tente novamente.",
      details: result
    });

  } catch (error) {
    console.error('[EMPLOYEE-CHECK] Fatal error:', error);
    
    return jsonResponse({
      success: false,
      error: "server_error",
      message: "❌ Erro no servidor. Tente novamente mais tarde.",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
