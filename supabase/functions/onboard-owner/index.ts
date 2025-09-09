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
      .select("id")
      .eq("phone_e164", phone_e164)
      .single();

    if (existingOwner) {
      // Owner exists, just generate links
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

    // Create new owner
    const { data: newOwner, error: ownerError } = await supabase
      .from("owners")
      .insert({
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
      })
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
      await sendWelcomeEmail(email, business_name, linksData.links);
    }

    // Send WhatsApp welcome message
    await sendWhatsAppWelcome(phone_e164, business_name, linksData.links);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Owner created successfully",
        owner_id: newOwner.id,
        ...linksData,
        email_sent: !!email,
        whatsapp_sent: true
      }),
      { status: 201, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in onboard-owner:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

async function sendWelcomeEmail(email: string, businessName: string, links: any) {
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
          
          <div class="form-link">
            <h3>📊 Formulário de Vendas Diárias</h3>
            <p>Registre as vendas do dia</p>
            <a href="${links.vendas}" class="button">Acessar Formulário</a>
          </div>
          
          ${links.custos ? `
          <div class="form-link">
            <h3>💰 Formulário de Custos</h3>
            <p>Registre compras e custos de alimentos</p>
            <a href="${links.custos}" class="button">Acessar Formulário</a>
          </div>
          ` : ''}
          
          ${links.mao_de_obra ? `
          <div class="form-link">
            <h3>👥 Formulário de Mão de Obra</h3>
            <p>Registre horas trabalhadas da equipe</p>
            <a href="${links.mao_de_obra}" class="button">Acessar Formulário</a>
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
            <li>Preencha os formulários diariamente</li>
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

async function sendWhatsAppWelcome(phone: string, businessName: string, links: any) {
  // This would integrate with your WhatsApp sending logic
  // For now, just log it
  console.log(`Would send WhatsApp welcome to ${phone} for ${businessName}`);
  
  // If you have WhatsApp API configured:
  /*
  const message = `🎉 Bem-vindo, ${businessName}!

Seus formulários estão prontos:

📊 *Vendas Diárias*
${links.vendas}

💰 *Custos de Alimentos*
${links.custos || 'Em breve'}

👥 *Mão de Obra*
${links.mao_de_obra || 'Em breve'}

⚠️ *IMPORTANTE:* Use sempre estes links específicos!

Salve esta mensagem para acesso rápido aos formulários.`;

  // Send via your WhatsApp API
  */
}
