// supabase/functions/whatsapp-webhook/db.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
export const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
export async function mapPhoneToOwnerId(e164: string) {
  const { data, error } = await sb.from("owners").select("id").eq("phone_e164", e164).single();
  // PGRST116 = no rows
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data?.id ?? null;
}
export async function getDailyKpi(ownerId: string, day: string) {
  const { data, error } = await sb.rpc("get_daily_kpi", {
    p_owner: ownerId,
    p_day: day
  });
  if (error) throw new Error(error.message);
  return data; // { day, net_sales, food_pct, labour_pct }
}
export async function getDailyKpiOnDate(ownerId: string, day: string) {
  const { data, error } = await sb.rpc("get_daily_kpi_on_date", {
    p_owner: ownerId,
    p_day: day
  });
  if (error) throw new Error(error.message);
  return data; // { day, net_sales, food_cost, labour_cost, food_pct, labour_pct }
}
export async function getPeriodKpis(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_period_kpis", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,net_sales,food_pct,labour_pct }
}
export async function insertBotLog(row: { owner_id?: string | null; from_e164: string; direction: string; message?: string | null; intent?: string | null; payload?: unknown | null }) {
  const { error } = await sb.from("bot_logs").insert({
    owner_id: row.owner_id ?? null,
    from_e164: row.from_e164,
    direction: row.direction,
    message: row.message ?? null,
    intent: row.intent ?? null,
    payload: row.payload ?? null
  });
  if (error) throw new Error(error.message);
}
/* ---------- NEW RPC WRAPPERS (tools.ts depends on these) ---------- */ export async function getShiftsRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_shifts_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,total_hours,by_emp:[{emp_code,hours}] }
}
export async function getEmployeePay(ownerId: string, empCode: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_employee_pay", {
    p_owner: ownerId,
    p_emp_code: empCode,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { emp_code,start,end,days:[...],total_hours,total_pay }
}
export async function getOrdersRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_orders_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,total_amount,orders:[...] }
}
export async function queryAnalytics(ownerId: string, template: string, args?: Record<string, unknown>) {
  const { data, error } = await sb.rpc("query_analytics", {
    p_owner: ownerId,
    p_template: template,
    p_args: args ?? {}
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function getNotesRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_notes_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start, end, notes: [{day, source, text}] }
}
// --- Events / Lembretes ---
// Adiciona um evento/lembrete
export async function addEvent(ownerId: string, date: string, title: string, kind?: string | null, time?: string | null, notes?: string | null) {
  const { data, error } = await sb.rpc("add_event", {
    p_owner: ownerId,
    p_date: date,
    p_title: title,
    p_kind: kind ?? null,
    p_time: time ?? null,
    p_notes: notes ?? null
  });
  if (error) throw new Error(error.message);
  return data; // { id, owner, date, title, kind, time, notes }
}
// Lista eventos em um intervalo
export async function getEventsRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_events_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start, end, events: [{id,date,time,title,kind,notes}] }
}
