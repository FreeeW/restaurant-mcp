-- Migration: Normalize phone input in get_conversation_history RPC
-- Change: strip leading '+' from p_from_e164 before querying bot_logs

CREATE OR REPLACE FUNCTION public.get_conversation_history(
  p_owner uuid,
  p_from_e164 text,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH phone AS (
    SELECT ltrim(coalesce(p_from_e164, ''), '+') AS normalized
  ), limited AS (
    SELECT direction, message, created_at
    FROM public.bot_logs
    WHERE owner_id = p_owner
      AND from_e164 = (SELECT normalized FROM phone)
      AND message IS NOT NULL
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT jsonb_build_object(
    'owner_id', p_owner,
    'from_e164', p_from_e164,
    'conversation_count', (
      SELECT COUNT(*) FROM public.bot_logs bl
      WHERE bl.owner_id = p_owner
        AND bl.from_e164 = (SELECT normalized FROM phone)
        AND bl.message IS NOT NULL
    ),
    'messages', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'direction', l.direction,
            'message', l.message,
            'created_at', l.created_at
          ) ORDER BY l.created_at DESC
        )
        FROM limited l
      ),
      '[]'::jsonb
    )
  );
$$;


