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

CONVERSA: Ao começar, busque o histórico recente com a ferramenta get_conversation_history quando apropriado (especialmente se o usuário fizer referência a mensagens anteriores).

REGRAS PARA DATAS AMBÍGUAS:
- Quando o usuário disser "dia N" sem mês explícito, procure no HISTÓRICO o mês mais recente citado explicitamente (ex.: "agosto", "setembro").
- Se encontrar um mês explícito recente, use esse mês para resolver a data e CHAME a ferramenta apropriada (ex.: get_daily_kpi_on_date, get_orders_range com start=end=YYYY-MM-DD).
- Se NÃO houver mês explícito no histórico, PERGUNTE qual mês (não assuma o mês atual).
- Só assuma o mês atual quando o usuário disser claramente "este mês", "agora" ou similar.

CONTEXTO TEMPORAL CRÍTICO:
- Chame get_current_date APENAS quando houver referências RELATIVAS ("hoje", "ontem", "esta semana", "mês passado") ou quando precisar do ANO para uma data que já tenha mês e dia.
- Não chame get_current_date para substituir uma data explícita obtida do histórico.
- Use a data atual apenas para completar o ano quando necessário, não para mudar mês/dia.

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
      tool_choice: forceDaily ? { type: 'function', function: { name: 'get_daily_kpi_on_date' } } : (iter === 0 && from_e164 ? { type: 'function', function: { name: 'get_conversation_history' } } : 'auto'),
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

    // Defer any history hint until AFTER all tool messages are pushed
    let deferredHistoryHint: string | null = null;

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
          // Build a short, explicit context hint for date disambiguation based on history (DEFERRED)
          try {
            const monthMap: Record<string, number> = {
              'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
              'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
            };
            const rxFull = /\b(?:no\s+dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/i;
            let foundDay: number | null = null;
            let foundMonth: number | null = null;
            let foundYear: number | null = null;
            for (const m of (Array.isArray(sc.messages) ? sc.messages : [])) {
              const txt = String(m?.message || '');
              const mm = txt.match(rxFull);
              if (mm) {
                foundDay = parseInt(mm[1], 10);
                const mon = (mm[2] || '').toLowerCase();
                foundMonth = monthMap[mon] || null;
                foundYear = mm[3] ? parseInt(mm[3], 10) : null;
                break; // most recent
              }
            }
            if (foundDay && foundMonth) {
              deferredHistoryHint = `Contexto do histórico: última data explícita mencionada: ${String(foundDay).padStart(2,'0')}/${String(foundMonth).padStart(2,'0')}${foundYear ? '/' + foundYear : ''}. Se o usuário disser "neste mesmo dia" ou "dia N" se referindo a esta conversa, interprete como esta data e não chame get_current_date.`;
            }
          } catch (e) {
            console.log('[gateway] build_history_hint_error', { err: (e as any)?.message });
          }
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

    // Now that all tool_call_ids have tool responses, inject the hint if available
    if (deferredHistoryHint) {
      messages.push({ role: 'system', content: deferredHistoryHint });
      console.log('[gateway] injected_history_hint', { hint: deferredHistoryHint });
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