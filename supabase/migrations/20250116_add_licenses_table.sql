-- Migration: Add licenses management system
-- Description: Add table and functions for managing restaurant licenses/permits

-- Criar tabela de alvarás/licenças
CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  
  -- Informações básicas
  title text NOT NULL,
  license_number text,
  issuing_authority text,
  
  -- Datas importantes
  issue_date date,
  expiry_date date NOT NULL,
  renewal_deadline date,
  
  -- Status e categorização
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal', 'renewed', 'cancelled')),
  category text CHECK (category IN ('sanitario', 'bombeiros', 'funcionamento', 'ambiental', 'outros', NULL)),
  
  -- Informações adicionais
  notes text,
  reminder_sent_at timestamptz,
  renewed_from_id uuid REFERENCES public.licenses(id),
  
  -- Metadados
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_licenses_owner_id ON public.licenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date ON public.licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);

-- RLS (Row Level Security)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Criar schema analytics_v1 se não existir
CREATE SCHEMA IF NOT EXISTS analytics_v1;

-- View analítica para status de alvarás
CREATE OR REPLACE VIEW analytics_v1.licenses_status AS
SELECT 
  l.owner_id,
  l.id,
  l.title,
  l.license_number,
  l.issuing_authority,
  l.issue_date,
  l.expiry_date,
  l.renewal_deadline,
  l.status,
  l.category,
  l.notes,
  l.created_at,
  l.updated_at,
  -- Cálculo de urgência
  CASE 
    WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN l.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN l.renewal_deadline IS NOT NULL AND l.renewal_deadline <= CURRENT_DATE + INTERVAL '15 days' THEN 'renewal_approaching'
    ELSE 'ok'
  END as urgency_status,
  -- Dias até expirar (negativo se já expirou)
  l.expiry_date - CURRENT_DATE as days_until_expiry,
  -- Dias desde a emissão
  CASE 
    WHEN l.issue_date IS NOT NULL THEN CURRENT_DATE - l.issue_date
    ELSE NULL
  END as days_since_issue
FROM public.licenses l
WHERE l.status NOT IN ('cancelled', 'renewed');

-- Função para listar status de alvarás
CREATE OR REPLACE FUNCTION public.get_licenses_status(
  p_owner uuid,
  p_include_expired boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH licenses_data AS (
    SELECT 
      id,
      title,
      license_number,
      issuing_authority,
      issue_date,
      expiry_date,
      renewal_deadline,
      status,
      category,
      notes,
      urgency_status,
      days_until_expiry
    FROM analytics_v1.licenses_status
    WHERE owner_id = p_owner
      AND (p_include_expired = true OR urgency_status != 'expired')
    ORDER BY 
      CASE urgency_status
        WHEN 'expired' THEN 1
        WHEN 'expiring_soon' THEN 2
        WHEN 'renewal_approaching' THEN 3
        ELSE 4
      END,
      expiry_date ASC
  )
  SELECT jsonb_build_object(
    'owner_id', p_owner,
    'summary', jsonb_build_object(
      'total', COUNT(*),
      'expired', COUNT(*) FILTER (WHERE urgency_status = 'expired'),
      'expiring_soon', COUNT(*) FILTER (WHERE urgency_status = 'expiring_soon'),
      'renewal_approaching', COUNT(*) FILTER (WHERE urgency_status = 'renewal_approaching'),
      'ok', COUNT(*) FILTER (WHERE urgency_status = 'ok')
    ),
    'licenses', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'license_number', license_number,
          'issuing_authority', issuing_authority,
          'issue_date', issue_date,
          'expiry_date', expiry_date,
          'renewal_deadline', renewal_deadline,
          'status', status,
          'category', category,
          'notes', notes,
          'urgency_status', urgency_status,
          'days_until_expiry', days_until_expiry
        )
      ),
      '[]'::jsonb
    )
  )
  FROM licenses_data;
$$;

-- Função para listar alvarás próximos do vencimento
CREATE OR REPLACE FUNCTION public.get_expiring_licenses(
  p_owner uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH expiring AS (
    SELECT 
      id,
      title,
      license_number,
      issuing_authority,
      expiry_date,
      renewal_deadline,
      category,
      urgency_status,
      days_until_expiry
    FROM analytics_v1.licenses_status
    WHERE owner_id = p_owner
      AND days_until_expiry >= 0
      AND days_until_expiry <= p_days_ahead
    ORDER BY expiry_date ASC
  )
  SELECT jsonb_build_object(
    'owner_id', p_owner,
    'days_ahead', p_days_ahead,
    'count', COUNT(*),
    'licenses', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'license_number', license_number,
          'issuing_authority', issuing_authority,
          'expiry_date', expiry_date,
          'renewal_deadline', renewal_deadline,
          'category', category,
          'urgency_status', urgency_status,
          'days_until_expiry', days_until_expiry
        )
      ),
      '[]'::jsonb
    )
  )
  FROM expiring;
$$;

-- Função para adicionar novo alvará
CREATE OR REPLACE FUNCTION public.add_license(
  p_owner uuid,
  p_title text,
  p_expiry_date date,
  p_license_number text DEFAULT NULL,
  p_issuing_authority text DEFAULT NULL,
  p_issue_date date DEFAULT NULL,
  p_renewal_deadline date DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_license_id uuid;
  v_result jsonb;
BEGIN
  -- Validação básica
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Título do alvará é obrigatório';
  END IF;
  
  IF p_expiry_date IS NULL THEN
    RAISE EXCEPTION 'Data de vencimento é obrigatória';
  END IF;

  -- Se não foi fornecido prazo de renovação, definir como 30 dias antes do vencimento
  IF p_renewal_deadline IS NULL THEN
    p_renewal_deadline := p_expiry_date - INTERVAL '30 days';
  END IF;

  -- Inserir o alvará
  INSERT INTO public.licenses (
    owner_id,
    title,
    license_number,
    issuing_authority,
    issue_date,
    expiry_date,
    renewal_deadline,
    category,
    notes,
    status
  ) VALUES (
    p_owner,
    trim(p_title),
    p_license_number,
    p_issuing_authority,
    p_issue_date,
    p_expiry_date,
    p_renewal_deadline,
    p_category,
    p_notes,
    CASE 
      WHEN p_expiry_date < CURRENT_DATE THEN 'expired'
      ELSE 'active'
    END
  )
  RETURNING id INTO v_license_id;

  -- Buscar o registro inserido para retornar
  SELECT jsonb_build_object(
    'id', l.id,
    'owner_id', l.owner_id,
    'title', l.title,
    'license_number', l.license_number,
    'issuing_authority', l.issuing_authority,
    'issue_date', l.issue_date,
    'expiry_date', l.expiry_date,
    'renewal_deadline', l.renewal_deadline,
    'category', l.category,
    'notes', l.notes,
    'status', l.status,
    'created_at', l.created_at,
    'days_until_expiry', l.expiry_date - CURRENT_DATE
  ) INTO v_result
  FROM public.licenses l
  WHERE l.id = v_license_id;

  RETURN v_result;
END;
$$;

-- Função para atualizar status de um alvará
CREATE OR REPLACE FUNCTION public.update_license_status(
  p_owner uuid,
  p_license_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Validar status
  IF p_status NOT IN ('active', 'expired', 'pending_renewal', 'renewed', 'cancelled') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- Atualizar o alvará
  UPDATE public.licenses
  SET 
    status = p_status,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_license_id 
    AND owner_id = p_owner;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alvará não encontrado';
  END IF;

  -- Retornar o registro atualizado
  SELECT jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'status', l.status,
    'expiry_date', l.expiry_date,
    'updated_at', l.updated_at
  ) INTO v_result
  FROM public.licenses l
  WHERE l.id = p_license_id;

  RETURN v_result;
END;
$$;

-- Função auxiliar para buscar alvará por ID
CREATE OR REPLACE FUNCTION public.get_license_by_id(
  p_owner uuid,
  p_license_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'owner_id', l.owner_id,
    'title', l.title,
    'license_number', l.license_number,
    'issuing_authority', l.issuing_authority,
    'issue_date', l.issue_date,
    'expiry_date', l.expiry_date,
    'renewal_deadline', l.renewal_deadline,
    'category', l.category,
    'notes', l.notes,
    'status', l.status,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'days_until_expiry', l.expiry_date - CURRENT_DATE
  )
  FROM public.licenses l
  WHERE l.id = p_license_id 
    AND l.owner_id = p_owner;
$$;
