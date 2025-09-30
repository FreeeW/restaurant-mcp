-- Fixed version of the rolling CMV function
-- Uses correct column and field names from the actual database schema

CREATE OR REPLACE FUNCTION get_rolling_cmv(
    p_owner_id UUID,
    p_date DATE,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    daily_sales DECIMAL,
    daily_purchases DECIMAL,
    rolling_sales DECIMAL,
    rolling_purchases DECIMAL,
    rolling_cmv_percentage DECIMAL,
    theoretical_daily_food_cost DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT 
            p_date - INTERVAL '1 day' * (p_days - 1) AS start_date,
            p_date AS end_date
    ),
    daily_data AS (
        SELECT 
            COALESCE((fs.payload->>'date')::DATE, DATE(fs.submitted_at)) as sale_date,
            SUM(CASE 
                WHEN fs.source_form = 'vendas' 
                THEN (fs.payload->>'net_sales')::DECIMAL
                ELSE 0 
            END) as sales,
            SUM(CASE 
                WHEN fs.source_form = 'custo_alimentos' 
                THEN (fs.payload->>'food_cost')::DECIMAL
                ELSE 0 
            END) as purchases
        FROM form_submissions fs
        CROSS JOIN date_range dr
        WHERE fs.owner_id = p_owner_id
          AND COALESCE((fs.payload->>'date')::DATE, DATE(fs.submitted_at)) BETWEEN dr.start_date AND dr.end_date
          AND fs.source_form IN ('vendas', 'custo_alimentos')
        GROUP BY COALESCE((fs.payload->>'date')::DATE, DATE(fs.submitted_at))
    ),
    aggregated AS (
        SELECT 
            -- Today's data
            COALESCE(SUM(CASE WHEN sale_date = p_date THEN sales ELSE 0 END), 0) as today_sales,
            COALESCE(SUM(CASE WHEN sale_date = p_date THEN purchases ELSE 0 END), 0) as today_purchases,
            -- Rolling period data
            COALESCE(SUM(sales), 0) as period_sales,
            COALESCE(SUM(purchases), 0) as period_purchases
        FROM daily_data
    )
    SELECT 
        today_sales as daily_sales,
        today_purchases as daily_purchases,
        period_sales as rolling_sales,
        period_purchases as rolling_purchases,
        CASE 
            WHEN period_sales > 0 
            THEN ROUND((period_purchases / period_sales) * 100, 1)
            ELSE 0
        END as rolling_cmv_percentage,
        -- Theoretical food cost for today based on rolling average
        CASE 
            WHEN period_sales > 0 
            THEN ROUND(today_sales * (period_purchases / period_sales), 2)
            ELSE 0
        END as theoretical_daily_food_cost
    FROM aggregated;
END;
$$;
