-- Versão simplificada sem depender de unaccent
-- Esta versão funciona mesmo sem a extensão unaccent

DROP FUNCTION IF EXISTS search_employees_by_name(uuid, text);

CREATE OR REPLACE FUNCTION search_employees_by_name(
  p_owner uuid,
  p_search_term text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_count int;
  v_normalized_search text;
BEGIN
  -- Normalizar o termo de busca (lowercase, trim)
  -- Versão simplificada sem unaccent por enquanto
  v_normalized_search := lower(trim(p_search_term));
  
  -- Se o termo estiver vazio, retornar erro
  IF v_normalized_search = '' OR v_normalized_search IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Termo de busca vazio',
      'employees', '[]'::json
    );
  END IF;

  -- Buscar funcionários ativos que correspondem ao termo
  WITH matched_employees AS (
    SELECT 
      e.id,
      e.code as emp_code,
      e.name as emp_name,
      e.hourly_rate,
      e.active,
      -- Calcular score de relevância
      CASE 
        WHEN lower(e.name) = v_normalized_search THEN 100  -- Match exato
        WHEN lower(e.name) LIKE v_normalized_search || '%' THEN 90  -- Começa com
        WHEN lower(e.name) LIKE '%' || v_normalized_search || '%' THEN 80  -- Contém
        WHEN lower(e.code) = v_normalized_search THEN 95  -- Código exato
        -- Casos especiais para acentos comuns
        WHEN lower(replace(replace(replace(e.name, 'ã', 'a'), 'õ', 'o'), 'ç', 'c')) LIKE '%' || v_normalized_search || '%' THEN 75
        ELSE 70
      END as relevance_score,
      -- Verificar se trabalhou recentemente (últimos 30 dias)
      EXISTS (
        SELECT 1 FROM daily_labour dl 
        WHERE dl.owner_id = p_owner 
        AND dl.emp_code = e.code 
        AND dl.day >= CURRENT_DATE - INTERVAL '30 days'
        LIMIT 1
      ) as worked_recently
    FROM employees e
    WHERE e.owner_id = p_owner
      AND e.active = true
      AND (
        -- Buscar por nome
        lower(e.name) LIKE '%' || v_normalized_search || '%'
        -- OU buscar por código
        OR lower(e.code) LIKE '%' || v_normalized_search || '%'
        -- OU buscar ignorando acentos comuns (solução manual)
        OR lower(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(e.name, 'ã', 'a'), 
                    'õ', 'o'
                  ), 
                  'ç', 'c'
                ),
                'á', 'a'
              ),
              'é', 'e'
            ),
            'í', 'i'
          )
        ) LIKE '%' || v_normalized_search || '%'
      )
    ORDER BY relevance_score DESC, e.name ASC
  )
  SELECT 
    json_build_object(
      'success', true,
      'search_term', p_search_term,
      'normalized_term', v_normalized_search,
      'count', COUNT(*),
      'employees', COALESCE(
        json_agg(
          json_build_object(
            'id', id,
            'emp_code', emp_code,
            'emp_name', emp_name,
            'hourly_rate', hourly_rate,
            'active', active,
            'relevance_score', relevance_score,
            'worked_recently', worked_recently
          ) ORDER BY relevance_score DESC, emp_name ASC
        ),
        '[]'::json
      )
    ) INTO v_result
  FROM matched_employees;

  -- Se não encontrou ninguém, retornar mensagem apropriada
  SELECT (v_result->>'count')::int INTO v_count;
  
  IF v_count = 0 THEN
    -- Retornar resultado simples sem sugestões por enquanto
    v_result := json_build_object(
      'success', true,
      'search_term', p_search_term,
      'normalized_term', v_normalized_search,
      'count', 0,
      'employees', '[]'::json,
      'message', 'Nenhum funcionário encontrado com "' || p_search_term || '"'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO anon;


