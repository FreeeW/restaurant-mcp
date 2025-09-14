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

// Verifica existência de funcionário ativo por owner_id e code
export async function employeeExists(ownerId: string, empCode: string) {
  const { data, error } = await sb
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("code", empCode)
    .eq("active", true);
  if (error) throw new Error(error.message);
  // When using head:true, data is null; rely on count via data length not available.
  // Fallback: perform a minimal select single row if count isn't supported.
  if (data == null) {
    const { data: one, error: e2 } = await sb
      .from("employees")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("code", empCode)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (e2) throw new Error(e2.message);
    return !!one?.id;
  }
  return Array.isArray(data) && data.length > 0;
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

// Conversa: histórico recente por owner e telefone
export async function getConversationHistory(ownerId: string, fromE164: string, limit: number = 10) {
  const { data, error } = await sb.rpc("get_conversation_history", {
    p_owner: ownerId,
    p_from_e164: fromE164,
    p_limit: limit
  });
  if (error) throw new Error(error.message);
  return data; // { owner_id, from_e164, conversation_count, messages: [{direction,message,created_at}] }
}

// ========== FUNÇÕES DE ALVARÁS/LICENÇAS ==========

// Lista status de todos os alvarás
export async function getLicensesStatus(ownerId: string, includeExpired: boolean = false) {
  const { data, error } = await sb.rpc("get_licenses_status", {
    p_owner: ownerId,
    p_include_expired: includeExpired
  });
  if (error) throw new Error(error.message);
  return data; // { owner_id, summary: {total,expired,expiring_soon,renewal_approaching,ok}, licenses: [...] }
}

// Lista alvarás próximos do vencimento
export async function getExpiringLicenses(ownerId: string, daysAhead: number = 30) {
  const { data, error } = await sb.rpc("get_expiring_licenses", {
    p_owner: ownerId,
    p_days_ahead: daysAhead
  });
  if (error) throw new Error(error.message);
  return data; // { owner_id, days_ahead, count, licenses: [...] }
}

// Adiciona novo alvará
export async function addLicense(
  ownerId: string,
  title: string,
  expiryDate: string,
  options: {
    license_number?: string | null;
    issuing_authority?: string | null;
    issue_date?: string | null;
    renewal_deadline?: string | null;
    category?: string | null;
    notes?: string | null;
  } = {}
) {
  const { data, error } = await sb.rpc("add_license", {
    p_owner: ownerId,
    p_title: title,
    p_expiry_date: expiryDate,
    p_license_number: options.license_number ?? null,
    p_issuing_authority: options.issuing_authority ?? null,
    p_issue_date: options.issue_date ?? null,
    p_renewal_deadline: options.renewal_deadline ?? null,
    p_category: options.category ?? null,
    p_notes: options.notes ?? null
  });
  if (error) throw new Error(error.message);
  return data; // { id, owner_id, title, expiry_date, ... }
}

// Atualiza status de um alvará
export async function updateLicenseStatus(
  ownerId: string,
  licenseId: string,
  status: string,
  notes?: string | null
) {
  const { data, error } = await sb.rpc("update_license_status", {
    p_owner: ownerId,
    p_license_id: licenseId,
    p_status: status,
    p_notes: notes ?? null
  });
  if (error) throw new Error(error.message);
  return data; // { id, title, status, expiry_date, updated_at }
}

// Busca alvará por ID
export async function getLicenseById(ownerId: string, licenseId: string) {
  const { data, error } = await sb.rpc("get_license_by_id", {
    p_owner: ownerId,
    p_license_id: licenseId
  });
  if (error) throw new Error(error.message);
  return data; // { id, owner_id, title, ... }
}

