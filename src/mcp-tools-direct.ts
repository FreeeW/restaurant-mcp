import { getDailyKpi, getDailyKpiOnDate, getPeriodKpis, getShiftsRange, getEmployeePay, getOrdersRange, getNotesRange, addEvent, getEventsRange } from "./db.js";
import { validateUUID, isYMD, assertDateRange, assertEmpCode, assertHHMM } from "./validators.js";

// ---- tools list (schemas) ----
export const tools = [
  {
    name: "get_daily_kpi",
    description: "KPIs resumidos (vendas, % food, % labour) de um dia.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID" },
        day: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "day"],
      additionalProperties: false
    }
  },
  {
    name: "get_daily_kpi_on_date",
    description: "KPIs detalhados (inclui food_cost e labour_cost) para um dia",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID" },
        day: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "day"],
      additionalProperties: false
    }
  },
  {
    name: "get_period_kpis",
    description: "KPIs aggregated over a date range",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "start", "end"],
      additionalProperties: false
    }
  },
  {
    name: "get_shifts_range",
    description: "Sum of hours by employee in a date range",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "start", "end"],
      additionalProperties: false
    }
  },
  {
    name: "get_employee_pay",
    description: "Daily hours, rate, totals for one employee in a range",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        emp_code: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "emp_code", "start", "end"],
      additionalProperties: false
    }
  },
  {
    name: "get_orders_range",
    description: "Food purchases (orders) in a range",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "start", "end"],
      additionalProperties: false
    }
  },
  {
    name: "get_notes_range",
    description: "Lista observações (notes) digitadas nos formulários num intervalo de datas",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "start", "end"],
      additionalProperties: false
    }
  },
  {
    name: "add_event",
    description: "Cria um novo evento/lembrete para o dono (ex.: manutenção, entrega, compromisso).",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do dono" },
        date: { type: "string", description: "YYYY-MM-DD" },
        title: { type: "string", description: "Título do evento" },
        kind: { type: "string", description: "Categoria opcional (ex.: manutenção, entrega)" },
        time: { type: "string", description: "HH:MM opcional" },
        notes: { type: "string", description: "Notas adicionais" }
      },
      required: ["owner_id", "date", "title"],
      additionalProperties: false
    }
  },
  {
    name: "get_events_range",
    description: "Lista eventos/lembretes do dono em um intervalo de datas.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD" },
        end: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["owner_id", "start", "end"],
      additionalProperties: false
    }
  }
] as const;

// ---- helpers ----
function summarizeDaily(day: string, safe: any) {
  const ns = Number(safe?.net_sales || 0).toLocaleString("pt-BR");
  const fp = safe?.food_pct == null ? "—" : `${Math.round(safe.food_pct * 100)}%`;
  const lp = safe?.labour_pct == null ? "—" : `${Math.round(safe.labour_pct * 100)}%`;
  return `KPIs de ${day} — Vendas: R$ ${ns} • CMV: ${fp} • Labour: ${lp}`;
}
function render(safe: any, summary: string) {
  const jsonText = JSON.stringify(safe);
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: jsonText }
    ],
    structuredContent: safe,
    isError: false
  } as any;
}

// ---- tool handlers ----
type ToolResp = Promise<{ content: any[]; isError?: boolean; structuredContent?: any }>;
type ToolHandler = (args: any) => ToolResp;

export const toolHandlers: Record<string, ToolHandler> = {
  get_daily_kpi: async ({ owner_id, day }) => {
    try {
      validateUUID(owner_id);
      if (!isYMD(day)) throw new Error("invalid day (YYYY-MM-DD)");
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getDailyKpi(owner_id, day);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${day}.` }], 
        structuredContent: { no_data: true, day, message: `Sem dados para ${day}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const summary = summarizeDaily(day, safe);
    return render(safe, summary);
  },
  get_daily_kpi_on_date: async ({ owner_id, day }) => {
    try {
      validateUUID(owner_id);
      if (!isYMD(day)) throw new Error("invalid day (YYYY-MM-DD)");
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getDailyKpiOnDate(owner_id, day);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${day}.` }], 
        structuredContent: { no_data: true, day, message: `Sem dados para ${day}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const ns = Number(safe?.net_sales || 0).toLocaleString("pt-BR");
    const fc = safe?.food_cost == null ? "—" : Number(safe.food_cost).toLocaleString("pt-BR");
    const lc = safe?.labour_cost == null ? "—" : Number(safe.labour_cost).toLocaleString("pt-BR");
    const fp = safe?.food_pct == null ? "—" : `${Math.round(safe.food_pct * 100)}%`;
    const lp = safe?.labour_pct == null ? "—" : `${Math.round(safe.labour_pct * 100)}%`;
    const summary = `KPIs detalhados ${day} — Vendas: R$ ${ns} • Food: R$ ${fc} (${fp}) • Labour: R$ ${lc} (${lp})`;
    return render(safe, summary);
  },
  get_period_kpis: async ({ owner_id, start, end }) => {
    try {
      validateUUID(owner_id);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getPeriodKpis(owner_id, start, end);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${start}..${end}.` }], 
        structuredContent: { no_data: true, start, end, message: `Sem dados para ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const ns = Number(safe?.net_sales || 0).toLocaleString("pt-BR");
    const fp = safe?.food_pct == null ? "—" : `${Math.round(safe.food_pct * 100)}%`;
    const lp = safe?.labour_pct == null ? "—" : `${Math.round(safe.labour_pct * 100)}%`;
    const summary = `KPIs ${start} → ${end} — Vendas: R$ ${ns} • CMV: ${fp} • Labour: ${lp}`;
    return render(safe, summary);
  },
  get_shifts_range: async ({ owner_id, start, end }) => {
    try {
      validateUUID(owner_id);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getShiftsRange(owner_id, start, end);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${start}..${end}.` }], 
        structuredContent: { no_data: true, start, end, message: `Sem dados para ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const total = Number(safe?.total_hours || 0).toLocaleString("pt-BR");
    const byEmp = Array.isArray(safe?.by_emp) ? safe.by_emp.length : 0;
    const summary = `Shifts ${start} → ${end} — Total horas: ${total} • Funcionários: ${byEmp}`;
    return render(safe, summary);
  },
  get_employee_pay: async ({ owner_id, emp_code, start, end }) => {
    try {
      validateUUID(owner_id);
      assertEmpCode(emp_code);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getEmployeePay(owner_id, emp_code, start, end);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${emp_code} em ${start}..${end}.` }], 
        structuredContent: { no_data: true, emp_code, start, end, message: `Sem dados para ${emp_code} em ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const hours = Number(safe?.total_hours || 0).toLocaleString("pt-BR");
    const pay = Number(safe?.total_pay || 0).toLocaleString("pt-BR");
    const summary = `Emp ${safe?.emp_code || emp_code} — ${start} → ${end}: ${hours} h • R$ ${pay}`;
    return render(safe, summary);
  },
  get_orders_range: async ({ owner_id, start, end }) => {
    try {
      validateUUID(owner_id);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getOrdersRange(owner_id, start, end);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem dados para ${start}..${end}.` }], 
        structuredContent: { no_data: true, start, end, message: `Sem dados para ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const total = Number(safe?.total_amount || 0).toLocaleString("pt-BR");
    const count = Array.isArray(safe?.orders) ? safe.orders.length : 0;
    const summary = `Compras ${start} → ${end} — Total: R$ ${total} • Pedidos: ${count}`;
    return render(safe, summary);
  },
  get_notes_range: async ({ owner_id, start, end }) => {
    try {
      validateUUID(owner_id);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getNotesRange(owner_id, start, end);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem notes para ${start}..${end}.` }], 
        structuredContent: { no_data: true, start, end, message: `Sem notes para ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const notesCount = Array.isArray(safe?.notes) ? safe.notes.length : 0;
    const summary = `Notes ${start} → ${end} — ${notesCount} itens`;
    return render(safe, summary);
  },
  add_event: async ({ owner_id, date, title, kind, time, notes }) => {
    try {
      validateUUID(owner_id);
      if (!isYMD(date)) throw new Error("invalid date (YYYY-MM-DD)");
      const t = (time ?? '').trim();
      if (t) assertHHMM(t);
      const ttl = (title ?? '').trim();
      if (!ttl) throw new Error("invalid title");
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await addEvent(owner_id, date, title, kind, time, notes);
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { content: [{ type: "text", text: `Falha ao criar evento para ${date}.` }], isError: true };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const when = `${safe?.date}${safe?.time ? ' ' + safe.time : ''}`;
    const summary = `Evento criado: ${safe?.title} em ${when}`;
    return render(safe, summary);
  },
  get_events_range: async ({ owner_id, start, end }) => {
    try {
      validateUUID(owner_id);
      assertDateRange(start, end);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getEventsRange(owner_id, start, end);
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { 
        content: [{ type: "text", text: `Sem eventos para ${start}..${end}.` }], 
        structuredContent: { no_data: true, start, end, message: `Sem eventos para ${start}..${end}.` },
        isError: false 
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const count = Array.isArray(safe?.events) ? safe.events.length : 0;
    const summary = `Eventos ${start} → ${end} — ${count} itens`;
    return render(safe, summary);
  }
};
