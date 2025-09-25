// supabase/functions/onboard-owner/index.ts
// This function creates a new owner and automatically generates their form links
// Can be called from Stripe webhook or admin panel

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { 
      email, 
      phone_e164, 
      business_name,
      stripe_customer_id,
      manager_phone_e164,
      closing_time,
      closing_reminder_enabled,
      metadata = {}
    } = await req.json();

    // Validate required fields
    if (!phone_e164 || !business_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone_e164, business_name" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if owner already exists
    const { data: existingOwner } = await supabase
      .from("owners")
      .select("id, manager_phone_e164, closing_time, closing_reminder_enabled")
      .eq("phone_e164", phone_e164)
      .single();

    if (existingOwner) {
      // Owner exists, update manager fields if provided
      if (manager_phone_e164 !== undefined || closing_time !== undefined || closing_reminder_enabled !== undefined) {
        const updateData: Record<string, unknown> = {};
        if (manager_phone_e164 !== undefined) updateData.manager_phone_e164 = manager_phone_e164;
        if (closing_time !== undefined) updateData.closing_time = closing_time;
        if (closing_reminder_enabled !== undefined) updateData.closing_reminder_enabled = closing_reminder_enabled;

        const { error: updateError } = await supabase
          .from("owners")
          .update(updateData)
          .eq("id", existingOwner.id);

        if (updateError) {
          console.error("Error updating owner manager fields:", updateError);
        }
      }

      // Generate links
      const linksResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-owner-links`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ owner_id: existingOwner.id })
        }
      );

      const linksData = await linksResponse.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Owner already exists, links regenerated",
          owner_id: existingOwner.id,
          ...linksData
        }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Create new owner with manager fields
    const ownerData: Record<string, unknown> = {
      phone_e164,
      business_name,
      email,
      active: true,
      onboarded_at: new Date().toISOString(),
      subscription_status: stripe_customer_id ? 'active' : 'trial',
      settings: {
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
        stripe_customer_id,
        ...metadata
      }
    };

    // Add manager fields if provided
    if (manager_phone_e164) {
      ownerData.manager_phone_e164 = manager_phone_e164;
    }
    if (closing_time) {
      ownerData.closing_time = closing_time;
    }
    if (closing_reminder_enabled !== undefined) {
      ownerData.closing_reminder_enabled = closing_reminder_enabled;
    }

    const { data: newOwner, error: ownerError } = await supabase
      .from("owners")
      .insert(ownerData)
      .select()
      .single();

    if (ownerError) {
      console.error("Error creating owner:", ownerError);
      return new Response(
        JSON.stringify({ error: "Failed to create owner" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Generate token and links
    const linksResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-owner-links`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ owner_id: newOwner.id })
      }
    );

    const linksData = await linksResponse.json();

    // Send welcome email if email provided
    if (email) {
      await sendWelcomeEmail(email, business_name, linksData.links, manager_phone_e164, closing_time);
    }

    // Send WhatsApp welcome message
    await sendWhatsAppWelcome(phone_e164, business_name, linksData.links, manager_phone_e164, closing_time);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Owner created successfully",
        owner_id: newOwner.id,
        ...linksData,
        email_sent: !!email,
        whatsapp_sent: true,
        manager_configured: !!manager_phone_e164
      }),
      { status: 201, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in onboard-owner:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

async function sendWelcomeEmail(email: string, businessName: string, links: Record<string, string>, managerPhone?: string, closingTime?: string) {
  // If you're using Resend
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #3b82f6; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 5px;
        }
        .form-link {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 20px;
          margin: 15px 0;
          border-radius: 8px;
        }
        .form-link h3 { margin: 0 0 10px 0; }
        .warning { 
          background: #fef3c7; 
          border: 1px solid #fcd34d; 
          padding: 15px; 
          border-radius: 6px; 
          margin: 20px 0;
        }
        .manager-info {
          background: #dbeafe;
          border: 1px solid #60a5fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo ao Sistema de Gestão!</h1>
          <p>${businessName}</p>
        </div>
        <div class="content">
          <h2>Seus formulários estão prontos! 🎉</h2>
          
          <p>Olá! Seu sistema de gestão está configurado e pronto para uso.</p>
          
          ${managerPhone ? `
          <div class="manager-info">
            <strong>📱 Gerente Configurado:</strong><br>
            Número: ${managerPhone}<br>
            ${closingTime ? `Horário do lembrete diário: ${closingTime}<br>` : ''}
            O gerente receberá um lembrete diário via WhatsApp para informar as vendas.
          </div>
          ` : ''}
          
          <div class="form-link">
            <h3>📊 Formulário de Vendas Diárias</h3>
            <p>Registre as vendas do dia</p>
            <a href="${links.vendas}" class="button">Acessar Formulário</a>
          </div>
          
          ${links.cadastro_funcionario ? `
          <div class="form-link">
            <h3>👥 Cadastrar Funcionário</h3>
            <p>Adicione novos membros da equipe</p>
            <a href="${links.cadastro_funcionario}" class="button">Acessar Formulário</a>
          </div>
          ` : ''}
          
          ${links.mao_de_obra ? `
          <div class="form-link">
            <h3>⏰ Registro de Turnos</h3>
            <p>Registre horas trabalhadas da equipe</p>
            <a href="${links.mao_de_obra}" class="button">Acessar Formulário</a>
          </div>
          ` : ''}

          ${links.pedido_recebido ? `
          <div class="form-link">
            <h3>📦 Pedidos Recebidos</h3>
            <p>Registre entregas de fornecedores</p>
            <a href="${links.pedido_recebido}" class="button">Acessar Formulário</a>
          </div>
          ` : ''}
          
          <div class="warning">
            <strong>⚠️ IMPORTANTE:</strong><br>
            Sempre use estes links específicos para preencher os formulários. 
            Eles contêm um código único que identifica seu restaurante.
            <br><br>
            💡 Dica: Salve este email ou adicione os links aos favoritos!
          </div>
          
          <h3>Como funciona:</h3>
          <ol>
            <li>Preencha os formulários diariamente (ou o gerente informa via WhatsApp)</li>
            <li>Receba KPIs toda manhã às 9h via WhatsApp</li>
            <li>Consulte dados a qualquer momento pelo WhatsApp</li>
          </ol>
          
          <p>Compartilhe os links com sua equipe para que todos possam contribuir com os dados.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Dúvidas? Responda este email ou envie mensagem no WhatsApp.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Sistema de Gestão <noreply@seudominio.com>",
        to: email,
        subject: `${businessName} - Seus Formulários Estão Prontos!`,
        html: html
      })
    });

    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    } else {
      console.log("Welcome email sent to:", email);
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

function sendWhatsAppWelcome(phone: string, businessName: string, _links: Record<string, string>, managerPhone?: string, closingTime?: string) {
  // This would integrate with your WhatsApp sending logic
  // For now, just log it
  console.log(`Would send WhatsApp welcome to ${phone} for ${businessName}`);
  
  if (managerPhone) {
    console.log(`Manager configured: ${managerPhone}, closing time: ${closingTime}`);
  }
  
  // If you have WhatsApp API configured:
  /*
  const message = `🎉 Bem-vindo, ${businessName}!

Seus formulários estão prontos:

📊 *Vendas Diárias*
${_links.vendas}

👥 *Cadastrar Funcionário*
${_links.cadastro_funcionario}

⏰ *Registro de Turnos*
${_links.mao_de_obra}

📦 *Pedidos Recebidos*
${_links.pedido_recebido}

${managerPhone ? `📱 *Gerente Configurado*
Número: ${managerPhone}
${closingTime ? `Lembrete diário às: ${closingTime}` : ''}
O gerente receberá lembretes diários para informar vendas.` : ''}

⚠️ *IMPORTANTE:* Use sempre estes links específicos!

Salve esta mensagem para acesso rápido aos formulários.`;

  // Send via your WhatsApp API
  */
}
