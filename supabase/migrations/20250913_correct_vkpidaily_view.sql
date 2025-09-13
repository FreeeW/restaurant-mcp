-- Migration: fix_v_kpi_daily_multiple_entries
-- Propósito: Corrigir view para somar múltiplas entradas do mesmo dia

CREATE OR REPLACE VIEW public.v_kpi_daily AS
WITH base AS (
    -- Coleta todos os registros relevantes
    SELECT 
        fs.owner_id,
        COALESCE((fs.payload->>'date')::date, fs.submitted_at::date) AS day,
        fs.source_form,
        fs.payload,
        fs.submitted_at
    FROM form_submissions fs
    WHERE fs.source_form IN ('vendas', 'custo_alimentos', 'mao_de_obra')
),
-- Para vendas: pegar o último registro do dia (não deve ter múltiplos)
vendas_latest AS (
    SELECT DISTINCT ON (owner_id, day)
        owner_id,
        day,
        (payload->>'net_sales')::numeric as net_sales
    FROM base
    WHERE source_form = 'vendas'
    ORDER BY owner_id, day, submitted_at DESC
),
-- Para custos de alimentos: SOMAR todos os registros do dia
food_sum AS (
    SELECT 
        owner_id,
        day,
        SUM((payload->>'food_cost')::numeric) as food_cost
    FROM base
    WHERE source_form = 'custo_alimentos'
    GROUP BY owner_id, day
),
-- Para mão de obra: SOMAR todos os registros do dia
labour_sum AS (
    SELECT 
        owner_id,
        day,
        SUM((payload->>'labour_cost')::numeric) as labour_cost
    FROM base
    WHERE source_form = 'mao_de_obra'
    GROUP BY owner_id, day
),
-- Combinar todas as métricas
combined AS (
    SELECT 
        COALESCE(v.owner_id, f.owner_id, l.owner_id) as owner_id,
        COALESCE(v.day, f.day, l.day) as day,
        v.net_sales,
        f.food_cost,
        l.labour_cost
    FROM vendas_latest v
    FULL OUTER JOIN food_sum f ON v.owner_id = f.owner_id AND v.day = f.day
    FULL OUTER JOIN labour_sum l ON COALESCE(v.owner_id, f.owner_id) = l.owner_id 
                                 AND COALESCE(v.day, f.day) = l.day
)
-- Resultado final com cálculo de percentuais
SELECT 
    owner_id,
    day,
    COALESCE(net_sales, 0) as net_sales,
    COALESCE(food_cost, 0) as food_cost,
    COALESCE(labour_cost, 0) as labour_cost,
    CASE 
        WHEN COALESCE(net_sales, 0) > 0 
        THEN ROUND((COALESCE(food_cost, 0) / net_sales * 100)::numeric, 2)
        ELSE NULL::numeric
    END as food_pct,
    CASE 
        WHEN COALESCE(net_sales, 0) > 0 
        THEN ROUND((COALESCE(labour_cost, 0) / net_sales * 100)::numeric, 2)
        ELSE NULL::numeric
    END as labour_pct
FROM combined
WHERE owner_id IS NOT NULL AND day IS NOT NULL
ORDER BY owner_id, day;

-- Comentário explicativo da mudança
COMMENT ON VIEW public.v_kpi_daily IS 
'View corrigida para suportar múltiplas entradas por dia. 
Vendas: pega último registro do dia (caso haja correção). 
Food/Labour: SOMA todos os registros do dia (suporta múltiplos pedidos e múltiplos funcionários).';