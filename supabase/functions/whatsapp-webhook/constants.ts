// supabase/functions/whatsapp-webhook/constants.ts
// Locale / time
export const DEFAULT_TZ = Deno.env.get("DEFAULT_TZ") || "America/Sao_Paulo";
// Feature flags
export const ENABLE_AI = (Deno.env.get("ENABLE_AI") || "true").toLowerCase() === "true";
// Limits / formatting
export const MAX_HISTORY = Number(Deno.env.get("MAX_HISTORY") || 10); // messages to fetch for GPT context
export const REPLY_MAX_LINES = Number(Deno.env.get("REPLY_MAX_LINES") || 4); // model should keep replies short
// WhatsApp
export const WABA_LANG = Deno.env.get("WABA_LANG") || "pt_BR";
// Models
export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
// Misc
export const BRL_SHOW_CENTS = (Deno.env.get("BRL_SHOW_CENTS") || "false").toLowerCase() === "true";
// keep-alive so file isn't pruned until used everywhere
export const __KEEP = true;
