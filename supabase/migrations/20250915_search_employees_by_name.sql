-- Migration: Add search_employees_by_name RPC
-- Description: Allows searching employees by name (partial or complete) with fuzzy matching
-- Author: Assistant
-- Date: 2025-09-15

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create an immutable wrapper around unaccent so it can be used in index expressions
-- Using a constant dictionary makes the function effectively immutable
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT public.unaccent($1)
$$;

-- RPC para buscar funcionários por nome (parcial ou completo)
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
  -- Normalizar o termo de busca (remover acentos, lowercase, trim)
  v_normalized_search := lower(trim(extensions.unaccent(p_search_term)));
  
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
        WHEN lower(public.immutable_unaccent(e.name)) = v_normalized_search THEN 100  -- Match exato
        WHEN lower(public.immutable_unaccent(e.name)) LIKE v_normalized_search || '%' THEN 90  -- Começa com
        WHEN lower(public.immutable_unaccent(e.name)) LIKE '%' || v_normalized_search || '%' THEN 80  -- Contém
        WHEN lower(e.code) = v_normalized_search THEN 95  -- Código exato
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
        -- Buscar por nome (sem acentos)
        lower(public.immutable_unaccent(e.name)) LIKE '%' || v_normalized_search || '%'
        -- OU buscar por código
        OR lower(e.code) LIKE '%' || v_normalized_search || '%'
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
    -- Tentar sugerir funcionários com nomes similares
    WITH all_employees AS (
      SELECT 
        e.code,
        e.name,
        similarity(lower(public.immutable_unaccent(e.name)), v_normalized_search) as sim_score
      FROM employees e
      WHERE e.owner_id = p_owner
        AND e.active = true
      ORDER BY sim_score DESC
      LIMIT 3
    )
    SELECT 
      json_build_object(
        'success', true,
        'search_term', p_search_term,
        'normalized_term', v_normalized_search,
        'count', 0,
        'employees', '[]'::json,
        'suggestions', COALESCE(
          json_agg(
            json_build_object(
              'emp_code', code,
              'emp_name', name
            )
          ),
          '[]'::json
        ),
        'message', 'Nenhum funcionário encontrado com "' || p_search_term || '"'
      ) INTO v_result
    FROM all_employees
    WHERE sim_score > 0.2;  -- Apenas sugestões com alguma similaridade
    
    -- Se não há nem sugestões, retornar resultado simples
    IF v_result IS NULL THEN
      v_result := json_build_object(
        'success', true,
        'search_term', p_search_term,
        'normalized_term', v_normalized_search,
        'count', 0,
        'employees', '[]'::json,
        'message', 'Nenhum funcionário encontrado com "' || p_search_term || '"'
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

-- Criar índice para melhorar performance de busca por nome (case/acentos-insensitive)
CREATE INDEX IF NOT EXISTS idx_employees_name_unaccent 
ON employees (lower(public.immutable_unaccent(name))) 
WHERE active = true;

-- Criar índice para busca por similaridade (trigram), também normalizando
CREATE INDEX IF NOT EXISTS idx_employees_name_trgm 
ON employees 
USING gin (lower(public.immutable_unaccent(name)) gin_trgm_ops)
WHERE active = true;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION search_employees_by_name(uuid, text) TO anon;

-- Comentário na função
COMMENT ON FUNCTION search_employees_by_name(uuid, text) IS 
'Busca funcionários ativos por nome ou código (parcial ou completo), com suporte a busca sem acentos e sugestões baseadas em similaridade';

-- Teste da função (comentado para execução manual)
/*
-- Teste 1: Buscar por nome parcial
SELECT search_employees_by_name('ecb8571b-fb2c-4ff6-8799-25fe038b9aa1'::uuid, 'joão');

-- Teste 2: Buscar por código
SELECT search_employees_by_name('ecb8571b-fb2c-4ff6-8799-25fe038b9aa1'::uuid, 'GAR1');

-- Teste 3: Buscar sem acentos
SELECT search_employees_by_name('ecb8571b-fb2c-4ff6-8799-25fe038b9aa1'::uuid, 'joao');

-- Teste 4: Buscar nome inexistente
SELECT search_employees_by_name('ecb8571b-fb2c-4ff6-8799-25fe038b9aa1'::uuid, 'xyz');
*/
