import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getDailyKpi, getDailyKpiOnDate, getPeriodKpis, getShiftsRange, getEmployeePay, getOrdersRange, getNotesRange, addEvent, getEventsRange, employeeExists, getConversationHistory, getLicensesStatus, getExpiringLicenses, addLicense, updateLicenseStatus, getLicenseById } from "./db.js";
import { validateUUID, isYMD, assertDateRange, assertEmpCode, assertHHMM, assertE164, assertPhoneDigits, assertLicenseCategory, assertLicenseStatus } from "./validators.js";

// ---- MCP server ----
const server = new Server(
  { name: "restaurant-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// ---- tools list (schemas) ----
export const tools = [
  {
    name: "get_conversation_history",
    description: "Busca o histórico de conversas recentes para entender o contexto. Use esta ferramenta quando a pergunta fizer referência a mensagens anteriores ou houver ambiguidade contextual (ex.: 'e dia 20?', 'neste mesmo dia', 'nessa semana', 'e em setembro?', 'isso', 'como antes'). Se não tiver certeza do período ou do que o usuário está referindo, chame esta ferramenta antes de responder.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        from_e164: { type: "string", description: "Telefone sem + (ex: 5511999999999)" },
        limit: { type: "number", description: "Limite de mensagens (padrão: 10)" }
      },
      required: ["owner_id", "from_e164"],
      additionalProperties: false
    }
  },
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
  },
  {
    name: "get_current_date",
    description: "Obtém a data e hora atual para contexto temporal. SEMPRE chame esta ferramenta antes de interpretar datas relativas como 'hoje', 'ontem', 'esta semana', 'mês passado', etc.",
    inputSchema: {
      type: "object",
      properties: {
        timezone: { 
          type: "string", 
          description: "Timezone opcional (ex: America/Sao_Paulo)",
          default: "America/Sao_Paulo"
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "resolve_relative_range",
    description: "Resolve expressões temporais relativas (pt-BR) como 'semana passada', 'semana retrasada', 'esta semana', 'mês passado', 'este mês', 'últimos 7 dias', 'últimos 30 dias' em um intervalo de datas ISO (YYYY-MM-DD). Use esta ferramenta SEMPRE que detectar essas expressões para obter 'start' e 'end' determinísticos (sem depender do histórico). Semana é de segunda a domingo.",
    inputSchema: {
      type: "object",
      properties: {
        phrase: { type: "string", description: "Ex.: 'semana passada', 'mês passado', 'semana retrasada', 'esta semana', 'últimos 7 dias'" },
        timezone: { type: "string", description: "Timezone IANA", default: "America/Sao_Paulo" },
        reference_date: { type: "string", description: "YYYY-MM-DD opcional; data de referência no timezone" }
      },
      required: ["phrase"],
      additionalProperties: false
    }
  },
  // ========== TOOLS DE ALVARÁS/LICENÇAS ==========
  {
    name: "get_licenses_status",
    description: "Lista todos os alvarás/licenças e suas situações (vencidos, próximos do vencimento, ok). Use quando perguntarem sobre alvarás, licenças, documentos de funcionamento, vigilância sanitária, bombeiros, etc.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        include_expired: { type: "boolean", description: "Incluir alvarás vencidos (padrão: false)" }
      },
      required: ["owner_id"],
      additionalProperties: false
    }
  },
  {
    name: "get_expiring_licenses",
    description: "Lista alvarás próximos do vencimento. Use para verificar quais documentos precisam ser renovados em breve.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        days_ahead: { type: "number", description: "Quantos dias à frente verificar (padrão: 30)" }
      },
      required: ["owner_id"],
      additionalProperties: false
    }
  },
  {
    name: "add_license",
    description: "Adiciona um novo alvará ou licença ao sistema de controle.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        title: { type: "string", description: "Nome do alvará (ex: Alvará de Funcionamento)" },
        expiry_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
        license_number: { type: "string", description: "Número do documento (opcional)" },
        issuing_authority: { type: "string", description: "Órgão emissor (opcional)" },
        issue_date: { type: "string", description: "Data de emissão (YYYY-MM-DD) (opcional)" },
        renewal_deadline: { type: "string", description: "Prazo para renovação (YYYY-MM-DD) (opcional)" },
        category: { type: "string", description: "Categoria: sanitario, bombeiros, funcionamento, ambiental, outros (opcional)" },
        notes: { type: "string", description: "Observações (opcional)" }
      },
      required: ["owner_id", "title", "expiry_date"],
      additionalProperties: false
    }
  },
  {
    name: "update_license_status",
    description: "Atualiza o status de um alvará existente (ex: renovado, cancelado, pendente de renovação).",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        license_id: { type: "string", description: "UUID do alvará" },
        status: { type: "string", description: "Novo status: active, expired, pending_renewal, renewed, cancelled" },
        notes: { type: "string", description: "Observações sobre a atualização (opcional)" }
      },
      required: ["owner_id", "license_id", "status"],
      additionalProperties: false
    }
  },
  {
    name: "get_license_by_id",
    description: "Busca detalhes de um alvará específico pelo ID.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "UUID do proprietário" },
        license_id: { type: "string", description: "UUID do alvará" }
      },
      required: ["owner_id", "license_id"],
      additionalProperties: false
    }
  }
] as const;

// ---- helpers ----
function summarizeDaily(day: string, safe: any) {
  const formatPct = (v?: number | null) => v == null ? "N/A" : `${(v * 100).toFixed(1)}%`;
  if (safe?.net_sales == null) {
    // Align text with JSON nulls
    return `KPIs de ${day} — Vendas: Não registrado • CMV: ${formatPct(null)} • Labour: ${formatPct(null)}`;
  }
  const ns = Number(safe.net_sales).toLocaleString("pt-BR");
  const fp = formatPct(safe?.food_pct);
  const lp = formatPct(safe?.labour_pct);
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

// ---- list tools ----
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// ---- call tool ----
type ToolResp = Promise<{ content: any[]; isError?: boolean; structuredContent?: any }>;
type ToolHandler = (args: any) => ToolResp;

export const toolHandlers: Record<string, ToolHandler> = {
  get_conversation_history: async ({ owner_id, from_e164, limit = 10 }) => {
    try {
      validateUUID(owner_id);
      assertPhoneDigits(from_e164);
      const n = Number(limit);
      if (!Number.isFinite(n) || n <= 0 || n > 100) throw new Error("invalid limit (1..100)");
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    console.log('[tool][get_conversation_history][start]', {
      owner: owner_id.slice(0, 8), from_e164, limit
    });
    const data = await getConversationHistory(owner_id, from_e164, limit);
    const __count = Number((data as any)?.conversation_count ?? (Array.isArray((data as any)?.messages) ? (data as any).messages.length : 0));
    console.log('[tool][get_conversation_history][fetched]', { count: __count });
    if (!data || !Array.isArray(data?.messages) || data.messages.length === 0) {
      const message = `Nenhum histórico de conversa encontrado para ${from_e164}.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          owner_id,
          from_e164,
          message,
          conversation_count: 0,
          messages: []
        },
        isError: false
      } as any;
    }
    const safe = JSON.parse(JSON.stringify(data));
    const count = Number(safe?.conversation_count ?? safe?.messages?.length ?? 0);
    const summary = `Histórico: ${count} mensagens com ${from_e164}`;
    return render(safe, summary);
  },
  get_daily_kpi: async ({ owner_id, day }) => {
    try {
      validateUUID(owner_id);
      if (!isYMD(day)) throw new Error("invalid day (YYYY-MM-DD)");
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    const data = await getDailyKpi(owner_id, day);
    if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
      const message = `Nenhuma venda registrada para ${day}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          day,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null
        },
        isError: false
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    if (safe?.net_sales == null) {
      const message = `Nenhuma venda registrada para ${day}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          day,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null
        },
        isError: false
      };
    }
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
      const message = `Nenhuma venda registrada para ${day}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          day,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null,
          food_cost: null,
          labour_cost: null
        },
        isError: false
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    if (safe?.net_sales == null) {
      const message = `Nenhuma venda registrada para ${day}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          day,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null,
          food_cost: null,
          labour_cost: null
        },
        isError: false
      };
    }
    const pct = (v?: number | null) => v == null ? "N/A" : `${(v * 100).toFixed(1)}%`;
    const ns = safe?.net_sales == null ? "Não registrado" : `R$ ${Number(safe.net_sales).toLocaleString("pt-BR")}`;
    const fc = safe?.food_cost == null ? "N/A" : `R$ ${Number(safe.food_cost).toLocaleString("pt-BR")}`;
    const lc = safe?.labour_cost == null ? "N/A" : `R$ ${Number(safe.labour_cost).toLocaleString("pt-BR")}`;
    const fp = pct(safe?.food_pct);
    const lp = pct(safe?.labour_pct);
    const summary = `KPIs detalhados ${day} — Vendas: ${ns} • Food: ${fc} (${fp}) • Labour: ${lc} (${lp})`;
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
      const message = `Nenhuma venda registrada em ${start}..${end}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          start,
          end,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null
        },
        isError: false
      };
    }
    const safe = JSON.parse(JSON.stringify(data));
    if (safe?.net_sales == null) {
      const message = `Nenhuma venda registrada em ${start}..${end}. Restaurante fechado ou dados não inseridos ainda.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          start,
          end,
          message,
          suggestions: [
            "Verifique se o restaurante estava aberto",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: null,
          food_pct: null,
          labour_pct: null
        },
        isError: false
      };
    }
    if (Number(safe?.net_sales) === 0 && safe?.food_pct == null && safe?.labour_pct == null) {
      const message = `Sem vendas registradas no período ${start}..${end}. Pode indicar dias sem operação ou dados não inseridos.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: false,
          zero_sales: true,
          start,
          end,
          message,
          suggestions: [
            "Verifique se o restaurante esteve aberto no período",
            "Confirme se as vendas foram registradas no sistema"
          ],
          net_sales: 0,
          food_pct: null,
          labour_pct: null
        },
        isError: false
      };
    }
    const pct = (v?: number | null) => v == null ? "N/A" : `${(v * 100).toFixed(1)}%`;
    const ns = `R$ ${Number(safe.net_sales).toLocaleString("pt-BR")}`;
    const fp = pct(safe?.food_pct);
    const lp = pct(safe?.labour_pct);
    const summary = `KPIs ${start} → ${end} — Vendas: ${ns} • CMV: ${fp} • Labour: ${lp}`;
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
    // 1) Validação de existência do funcionário
    try {
      const exists = await employeeExists(owner_id, emp_code);
      if (!exists) {
        const message = `Funcionário com código '${emp_code}' não encontrado. Verifique o código ou consulte a lista de funcionários ativos.`;
        return { content: [{ type: "text", text: message }], isError: true } as any;
      }
    } catch (e: any) {
      // Caso o lookup falhe por erro de conexão/consulta
      return { content: [{ type: "text", text: e?.message || "Erro ao verificar funcionário" }], isError: true };
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
    // 2) Diferenciar "existe mas não trabalhou" (0 horas) de outras situações
    if (Number(safe?.total_hours) === 0) {
      const message = `Funcionário ${emp_code} não trabalhou no período especificado.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          ...safe,
          message
        },
        isError: false
      } as any;
    }
    const hours = Number(safe.total_hours).toLocaleString("pt-BR");
    const pay = Number(safe.total_pay).toLocaleString("pt-BR");
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
  },
  get_current_date: async ({ timezone = "America/Sao_Paulo" }) => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const weekday = parts.find(p => p.type === 'weekday')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      
      const isoDate = `${year}-${month}-${day}`;
      const currentData = {
        current_date: isoDate,
        current_year: parseInt(year!),
        current_month: parseInt(month!), 
        current_day: parseInt(day!),
        weekday: weekday,
        current_time: `${hour}:${minute}`,
        timezone: timezone,
        timestamp: now.toISOString()
      };
      
      const summary = `Data atual: ${weekday}, ${day}/${month}/${year} às ${hour}:${minute} (${timezone})`;
      return render(currentData, summary);
      
    } catch (e: any) {
      return { 
        content: [{ type: "text", text: e?.message || "Erro ao obter data atual" }], 
        isError: true 
      };
    }
  },
  resolve_relative_range: async ({ phrase, timezone = "America/Sao_Paulo", reference_date }: { phrase: string; timezone?: string; reference_date?: string }) => {
    try {
      const norm = (phrase || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      if (!norm.trim()) throw new Error('phrase vazia');

      function getTodayYMD(tz: string): { y: number; m: number; d: number } {
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const [y, m, d] = fmt.format(now).split('-').map(v => parseInt(v, 10));
        return { y, m, d };
      }
      function toDateUTC(y: number, m: number, d: number): Date { return new Date(Date.UTC(y, m - 1, d)); }
      function fromDateUTC(dt: Date): { y: number; m: number; d: number } { return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; }
      function addDays(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
        const t = toDateUTC(y, m, d);
        t.setUTCDate(t.getUTCDate() + delta);
        return fromDateUTC(t);
      }
      function dow(y: number, m: number, d: number): number { return toDateUTC(y, m, d).getUTCDay(); } // 0..6
      function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
      function fmtYMD(obj: { y: number; m: number; d: number }): string { return `${obj.y}-${pad(obj.m)}-${pad(obj.d)}`; }
      function monthLastDay(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

      let ref: { y: number; m: number; d: number };
      if (reference_date && /\d{4}-\d{2}-\d{2}/.test(reference_date)) {
        const [ry, rm, rd] = reference_date.split('-').map(v => parseInt(v, 10));
        ref = { y: ry, m: rm, d: rd };
      } else {
        ref = getTodayYMD(timezone);
      }

      const refDow = dow(ref.y, ref.m, ref.d); // 0..6
      const deltaToMonday = ((refDow + 6) % 7); // 0 if Monday
      const thisMon = addDays(ref.y, ref.m, ref.d, -deltaToMonday);

      let start: { y: number; m: number; d: number } | null = null;
      let end: { y: number; m: number; d: number } | null = null;
      let kind = '';
      let explanation = '';

      const is = (...subs: string[]) => subs.some(s => norm.includes(s));

      if (is('semana passada')) {
        start = addDays(thisMon.y, thisMon.m, thisMon.d, -7);
        end = addDays(start.y, start.m, start.d, 6);
        kind = 'last_week';
        explanation = 'Semana passada (seg a dom) anterior à semana da data de referência';
      } else if (is('semana retrasada')) {
        start = addDays(thisMon.y, thisMon.m, thisMon.d, -14);
        end = addDays(start.y, start.m, start.d, 6);
        kind = 'two_weeks_ago';
        explanation = 'Semana retrasada (seg a dom) duas semanas antes da semana atual';
      } else if (is('esta semana', 'nesta semana', 'nessa semana')) {
        start = thisMon;
        end = addDays(thisMon.y, thisMon.m, thisMon.d, 6);
        kind = 'this_week';
        explanation = 'Semana atual (seg a dom) da data de referência';
      } else if (is('mes passado', 'mês passado')) {
        let y = ref.y, m = ref.m - 1; if (m === 0) { m = 12; y--; }
        start = { y, m, d: 1 };
        end = { y, m, d: monthLastDay(y, m) };
        kind = 'last_month';
        explanation = 'Mês passado (1..último dia)';
      } else if (is('este mes', 'este mês', 'neste mes', 'neste mês')) {
        start = { y: ref.y, m: ref.m, d: 1 };
        end = { y: ref.y, m: ref.m, d: monthLastDay(ref.y, ref.m) };
        kind = 'this_month';
        explanation = 'Este mês (1..último dia)';
      } else if (is('ultimos 7 dias', 'últimos 7 dias')) {
        start = addDays(ref.y, ref.m, ref.d, -6);
        end = { ...ref };
        kind = 'last_7_days';
        explanation = 'Últimos 7 dias (inclui hoje)';
      } else if (is('ultimos 30 dias', 'últimos 30 dias')) {
        start = addDays(ref.y, ref.m, ref.d, -29);
        end = { ...ref };
        kind = 'last_30_days';
        explanation = 'Últimos 30 dias (inclui hoje)';
      } else {
        return { content: [{ type: 'text', text: 'expressao_nao_suportada' }], isError: true } as any;
      }

      const payload = {
        kind,
        start: fmtYMD(start!),
        end: fmtYMD(end!),
        week_start: 'monday',
        timezone,
        reference_date: fmtYMD(ref),
        explanation
      };
      const summary = `Intervalo: ${payload.start} → ${payload.end} (${kind})`;
      return render(payload, summary);
    } catch (e: any) {
      return { content: [{ type: 'text', text: e?.message || 'erro ao resolver intervalo' }], isError: true };
    }
  },
  
  // ========== HANDLERS DE ALVARÁS/LICENÇAS ==========
  get_licenses_status: async ({ owner_id, include_expired = false }) => {
    try {
      validateUUID(owner_id);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    
    const data = await getLicensesStatus(owner_id, include_expired);
    
    if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
      const message = `Nenhum alvará cadastrado para este restaurante.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          owner_id,
          message,
          summary: { total: 0, expired: 0, expiring_soon: 0, renewal_approaching: 0, ok: 0 },
          licenses: []
        },
        isError: false
      };
    }
    
    const safe = JSON.parse(JSON.stringify(data));
    const summary = safe?.summary;
    
    // Criar mensagem de resumo
    let summaryText = `Status de Alvarás — Total: ${summary?.total || 0}`;
    if (summary?.expired > 0) summaryText += ` • Vencidos: ${summary.expired}`;
    if (summary?.expiring_soon > 0) summaryText += ` • Vencendo em breve: ${summary.expiring_soon}`;
    if (summary?.renewal_approaching > 0) summaryText += ` • Renovação próxima: ${summary.renewal_approaching}`;
    if (summary?.ok > 0) summaryText += ` • Em dia: ${summary.ok}`;
    
    return render(safe, summaryText);
  },

  get_expiring_licenses: async ({ owner_id, days_ahead = 30 }) => {
    try {
      validateUUID(owner_id);
      const days = Number(days_ahead);
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        throw new Error("days_ahead deve ser entre 1 e 365");
      }
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    
    const data = await getExpiringLicenses(owner_id, days_ahead);
    
    if (!data || data?.count === 0) {
      const message = `Nenhum alvará vencendo nos próximos ${days_ahead} dias.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          owner_id,
          days_ahead,
          message,
          count: 0,
          licenses: []
        },
        isError: false
      };
    }
    
    const safe = JSON.parse(JSON.stringify(data));
    const summary = `Alvarás vencendo em ${days_ahead} dias — Total: ${safe?.count || 0}`;
    
    return render(safe, summary);
  },

  add_license: async ({ owner_id, title, expiry_date, license_number, issuing_authority, issue_date, renewal_deadline, category, notes }) => {
    try {
      validateUUID(owner_id);
      if (!title || title.trim() === '') throw new Error("Título é obrigatório");
      if (!isYMD(expiry_date)) throw new Error("Data de vencimento inválida (YYYY-MM-DD)");
      
      // Validações opcionais
      if (issue_date && !isYMD(issue_date)) throw new Error("Data de emissão inválida (YYYY-MM-DD)");
      if (renewal_deadline && !isYMD(renewal_deadline)) throw new Error("Prazo de renovação inválido (YYYY-MM-DD)");
      if (category) assertLicenseCategory(category);
      
      // Validação lógica de datas
      if (issue_date && issue_date > expiry_date) {
        throw new Error("Data de emissão não pode ser posterior ao vencimento");
      }
      if (renewal_deadline && renewal_deadline > expiry_date) {
        throw new Error("Prazo de renovação não pode ser posterior ao vencimento");
      }
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    
    const data = await addLicense(owner_id, title, expiry_date, {
      license_number,
      issuing_authority,
      issue_date,
      renewal_deadline,
      category,
      notes
    });
    
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { content: [{ type: "text", text: `Falha ao adicionar alvará.` }], isError: true };
    }
    
    const safe = JSON.parse(JSON.stringify(data));
    const daysUntil = safe?.days_until_expiry;
    let statusMsg = daysUntil < 0 ? " (VENCIDO)" : daysUntil <= 30 ? " (ATENÇÃO: vence em breve)" : "";
    
    const summary = `Alvará adicionado: ${safe?.title} — Vence: ${safe?.expiry_date}${statusMsg}`;
    
    return render(safe, summary);
  },

  update_license_status: async ({ owner_id, license_id, status, notes }) => {
    try {
      validateUUID(owner_id);
      validateUUID(license_id);
      assertLicenseStatus(status);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    
    const data = await updateLicenseStatus(owner_id, license_id, status, notes);
    
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { content: [{ type: "text", text: `Falha ao atualizar status do alvará.` }], isError: true };
    }
    
    const safe = JSON.parse(JSON.stringify(data));
    const statusMap: Record<string, string> = {
      'active': 'Ativo',
      'expired': 'Vencido',
      'pending_renewal': 'Pendente de Renovação',
      'renewed': 'Renovado',
      'cancelled': 'Cancelado'
    };
    
    const summary = `Status atualizado: ${safe?.title} — Novo status: ${statusMap[safe?.status] || safe?.status}`;
    
    return render(safe, summary);
  },

  get_license_by_id: async ({ owner_id, license_id }) => {
    try {
      validateUUID(owner_id);
      validateUUID(license_id);
    } catch (e: any) {
      return { content: [{ type: "text", text: e?.message || "Invalid arguments" }], isError: true };
    }
    
    const data = await getLicenseById(owner_id, license_id);
    
    if (!data) {
      const message = `Alvará não encontrado.`;
      return {
        content: [{ type: "text", text: message }],
        structuredContent: {
          no_data: true,
          owner_id,
          license_id,
          message
        },
        isError: false
      };
    }
    
    const safe = JSON.parse(JSON.stringify(data));
    const daysUntil = safe?.days_until_expiry;
    let statusMsg = daysUntil < 0 ? " (VENCIDO)" : daysUntil <= 30 ? " (vence em breve)" : "";
    
    const summary = `Alvará: ${safe?.title} — Vence: ${safe?.expiry_date}${statusMsg} • Status: ${safe?.status}`;
    
    return render(safe, summary);
  }
};

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const { name, arguments: args } = req.params as any;
    const handler = toolHandlers[name];
    if (!handler) return { content: [{ type: "text", text: `Unknown tool ${name}` }], isError: true };
    return await handler(args);
  } catch (e: any) {
    console.error("[tool_error]", e?.message || String(e));
    return { content: [{ type: "text", text: e?.message || "tool error" }], isError: true };
  }
});

// ---- start ----
(async () => {
  try {
    await server.connect(new StdioServerTransport());
    console.error(`[server] restaurant-mcp up`);
  } catch (e) {
    console.error("Failed to start:", e);
    process.exit(1);
  }
})();