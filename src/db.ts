// src/db.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");

export const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// KPIs de 1 dia
export async function getDailyKpi(ownerId: string, day: string) {
  const { data, error } = await sb.rpc("get_daily_kpi", { p_owner: ownerId, p_day: day });
  if (error) throw new Error(error.message);
  return data; // { day, net_sales, food_pct, labour_pct }
}

// KPIs detalhados de 1 dia (inclui custos)
export async function getDailyKpiOnDate(ownerId: string, day: string) {
  const { data, error } = await sb.rpc("get_daily_kpi_on_date", {
    p_owner: ownerId,
    p_day: day
  });
  if (error) throw new Error(error.message);
  return data; // { day, net_sales, food_cost, labour_cost, food_pct, labour_pct }
}

// KPIs agregados em intervalo de datas
export async function getPeriodKpis(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_period_kpis", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,net_sales,food_pct,labour_pct }
}

// Horas por funcionário no intervalo
export async function getShiftsRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_shifts_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,total_hours,by_emp:[{emp_code,emp_name,hours}] }
}

// Pagamento/horas por empregado no intervalo
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

// Pedidos (compras de insumos) no intervalo
export async function getOrdersRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_orders_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start,end,total_amount,orders:[...] }
}

// Observações (notes) no intervalo
export async function getNotesRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_notes_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start, end, notes: [{day, source, text, emp_code, emp_name}] }
}

// Cria evento/lembrete
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

// Lista eventos no intervalo
export async function getEventsRange(ownerId: string, start: string, end: string) {
  const { data, error } = await sb.rpc("get_events_range", {
    p_owner: ownerId,
    p_start: start,
    p_end: end
  });
  if (error) throw new Error(error.message);
  return data; // { start, end, events: [{id,date,time,title,kind,notes}] }
}

