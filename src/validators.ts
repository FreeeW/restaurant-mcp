export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export const E164_RE = /^\+[1-9]\d{1,14}$/; // E.164 max 15 digits including country code

export function validateUUID(v: string) {
  if (!v || !UUID_RE.test(v)) throw new Error("invalid owner_id");
}

export function isYMD(v: string) {
  return !!v && YMD_RE.test(v);
}

export function assertDateRange(start: string, end: string) {
  if (!isYMD(start)) throw new Error("invalid start date (YYYY-MM-DD)");
  if (!isYMD(end)) throw new Error("invalid end date (YYYY-MM-DD)");
  if (start > end) throw new Error("start > end");
}

export function assertEmpCode(code: string) {
  const c = (code ?? "").trim();
  if (!c) throw new Error("invalid emp_code");
}

export function assertHHMM(t?: string | null) {
  if (t == null || t === "") return; // optional
  const re = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 00-23:00-59
  if (!re.test(t)) throw new Error("invalid time (HH:MM)");
}

export function assertE164(phone: string) {
  const p = (phone ?? "").trim();
  if (!E164_RE.test(p)) throw new Error("invalid from_e164 (E.164 format required)");
}

export const ALLOWED_TEMPLATES = new Set([
  "kpi_daily_range",
  "orders_last_n",
  "orders_by_supplier",
  "shifts_by_emp",
  "shifts_daily_for_emp"
]);

export function assertTemplate(t: string) {
  if (!t || !ALLOWED_TEMPLATES.has(t)) throw new Error("invalid template");
}

export const __KEEP = true;


