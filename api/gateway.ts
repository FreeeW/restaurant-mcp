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
  const system = `Você é um assistente que usa ferramentas MCP para um restaurante. Sempre inclua "owner_id":"${owner_id}" nos argumentos das ferramentas quando necessário.

Se disponível, use também o telefone sem + como contexto: from_e164="${(from_e164 || '')}".

INÍCIO DA CONVERSA:
- Sempre chame get_current_date ao iniciar a conversa para ancorar corretamente ano/mês/dia.

EXPRESSÕES RELATIVAS:
- Para "semana passada", "semana retrasada", "esta semana", "mês passado", "este mês", "últimos N dias": use resolve_relative_range para obter start/end determinísticos (sem depender do histórico) e use esses valores nas consultas (ex.: get_period_kpis, get_orders_range).

CONVERSA/CONTEXTO:
- Use get_conversation_history quando o usuário fizer referência a mensagens anteriores ou quando o contexto recente for útil. Não é obrigatório em toda interação.

FORMATAÇÃO:
- Percentuais retornam como decimais (ex.: 0.2368). Apresente como valor*100 com 1 casa.

IMPORTANTE: Se uma ferramenta retornar "no_data: true", isso significa que não há dados para aquela data/período específico. NÃO continue tentando outras datas - em vez disso, forneça uma resposta útil explicando que não há dados disponíveis para o período solicitado.

Responda em pt-BR.`;

  const messages: any[] = [
    { role: 'system', content: system },
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