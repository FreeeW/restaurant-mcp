# History Context Behavior (Gateway)

This service is stateless per HTTP request. To provide consistent context without forcing a tool call on every turn, the gateway now prefetches recent conversation history and injects a compact, read-only system message.

What happens
- On each request with `owner_id` and `from`:
  - The gateway calls the same RPC used by the MCP tool (`get_conversation_history`) for the last N messages (default 10).
  - It formats a short chronological summary (oldest → newest) with day, direction (U = user, B = bot), and a trimmed preview.
  - It injects this summary as a system message: “Contexto recente (referência, não substitui datas/períodos)…”. This message is contextual only; it should not override dates or periods returned by tools.

Why
- Ensures the model sees relevant recent context even when it does not explicitly call `get_conversation_history`.
- Keeps the flow clean (no mandatory tool call every turn).
- Avoids tool_call sequencing pitfalls and reduces latency.

Tools behavior remains
- `get_current_date` is still the only forced call on the first iteration to anchor time.
- `resolve_relative_range` is available for relative phrases ("semana passada", "esta semana", "mês passado", "últimos N dias").
- `get_conversation_history` remains available; the model can still call it when deeper context is required. The injected summary is a light reference, not a replacement.

Limits & format
- History limit: 10 messages (configurable in code).
- Each line trimmed to ~120 chars.
- Chronological order (oldest → newest) to preserve narrative flow.

Notes
- The summary is advisory. Tools’ structured JSON (KPIs, orders, etc.) should drive final answers for dates/ranges.
- If a query is ambiguous (e.g., “e dia 20?”), the model can still call `get_conversation_history` explicitly to recover more detail.
