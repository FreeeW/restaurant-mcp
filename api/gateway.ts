// Avoid framework-specific types here to keep it portable in Vercel Node runtime
let openaiClient: any = null;

// Import from unified MCP server (single source of truth)
// @ts-ignore - dynamic import; types resolved at runtime in Vercel  
import { tools, toolHandlers } from '../dist/src/index.js';

async function getOpenAI() {
  if (openaiClient) return openaiClient;
  // @ts-ignore - dynamic import; types resolved at runtime in Vercel
  const mod: any = await import('openai');
  const OpenAI = mod.default || mod;
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  console.log('[gateway] OpenAI client initialized', { model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
  return openaiClient;
}

let toolsReady = false;
let lastDebug: any = {};

async function ensureTools() {
  if (toolsReady) return;
  console.log('[gateway][tools] loading from unified MCP server', {
    hasSbUrl: !!process.env.SUPABASE_URL,
    hasSbKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  console.log('[gateway] tools loaded:', tools.map((t: any) => t.name));
  toolsReady = true;
}

function toOpenAITools(mcpTools: typeof tools) {
  return mcpTools.map((t: any) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.inputSchema ?? { type: 'object', properties: {}, additionalProperties: true },
    },
  }));
}

async function runChat(owner_id: string, text: string, from_e164?: string): Promise<string> {
  await ensureTools();

  const openaiTools = toOpenAITools(tools);
  const system = `
# IDENTIDADE
Você é um assistente especializado em gestão de restaurantes que responde via WhatsApp.
Seu foco é ajudar o dono com KPIs, custos e operações diárias, com respostas claras e úteis.

# OBJETIVO
Fornecer análises corretas (sem inventar), com formato legível e orientação prática.

# REGRAS TÉCNICAS (NÃO ALTERAR LÓGICA)
- Inicialização:
  - **SEMPRE** chame get_current_date ao iniciar para ancorar ano/mês/dia.
  - Se o usuário informar **dia+mês sem ano**, use **current_year** de get_current_date.
- Disambiguação:
  - Se a pergunta for ambígua ou referir mensagens anteriores (ex.: **"e dia 20?"**, **"nessa semana?"**, **"isso?"**), chame **get_conversation_history**.
  - Para expressões relativas (**"semana passada"**, **"esta semana"**, **"mês passado"**, **"últimos N dias"**), use **resolve_relative_range** e aplique o **start/end** retornados.
- Parâmetros obrigatórios nas ferramentas:
  - **owner_id**: "${owner_id}"
  - **from_e164** (se disponível, sem +): "${from_e164 || ''}"

# FORMATAÇÃO DA RESPOSTA
- Estilo: natural, direto, **pt-BR**, sem jargões desnecessários.
- Estrutura:
  - Use **negrito** para títulos/valores-chave.
  - Separe em blocos com quebras de linha.
  - Use **bullets** quando listar itens.
- Números:
  - **Moeda**: R$ 1.234,56
  - **Percentual**: decimal × 100 com **1 casa** (ex.: 0,246 → **24,6%**)
  - **Datas**: DD/MM ou DD/MM/AAAA
  - **Horas**: 123,5h ou HH:MM

# BOAS PRÁTICAS
- Se, mesmo com histórico, **permanecer ambíguo**, faça **1** pergunta curta de esclarecimento (não chute).
- Mostre apenas o necessário; destaque conclusões (ex.: saudável/atenção/crítico) quando houver base.
- Prefira dados recentes quando houver conflito de contexto.

# CASOS ESPECIAIS
- **no_data: true** → explique a ausência e sugira o que fazer (ex.: verificar operação/lançamento).
- **Erro de ferramenta** → mensagem amigável e orientação breve.
- **Dados incompletos** → mostre o que há e indique o que falta (sem inventar).

# RESTRIÇÕES
- **Não invente** dados.
- **Não** tente outras datas/períodos se a ferramenta retornar **no_data** (explique e pare).
- **Sempre** responda em português brasileiro.

(Se houver mensagens de contexto recentes em system, use-as apenas como referência; as ferramentas determinam as datas/períodos finais.)
`;

  // Prefetch recent history (compact context) when we have identifiers
  let historyContext = '';
  if (owner_id && from_e164) {
    try {
      const hist = await toolHandlers.get_conversation_history({ owner_id, from_e164: from_e164.replace(/^\+/, ''), limit: 10 });
      const sc: any = hist?.structuredContent ?? {};
      const msgs: any[] = Array.isArray(sc?.messages) ? sc.messages : [];
      if (msgs.length > 0) {
        // chronological (oldest -> newest)
        const chron = [...msgs].reverse().slice(-10);
        const lines = chron.map(m => {
          const dir = m?.direction === 'in' ? 'U' : 'B';
          const text = String(m?.message || '').replace(/\s+/g, ' ').slice(0, 120);
          const day = (m?.created_at || '').slice(0, 10);
          return `${day} [${dir}]: ${text}`;
        });
        historyContext = `Contexto recente (referência, não substitui datas/períodos):\n${lines.join('\n')}`;
      }
    } catch (e) {
      console.log('[gateway] history_prefetch_error', { err: (e as any)?.message });
    }
  }

  const messages: any[] = [
    { role: 'system', content: system },
    ...(historyContext ? [{ role: 'system', content: historyContext }] : []),
    { role: 'user', content: text },
  ];

  for (let iter = 0; iter < 6; iter++) {
    const openai = await getOpenAI();
    const forceDaily = /\\bforce:get_daily_kpi_on_date\\b/i.test(text);
    // snapshot of what the model will see
    console.log('[gateway][iter] messages_snapshot', iter, messages.map((m: any) => ({
      role: m.role,
      tool_calls: m.tool_calls?.map((t: any) => t.function?.name),
      content_preview: typeof m.content === 'string'
        ? m.content.slice(0, 200)
        : m.content ? JSON.stringify(m.content).slice(0, 200) : null
    })));
    console.log('[gateway] openai.chat.completions.create', { iter, forceDaily, toolsCount: openaiTools.length });
    lastDebug = { ...(lastDebug || {}), iter, forceDaily, toolsCount: openaiTools.length, ts: Date.now() };
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools: openaiTools,
      tool_choice: forceDaily ? { type: 'function', function: { name: 'get_daily_kpi_on_date' } } : (iter === 0 ? { type: 'function', function: { name: 'get_current_date' } } : 'auto'),
      temperature: 0.2,
    });

    const msg = resp.choices[0]?.message;
    if (!msg) return 'Erro temporário. Tente novamente.';

    const toolCalls = msg.tool_calls ?? [];
    try {
      console.log('[gateway] model response', { hasToolCalls: !!toolCalls.length, preview: String(msg.content || '').slice(0, 80) });
      if (toolCalls.length) console.log('[gateway] tool_calls:', toolCalls.map((t: any) => t.function?.name));
      lastDebug = { ...(lastDebug || {}), hasToolCalls: !!toolCalls.length, toolCalls: toolCalls.map((t: any) => t.function?.name), preview: String(msg.content || '').slice(0, 80) };
    } catch {}
    if (!toolCalls.length) {
      const final = msg.content?.toString().trim() || 'Ok.';
      return final;
    }

    // Add assistant message with tool_calls BEFORE processing tools
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls as any });

    for (const tc of toolCalls) {
      const name = tc.function?.name || '';
      const argsText = tc.function?.arguments || '{}';
      let args: any = {};
      try { args = JSON.parse(argsText); } catch {}
      if (owner_id && (args && typeof args === 'object')) args.owner_id ??= owner_id;
      if (from_e164 && (args && typeof args === 'object')) args.from_e164 ??= from_e164.replace(/^\+/, '');

      try {
        console.log('[gateway] callTool', { name, args });
        const handler = toolHandlers[name];
        if (!handler) {
          console.error('[gateway] unknown tool:', name);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ error: `Unknown tool: ${name}` }),
          } as any);
          continue;
        }
        
        const result = await handler(args);
        try {
          console.log('[gateway] tool_result', { name, isError: !!result?.isError, hasStructured: !!result?.structuredContent });
          const prev = Array.isArray((lastDebug || {}).results) ? lastDebug.results : [];
          lastDebug = { ...(lastDebug || {}), results: [...prev, { name, isError: !!result?.isError, hasStructured: !!result?.structuredContent }] };
        } catch {}
        // detailed tool result logging (history sample when applicable)
        const sc: any = result?.structuredContent ?? {};
        const msgCount = Array.isArray(sc?.messages) ? sc.messages.length : undefined;
        console.log('[gateway] tool_result_detail', {
          name, isError: !!result?.isError, keys: sc ? Object.keys(sc) : [], msgCount
        });
        if (name === 'get_conversation_history' && msgCount) {
          const first = sc.messages[0];
          const last = sc.messages[msgCount - 1];
          console.log('[gateway] history_sample', {
            from: sc.from_e164, count: msgCount,
            first_preview: `${first?.direction || ''}:${(first?.message || '').slice(0, 120)}`,
            last_preview: `${last?.direction || ''}:${(last?.message || '').slice(0, 120)}`
          });
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result?.structuredContent ?? result ?? {}),
        } as any);
        const tail = messages.slice(-4).map((m: any) => ({
          role: m.role,
          hasToolCalls: !!m.tool_calls,
          content_len: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content || '').length
        }));
        console.log('[gateway] messages_tail_after_tool', tail);
        
        // If we got a valid "no data" response, encourage the AI to provide a summary
        if (result?.structuredContent?.no_data) {
          console.log('[gateway] detected no_data response, will encourage summary');
        }
      } catch (err: any) {
        console.error('[gateway][callTool_error]', {
          name,
          errMsg: err?.message || String(err),
          stack: err?.stack?.slice(0, 500),
        });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: err?.message || 'Tool execution failed' }),
        } as any);
      }
    }
  }

  return 'Não consegui concluir a operação com ferramentas. Tente novamente.';
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const expected = process.env.AI_GATEWAY_TOKEN ?? process.env.GATEWAY_SECRET;
    if (expected) {
      const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!got || got !== expected) return res.status(401).json({ error: 'unauthorized' });
    }

    const { owner_id, from, text } = (req.body || {}) as { owner_id?: string; from?: string; text?: string };
    if (!owner_id || !text) return res.status(400).json({ error: 'missing_owner_id_or_text' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'missing_openai_key' });

    const reply = await runChat(owner_id, text, from);
    return res.status(200).json({ reply });
  } catch (e: any) {
    console.error('gateway_error', e?.message || e);
    return res.status(500).json({ error: 'gateway_error' });
  }
}