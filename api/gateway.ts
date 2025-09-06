// Avoid framework-specific types here to keep it portable in Vercel Node runtime
let openaiClient: any = null;

// Direct import of MCP tools (no child process)
// @ts-ignore - dynamic import; types resolved at runtime in Vercel  
import { tools, toolHandlers } from '../dist/src/mcp-tools-direct.js';

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
  console.log('[gateway][tools] loading directly (no spawn)', {
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

async function runChat(owner_id: string, text: string): Promise<string> {
  await ensureTools();

  const openaiTools = toOpenAITools(tools);
  const system = `Você é um assistente que usa ferramentas MCP. Sempre inclua "owner_id":"${owner_id}" nos argumentos das ferramentas quando necessário. 

IMPORTANTE: Se uma ferramenta retornar "no_data: true", isso significa que não há dados para aquela data/período específico. NÃO continue tentando outras datas - em vez disso, forneça uma resposta útil explicando que não há dados disponíveis para o período solicitado.

Responda em pt-BR.`;

  const messages: any[] = [
    { role: 'system', content: system },
    { role: 'user', content: text },
  ];

  for (let iter = 0; iter < 6; iter++) {
    const openai = await getOpenAI();
    const forceDaily = /\\bforce:get_daily_kpi_on_date\\b/i.test(text);
    console.log('[gateway] openai.chat.completions.create', { iter, forceDaily, toolsCount: openaiTools.length });
    lastDebug = { ...(lastDebug || {}), iter, forceDaily, toolsCount: openaiTools.length, ts: Date.now() };
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools: openaiTools,
      tool_choice: forceDaily ? { type: 'function', function: { name: 'get_daily_kpi_on_date' } } : 'required',
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
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result?.structuredContent ?? result ?? {}),
        } as any);
        
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

    const reply = await runChat(owner_id, text);
    return res.status(200).json({ reply });
  } catch (e: any) {
    console.error('gateway_error', e?.message || e);
    return res.status(500).json({ error: 'gateway_error' });
  }
}