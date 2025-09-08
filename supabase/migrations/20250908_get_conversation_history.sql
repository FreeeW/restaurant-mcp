-- Migration: Create RPC get_conversation_history and supporting index
-- Safe to re-run: uses CREATE OR REPLACE FUNCTION and CREATE INDEX IF NOT EXISTS

-- 1) Supporting index for efficient lookups by owner/from/created_at
CREATE INDEX IF NOT EXISTS bot_logs_owner_from_created_idx
  ON public.bot_logs (owner_id, from_e164, created_at DESC);

-- 2) RPC: get_conversation_history
-- Returns recent messages and total count for a given owner and phone
CREATE OR REPLACE FUNCTION public.get_conversation_history(
  p_owner uuid,
  p_from_e164 text,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'owner_id', p_owner,
    'from_e164', p_from_e164,
    'conversation_count', (
      SELECT COUNT(*)
      FROM public.bot_logs bl
      WHERE bl.owner_id = p_owner
        AND bl.from_e164 = p_from_e164
        AND bl.message IS NOT NULL
    ),
    'messages', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'direction', t.direction,
          'message', t.message,
          'created_at', t.created_at
        )
        ORDER BY t.created_at DESC
      )
      FROM (
        SELECT direction, message, created_at
        FROM public.bot_logs
        WHERE owner_id = p_owner
          AND from_e164 = p_from_e164
          AND message IS NOT NULL
        ORDER BY created_at DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 100)
      ) AS t
    ), '[]'::jsonb)
  );
$$;


