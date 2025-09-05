# restaurant-mcp

Servidor MCP que expõe ferramentas para consultar KPIs de restaurante via Supabase.

# Visão geral

- MCP server para restaurante: expõe ferramentas que consultam Supabase.
- Integra com Claude Desktop via stdio.
- Saída fixa: TEXT (summary) + TEXT (JSON) + structuredContent.

# Arquitetura (resumo)

- `src/index.ts`: servidor MCP (lista e executa ferramentas).
- `src/db.ts`: cliente Supabase e wrappers.
- Claude: chama tools via config em `claude_desktop_config.json`.

# Requisitos

- Node >= 18.
- Conta Supabase (url + service role key).
- Claude Desktop (opcional para dev).

# Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (NUNCA commitar) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |


# Como rodar (dev)

```bash
npm i
npx tsx src/index.ts
```

Ver log de conexão no stderr: `[server] restaurant-mcp up`

Teste manual via Claude Desktop ou stdin/stdout direto.

# Como conectar no Claude Desktop

Adicione no `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "restaurant-mcp": {
      "command": "npx",
      "args": ["tsx", "/caminho/para/restaurant-mcp/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://SEU_PROJETO.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "SUA_SERVICE_ROLE_KEY_AQUI"
      }
    }
  }
}
```

**⚠️ Importante**: Substitua os placeholders pelas suas credenciais reais.

# Ferramentas disponíveis

## get_daily_kpi

**Descrição**: KPIs resumidos (vendas, % food, % labour) de um dia.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string", "description": "UUID" },
    "day": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "day"]
}
```

**Exemplo de uso no Claude**:
```
Call get_daily_kpi with { "owner_id": "123e4567-e89b-12d3-a456-426614174000", "day": "2024-01-15" }
```

## get_daily_kpi_on_date

**Descrição**: KPIs detalhados (inclui `food_cost` e `labour_cost`) para um dia.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string", "description": "UUID" },
    "day": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "day"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_daily_kpi_on_date with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "day": "2024-01-15" }
```

## get_period_kpis

**Descrição**: KPIs agregados em um intervalo de datas.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_period_kpis with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "start": "2024-01-01", "end": "2024-01-31" }
```

## get_shifts_range

**Descrição**: Soma de horas por funcionário em um intervalo de datas (planejamento de escala / insights de staffing).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_shifts_range with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "start": "2024-06-01", "end": "2024-06-30" }
```

## get_employee_pay

**Descrição**: Horas/dia, taxa e totais para um funcionário em um intervalo (útil para payroll e custo individual).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "emp_code": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "emp_code", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_employee_pay with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "emp_code": "A123", "start": "2024-06-01", "end": "2024-06-30" }
```

## get_orders_range

**Descrição**: Compras de insumos (pedidos a fornecedores) em um intervalo. Útil para controle de custo, entregas e monitoramento de fornecedores.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_orders_range with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "start": "2024-07-01", "end": "2024-07-31" }
```

## get_notes_range

**Descrição**: Observações (texto livre) em um intervalo de datas. Útil para contexto operacional.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_notes_range with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "start": "2024-07-01", "end": "2024-07-31" }
```

## add_event

**Descrição**: Cria um novo evento/lembrete (agenda + WhatsApp reminder cron).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string", "description": "UUID do dono" },
    "date": { "type": "string", "description": "YYYY-MM-DD" },
    "title": { "type": "string", "description": "Título do evento" },
    "kind": { "type": "string", "description": "Categoria opcional (ex.: manutenção, entrega)" },
    "time": { "type": "string", "description": "HH:MM opcional" },
    "notes": { "type": "string", "description": "Notas adicionais" }
  },
  "required": ["owner_id", "date", "title"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call add_event with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "date": "2024-08-10", "title": "Manutenção da câmara fria", "kind": "manutencao", "time": "08:30", "notes": "Técnico João" }
```

## get_events_range

**Descrição**: Lista eventos/lembretes do dono em um intervalo de datas.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner_id": { "type": "string" },
    "start": { "type": "string", "description": "YYYY-MM-DD" },
    "end": { "type": "string", "description": "YYYY-MM-DD" }
  },
  "required": ["owner_id", "start", "end"],
  "additionalProperties": false
}
```

**Exemplo de uso no Claude**:
```
Call get_events_range with { "owner_id": "ecb8571b-fb2c-4ff6-8799-25fe038b9aa1", "start": "2024-08-01", "end": "2024-08-31" }
```

# Padrão de resposta

- Sempre retorna três coisas:
  - TEXT humano curto (summary)
  - TEXT contendo JSON serializado (para agentes/parse)
  - `structuredContent` com o mesmo objeto (para UIs que suportam)

**Exemplo de saída (desktop)**:
```
KPIs de 2024-01-15 — Vendas: R$ 12.500 • CMV: 32% • Labour: 28%
```

**Exemplo (json)**:
```json
{
  "content": [
    { "type": "text", "text": "{\"day\":\"2024-01-15\",\"net_sales\":12500,\"food_pct\":0.32,\"labour_pct\":0.28}" }
  ],
  "structuredContent": {
    "day": "2024-01-15",
    "net_sales": 12500,
    "food_pct": 0.32,
    "labour_pct": 0.28
  },
  "isError": false
}
```

## Validação de inputs

- Os handlers usam validadores em `src/validators.ts`:
  - `validateUUID(owner_id)` (UUID v4)
  - `isYMD(day)` (YYYY-MM-DD)
  - Outros auxiliares disponíveis: `assertDateRange`, `assertEmpCode`, `assertTemplate`.
  - Em erro de validação, a tool retorna `{ isError: true, content: [ { type: "text", text: "..." } ] }`.

# Supabase

Configure as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente.

**⚠️ Segurança**: Chaves não devem ir para o repositório.

**RPC esperada**: A função `get_daily_kpi(p_owner, p_day)` deve existir no Supabase e retornar:
```json
{
  "day": "2024-01-15",
  "net_sales": 12500.00,
  "food_pct": 0.32,
  "labour_pct": 0.28
}
```

# Debug / Logs

**Logs do Claude (macOS)**:
```bash
tail -f "$HOME/Library/Logs/Claude/mcp-server-restaurant-mcp.log"
```

**Logs do processo local**: stderr no terminal onde rodou `npx tsx src/index.ts`.

# Adicionando uma nova tool (passo a passo)

1. **Criar wrapper em `src/db.ts`**:
```typescript
export async function getPeriodKpis(ownerId: string, startDate: string, endDate: string) {
  const { data, error } = await sb.rpc("get_period_kpis", { 
    p_owner: ownerId, 
    p_start: startDate, 
    p_end: endDate 
  });
  if (error) throw new Error(error.message);
  return data;
}
```

2. **Registrar schema no array `tools`**:
```typescript
{
  name: "get_period_kpis",
  description: "KPIs de um período (múltiplos dias)",
  inputSchema: {
    type: "object",
    properties: {
      owner_id: { type: "string", description: "UUID" },
      start_date: { type: "string", description: "YYYY-MM-DD" },
      end_date: { type: "string", description: "YYYY-MM-DD" }
    },
    required: ["owner_id", "start_date", "end_date"]
  }
}
```

3. **Tratar na handler `CallToolRequestSchema`** (padrão recomendado: registry de handlers):
```typescript
type ToolResp = Promise<{ content: any[]; isError?: boolean; structuredContent?: any }>;
type ToolHandler = (args: any) => ToolResp;

const toolHandlers: Record<string, ToolHandler> = {
  get_period_kpis: async ({ owner_id, start_date, end_date }) => {
    if (typeof owner_id !== "string" || typeof start_date !== "string" || typeof end_date !== "string") {
      return { content: [{ type: "text", text: "Invalid arguments" }], isError: true };
    }
    const data = await getPeriodKpis(owner_id, start_date, end_date);
    if (!data || (typeof data === "object" && !Object.keys(data).length)) {
      return { content: [{ type: "text", text: `Sem dados para ${start_date}..${end_date}.` }], isError: false };
    }
    const safe = JSON.parse(JSON.stringify(data));
    const summary = `Período ${start_date} a ${end_date}: ${Array.isArray(safe) ? safe.length : 1} registros`;
    return render(safe, summary); // render já cuida de TEXT vs structuredContent
  }
};

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const { name, arguments: args } = req.params as any;
    const handler = toolHandlers[name];
    if (!handler) return { content: [{ type: "text", text: `Unknown tool ${name}` }], isError: true };
    return await handler(args);
  } catch (e: any) {
    return { content: [{ type: "text", text: e?.message || "tool error" }], isError: true };
  }
});
```

4. **Testar no Claude e no terminal**.

# Segurança

- Não commitar keys reais no código.
- Preferir variáveis de ambiente no config do Claude Desktop ou no shell local.
- Use service role key apenas para operações server-side seguras.

# Roadmap curto

- Adicionar mais RPCs (events, shifts, orders, notes).
- Testes automatizados de tools.
- Integração com orquestrador de produção (LLM via API) usando `MCP_OUTPUT=json`.
- Validação mais robusta de inputs.
- Rate limiting e cache para queries frequentes.

# Por que o formato funciona no Claude Desktop

- O MCP atual do Claude não define `content` com `{ type: "json" }`.
- Para compatibilidade, retornamos SEMPRE:
  - `structuredContent`: objeto JSON estruturado (Claude lê diretamente quando disponível);
  - e um bloco `content` com `type: "text"` contendo o JSON serializado (fallback/legibilidade);
  - além de um resumo humano curto (primeiro bloco de `text`).
- A função `render()` em `src/index.ts` implementa esse contrato fixo:
```typescript
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
```

# Padrão para manter compatível ao adicionar novas tools

- Sempre registrar o schema em `tools` (descoberta pelo Claude).
- Implementar o handler no registry e usar `render(safe, summary)` para padronizar saída.
- Se a tool acessar Supabase, criar um wrapper em `src/db.ts` que:
  - chama `sb.rpc(...)`, faz `throw` em erro e retorna `data`;
  - não formata texto nem cuida de UX.
- Validar inputs no handler, serializar dados via `safe = JSON.parse(JSON.stringify(data))` e chamar `render()`.
- Testar com `MCP_OUTPUT=desktop|json|both` para garantir compatibilidade com Claude Desktop.
