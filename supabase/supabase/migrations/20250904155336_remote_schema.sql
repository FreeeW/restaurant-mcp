

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics_v1";


ALTER SCHEMA "analytics_v1" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text" DEFAULT NULL::"text", "p_time" time without time zone DEFAULT NULL::time without time zone, "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
begin
  insert into public.events (owner_id, title, kind, date, "time", notes)
  values (p_owner, p_title, p_kind, p_date, p_time, p_notes)
  returning id into v_id;

  return jsonb_build_object(
    'id',    v_id,
    'owner', p_owner,
    'date',  p_date,
    'title', p_title,
    'kind',  p_kind,
    'time',  p_time,
    'notes', p_notes
  );
end;
$$;


ALTER FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text", "p_time" time without time zone, "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text", "p_time" time without time zone, "p_notes" "text") IS 'Cria um evento/lembrete para um owner. Retorna JSON com resumo.';



CREATE OR REPLACE FUNCTION "public"."get_daily_kpi"("p_owner" "uuid", "p_day" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    jsonb_build_object(
      'day', p_day,
      'net_sales', v.net_sales,
      'food_pct',  (v.food_pct/100.0),
      'labour_pct',(v.labour_pct/100.0)
    ),
    jsonb_build_object('day', p_day, 'net_sales', 0, 'food_pct', null, 'labour_pct', null)
  )
  from public.v_kpi_daily v
  where v.owner_id = p_owner and v.day = p_day;
$$;


ALTER FUNCTION "public"."get_daily_kpi"("p_owner" "uuid", "p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_kpi_on_date"("p_owner" "uuid", "p_day" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    jsonb_build_object(
      'day', p_day,
      'net_sales', v.net_sales,
      'food_cost', v.food_cost,
      'labour_cost', v.labour_cost,
      'food_pct', (v.food_pct/100.0),
      'labour_pct', (v.labour_pct/100.0)
    ),
    jsonb_build_object(
      'day', p_day,
      'net_sales', 0,
      'food_cost', null,
      'labour_cost', null,
      'food_pct', null,
      'labour_pct', null
    )
  )
  from public.v_kpi_daily v
  where v.owner_id = p_owner
    and v.day = p_day;
$$;


ALTER FUNCTION "public"."get_daily_kpi_on_date"("p_owner" "uuid", "p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_pay"("p_owner" "uuid", "p_emp_code" "text", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  with s as (
    select day, emp_code, hours, hourly_rate
    from analytics_v1.shifts_daily
    where owner_id = p_owner
      and emp_code = p_emp_code
      and day between p_start and p_end
  )
  select jsonb_build_object(
    'emp_code', p_emp_code,
    'start', p_start, 'end', p_end,
    'days', coalesce(
      jsonb_agg(jsonb_build_object('day', day, 'hours', hours, 'rate', hourly_rate) order by day),
      '[]'::jsonb
    ),
    'total_hours', coalesce(sum(hours),0),
    'total_pay', coalesce(sum(hours*hourly_rate),0)
  ) from s;
$$;


ALTER FUNCTION "public"."get_employee_pay"("p_owner" "uuid", "p_emp_code" "text", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics_v1'
    AS $$
  with src as (
    select id, date, "time", title, kind, notes
    from analytics_v1.events_daily
    where owner_id = p_owner
      and date between p_start and p_end
    order by date asc, "time" asc nulls last, created_at asc
  )
  select jsonb_build_object(
    'start', p_start,
    'end',   p_end,
    'events', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',    id,
          'date',  date,
          'time',  "time",
          'title', title,
          'kind',  kind,
          'notes', notes
        )
      ), '[]'::jsonb
    )
  )
  from src;
$$;


ALTER FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") IS 'Retorna JSON com eventos do owner em um intervalo (ordenado por data/hora), baseado em analytics_v1.events_daily.';



CREATE OR REPLACE FUNCTION "public"."get_notes_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  with n as (
    select day, source, text, emp_code, emp_name
    from analytics_v1.notes_daily
    where owner_id = p_owner
      and day between p_start and p_end
  )
  select jsonb_build_object(
    'start', p_start,
    'end',   p_end,
    'notes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day',      day,
          'source',   source,
          'text',     text,
          'emp_code', emp_code,
          'emp_name', emp_name
        )
        order by day desc, emp_name nulls last
      ) from n
    ), '[]'::jsonb)
  );
$$;


ALTER FUNCTION "public"."get_notes_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  with o as (
    select * from analytics_v1.orders_daily
    where owner_id = p_owner and day between p_start and p_end
  )
  select jsonb_build_object(
    'start', p_start, 'end', p_end,
    'total_amount', coalesce(sum(amount),0),
    'orders', coalesce(
      jsonb_agg(jsonb_build_object(
        'day', day,
        'supplier', supplier,
        'invoice_number', invoice_number,
        'amount', amount
      ) order by day desc),
      '[]'::jsonb
    )
  ) from o;
$$;


ALTER FUNCTION "public"."get_orders_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_period_kpis"("p_owner" "uuid", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  with src as (
    select * from public.v_kpi_daily
    where owner_id = p_owner and day between p_start and p_end
  )
  select jsonb_build_object(
    'start', p_start, 'end', p_end,
    'net_sales',  coalesce(sum(src.net_sales),0),
    'food_pct',   round((sum(src.food_cost)/nullif(sum(src.net_sales),0))::numeric,4),
    'labour_pct', round((sum(src.labour_cost)/nullif(sum(src.net_sales),0))::numeric,4)
  ) from src;
$$;


ALTER FUNCTION "public"."get_period_kpis"("p_owner" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_conversation"("p_owner" "uuid", "p_from_e164" "text", "p_limit" integer DEFAULT 10) RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  with convo as (
    select direction, message, created_at
      from bot_logs
     where owner_id = p_owner
       and from_e164 = p_from_e164
     order by created_at desc
     limit p_limit
  )
  -- reverse to chronological for model input (oldest -> newest)
  select json_agg(row_to_json(t) order by created_at asc)
  from (
    select direction, message, created_at
    from convo
  ) t;
$$;


ALTER FUNCTION "public"."get_recent_conversation"("p_owner" "uuid", "p_from_e164" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shifts_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
with base as (
  select owner_id, day, emp_code, emp_name, hours
  from analytics_v1.shifts_daily_enriched
  where owner_id = p_owner
    and day between p_start and p_end
),
per_emp as (
  select emp_code, emp_name, sum(hours) as hours_sum
  from base
  group by emp_code, emp_name
),
per_emp_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'emp_code', emp_code,
        'emp_name', emp_name,
        'hours',    hours_sum
      )
      order by emp_name nulls last, emp_code
    ),
    '[]'::jsonb
  ) as arr
  from per_emp
),
tot as (
  select coalesce(sum(hours), 0) as total_hours from base
)
select jsonb_build_object(
  'start',       p_start,
  'end',         p_end,
  'total_hours', (select total_hours from tot),
  'by_emp',      (select arr from per_emp_json)
);
$$;


ALTER FUNCTION "public"."get_shifts_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_start    date   := coalesce((p_args->>'start')::date, current_date - 7);
  v_end      date   := coalesce((p_args->>'end')::date,   current_date);
  v_limit    int    := greatest(1, least(coalesce((p_args->>'limit')::int, 10), 100));
  v_emp_code text   := nullif(trim(coalesce(p_args->>'emp_code','')), '');
begin
  if v_start > v_end then
    raise exception 'invalid range: start > end';
  end if;
  if v_end - v_start > 120 then
    raise exception 'range too large (max 120 days)';
  end if;

  case p_template

  when 'kpi_daily_range' then
    return (
      select jsonb_build_object(
        'start', v_start, 'end', v_end,
        'days', coalesce(
          jsonb_agg(jsonb_build_object(
            'day', day,
            'net_sales', net_sales,
            'food_pct',  (food_pct/100.0),
            'labour_pct',(labour_pct/100.0)
          ) order by day), '[]'::jsonb)
      )
      from (
        select *
        from analytics_v1.kpi_daily
        where owner_id = p_owner and day between v_start and v_end
        order by day
        limit v_limit
      ) d
    );

  when 'orders_last_n' then
    return (
      select jsonb_build_object(
        'count', coalesce(count(*),0),
        'orders', coalesce(
          jsonb_agg(jsonb_build_object(
            'day', day,
            'supplier', supplier,
            'invoice_number', invoice_number,
            'amount', amount
          ) order by day desc), '[]'::jsonb)
      )
      from (
        select *
        from analytics_v1.orders_daily
        where owner_id = p_owner and day between v_start and v_end
        order by day desc
        limit v_limit
      ) o
    );

  when 'orders_by_supplier' then
    return (
      select jsonb_build_object(
        'start', v_start, 'end', v_end,
        'by_supplier', coalesce(
          jsonb_agg(jsonb_build_object('supplier', supplier, 'total', total) order by total desc),
          '[]'::jsonb
        )
      )
      from (
        select supplier, sum(amount) as total
        from analytics_v1.orders_daily
        where owner_id = p_owner and day between v_start and v_end
        group by supplier
        order by total desc
        limit v_limit
      ) s
    );

  when 'shifts_by_emp' then
    return (
      select jsonb_build_object(
        'start', v_start, 'end', v_end,
        'by_emp', coalesce(
          jsonb_agg(jsonb_build_object('emp_code', emp_code, 'hours', hours) order by emp_code),
          '[]'::jsonb
        )
      )
      from (
        select emp_code, sum(hours)::float as hours
        from analytics_v1.shifts_daily
        where owner_id = p_owner and day between v_start and v_end
        group by emp_code
        order by emp_code
        limit v_limit
      ) t
    );

  when 'shifts_daily_for_emp' then
    if v_emp_code is null then
      raise exception 'emp_code required';
    end if;
    return (
      select jsonb_build_object(
        'emp_code', v_emp_code,
        'start', v_start, 'end', v_end,
        'days', coalesce(
          jsonb_agg(jsonb_build_object('day', day, 'hours', hours, 'rate', hourly_rate) order by day),
          '[]'::jsonb
        ),
        'total_hours', coalesce(sum(hours),0)
      )
      from analytics_v1.shifts_daily
      where owner_id = p_owner
        and emp_code = v_emp_code
        and day between v_start and v_end
    );

  else
    raise exception 'unknown template: %', p_template;
  end case;
end;
$$;


ALTER FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "kind" "text",
    "date" "date" NOT NULL,
    "time" time without time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reminder_sent_at" timestamp with time zone
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Eventos / lembretes por dono (owner_id).';



COMMENT ON COLUMN "public"."events"."kind" IS 'Categoria opcional do evento.';



COMMENT ON COLUMN "public"."events"."time" IS 'Horário opcional do evento.';



CREATE OR REPLACE VIEW "analytics_v1"."events_daily" AS
 SELECT "owner_id",
    "id",
    "date",
    "time",
    "title",
    "kind",
    "notes",
    "created_at"
   FROM "public"."events" "e";


ALTER VIEW "analytics_v1"."events_daily" OWNER TO "postgres";


COMMENT ON VIEW "analytics_v1"."events_daily" IS 'Eventos/lembretes diários normalizados para GPT (preserva RLS).';



CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "source_form" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "source_sheet" "text",
    "source_row" integer,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_kpi_daily" AS
 WITH "base" AS (
         SELECT "fs"."owner_id",
            COALESCE((("fs"."payload" ->> 'date'::"text"))::"date", ("fs"."submitted_at")::"date") AS "day",
            "fs"."source_form",
            "fs"."payload",
            "fs"."submitted_at"
           FROM "public"."form_submissions" "fs"
          WHERE ("fs"."source_form" = ANY (ARRAY['vendas'::"text", 'custo_alimentos'::"text", 'mao_de_obra'::"text", 'cadastro_funcionario'::"text"]))
        ), "latest_per_form" AS (
         SELECT DISTINCT ON ("base"."owner_id", "base"."day", "base"."source_form") "base"."owner_id",
            "base"."day",
            "base"."source_form",
            "base"."payload",
            "base"."submitted_at"
           FROM "base"
          ORDER BY "base"."owner_id", "base"."day", "base"."source_form", "base"."submitted_at" DESC
        ), "pivoted" AS (
         SELECT "latest_per_form"."owner_id",
            "latest_per_form"."day",
                CASE
                    WHEN ("latest_per_form"."source_form" = 'vendas'::"text") THEN (("latest_per_form"."payload" ->> 'net_sales'::"text"))::numeric
                    ELSE NULL::numeric
                END AS "net_sales",
                CASE
                    WHEN ("latest_per_form"."source_form" = 'custo_alimentos'::"text") THEN (("latest_per_form"."payload" ->> 'food_cost'::"text"))::numeric
                    ELSE NULL::numeric
                END AS "food_cost",
                CASE
                    WHEN ("latest_per_form"."source_form" = 'mao_de_obra'::"text") THEN (("latest_per_form"."payload" ->> 'labour_cost'::"text"))::numeric
                    ELSE NULL::numeric
                END AS "labour_cost"
           FROM "latest_per_form"
        )
 SELECT "owner_id",
    "day",
    "max"("net_sales") AS "net_sales",
    "max"("food_cost") AS "food_cost",
    "max"("labour_cost") AS "labour_cost",
        CASE
            WHEN ("max"("net_sales") > (0)::numeric) THEN "round"((("max"("food_cost") / "max"("net_sales")) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "food_pct",
        CASE
            WHEN ("max"("net_sales") > (0)::numeric) THEN "round"((("max"("labour_cost") / "max"("net_sales")) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "labour_pct"
   FROM "pivoted"
  GROUP BY "owner_id", "day"
  ORDER BY "owner_id", "day";


ALTER VIEW "public"."v_kpi_daily" OWNER TO "postgres";


CREATE OR REPLACE VIEW "analytics_v1"."kpi_daily" AS
 SELECT "owner_id",
    "day",
    "net_sales",
    "food_cost",
    "labour_cost",
    "food_pct",
    "labour_pct"
   FROM "public"."v_kpi_daily";


ALTER VIEW "analytics_v1"."kpi_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text",
    "hourly_rate" numeric NOT NULL,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE OR REPLACE VIEW "analytics_v1"."notes_daily" AS
 SELECT "fs"."owner_id",
    COALESCE((("fs"."payload" ->> 'date'::"text"))::"date", ("fs"."submitted_at")::"date") AS "day",
    "fs"."source_form" AS "source",
    NULLIF(TRIM(BOTH FROM ("fs"."payload" ->> 'notes'::"text")), ''::"text") AS "text",
    NULLIF(TRIM(BOTH FROM ("fs"."payload" ->> 'code'::"text")), ''::"text") AS "emp_code",
    "e"."name" AS "emp_name",
    "fs"."submitted_at"
   FROM ("public"."form_submissions" "fs"
     LEFT JOIN "public"."employees" "e" ON ((("e"."owner_id" = "fs"."owner_id") AND ("upper"(TRIM(BOTH FROM "e"."code")) = "upper"(TRIM(BOTH FROM ("fs"."payload" ->> 'code'::"text")))))))
  WHERE (NULLIF(TRIM(BOTH FROM ("fs"."payload" ->> 'notes'::"text")), ''::"text") IS NOT NULL);


ALTER VIEW "analytics_v1"."notes_daily" OWNER TO "postgres";


CREATE OR REPLACE VIEW "analytics_v1"."orders_daily" AS
 SELECT "owner_id",
    COALESCE((("payload" ->> 'date'::"text"))::"date", ("submitted_at")::"date") AS "day",
    ("payload" ->> 'supplier'::"text") AS "supplier",
    ("payload" ->> 'invoice_number'::"text") AS "invoice_number",
    (COALESCE((("payload" ->> 'food_cost'::"text"))::numeric, (0)::numeric))::double precision AS "amount"
   FROM "public"."form_submissions" "fs"
  WHERE ("source_form" = 'custo_alimentos'::"text");


ALTER VIEW "analytics_v1"."orders_daily" OWNER TO "postgres";


CREATE OR REPLACE VIEW "analytics_v1"."shifts_daily" AS
 SELECT "owner_id",
    COALESCE((("payload" ->> 'date'::"text"))::"date", ("submitted_at")::"date") AS "day",
    ("payload" ->> 'code'::"text") AS "emp_code",
    (COALESCE((("payload" ->> 'hours'::"text"))::numeric, (0)::numeric))::double precision AS "hours",
    (COALESCE((("payload" ->> 'hourly_rate'::"text"))::numeric, (0)::numeric))::double precision AS "hourly_rate"
   FROM "public"."form_submissions" "fs"
  WHERE ("source_form" = 'mao_de_obra'::"text");


ALTER VIEW "analytics_v1"."shifts_daily" OWNER TO "postgres";


CREATE OR REPLACE VIEW "analytics_v1"."shifts_daily_enriched" AS
 SELECT "s"."owner_id",
    "s"."day",
    "s"."emp_code",
    "e"."name" AS "emp_name",
    "s"."hours"
   FROM ("analytics_v1"."shifts_daily" "s"
     LEFT JOIN "public"."employees" "e" ON ((("e"."owner_id" = "s"."owner_id") AND ("e"."code" = "s"."emp_code"))));


ALTER VIEW "analytics_v1"."shifts_daily_enriched" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bot_logs" (
    "id" bigint NOT NULL,
    "owner_id" "uuid",
    "from_e164" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "message" "text",
    "intent" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "wa_message_id" "text",
    CONSTRAINT "bot_logs_direction_check" CHECK (("direction" = ANY (ARRAY['in'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."bot_logs" OWNER TO "postgres";


ALTER TABLE "public"."bot_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bot_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."delivery_logs" (
    "id" bigint NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "channel" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "to_e164" "text" NOT NULL,
    "template_name" "text",
    "payload" "jsonb",
    "wa_status" "text",
    "wa_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_logs" OWNER TO "postgres";


ALTER TABLE "public"."delivery_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."delivery_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."owners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_e164" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "tz" "text" DEFAULT 'America/Sao_Paulo'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."owners" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bot_logs"
    ADD CONSTRAINT "bot_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_logs"
    ADD CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_owner_id_code_key" UNIQUE ("owner_id", "code");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_source_sheet_source_row_key" UNIQUE ("source_sheet", "source_row");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_phone_e164_key" UNIQUE ("phone_e164");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_pkey" PRIMARY KEY ("id");



CREATE INDEX "bot_logs_from_idx" ON "public"."bot_logs" USING "btree" ("from_e164", "created_at" DESC);



CREATE UNIQUE INDEX "bot_logs_msg_unique" ON "public"."bot_logs" USING "btree" ("wa_message_id") WHERE ("wa_message_id" IS NOT NULL);



CREATE INDEX "bot_logs_owner_from_idx" ON "public"."bot_logs" USING "btree" ("owner_id", "from_e164", "created_at" DESC);



CREATE INDEX "bot_logs_owner_idx" ON "public"."bot_logs" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "delivery_logs_owner_day_idx" ON "public"."delivery_logs" USING "btree" ("owner_id", "day");



CREATE INDEX "events_date_idx" ON "public"."events" USING "btree" ("date");



CREATE INDEX "events_owner_date_idx" ON "public"."events" USING "btree" ("owner_id", "date");



CREATE INDEX "idx_form_submissions_owner_time" ON "public"."form_submissions" USING "btree" ("owner_id", "submitted_at" DESC);



ALTER TABLE ONLY "public"."bot_logs"
    ADD CONSTRAINT "bot_logs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_logs"
    ADD CONSTRAINT "delivery_logs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;



ALTER TABLE "public"."bot_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_service_role_all" ON "public"."events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "analytics_v1" TO "service_role";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text", "p_time" time without time zone, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text", "p_time" time without time zone, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_event"("p_owner" "uuid", "p_date" "date", "p_title" "text", "p_kind" "text", "p_time" time without time zone, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_kpi"("p_owner" "uuid", "p_day" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_kpi"("p_owner" "uuid", "p_day" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_kpi"("p_owner" "uuid", "p_day" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_kpi_on_date"("p_owner" "uuid", "p_day" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_kpi_on_date"("p_owner" "uuid", "p_day" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_kpi_on_date"("p_owner" "uuid", "p_day" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_pay"("p_owner" "uuid", "p_emp_code" "text", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_pay"("p_owner" "uuid", "p_emp_code" "text", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_pay"("p_owner" "uuid", "p_emp_code" "text", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_events_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_notes_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_notes_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_notes_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_period_kpis"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_period_kpis"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_period_kpis"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_conversation"("p_owner" "uuid", "p_from_e164" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_conversation"("p_owner" "uuid", "p_from_e164" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_conversation"("p_owner" "uuid", "p_from_e164" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shifts_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_shifts_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shifts_range"("p_owner" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_analytics"("p_owner" "uuid", "p_template" "text", "p_args" "jsonb") TO "service_role";












GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."events_daily" TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."v_kpi_daily" TO "anon";
GRANT ALL ON TABLE "public"."v_kpi_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."v_kpi_daily" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."kpi_daily" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."notes_daily" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."orders_daily" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."shifts_daily" TO "service_role";



GRANT SELECT ON TABLE "analytics_v1"."shifts_daily_enriched" TO "service_role";















GRANT ALL ON TABLE "public"."bot_logs" TO "anon";
GRANT ALL ON TABLE "public"."bot_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bot_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bot_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bot_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."delivery_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."delivery_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."delivery_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."owners" TO "anon";
GRANT ALL ON TABLE "public"."owners" TO "authenticated";
GRANT ALL ON TABLE "public"."owners" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics_v1" GRANT SELECT ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
