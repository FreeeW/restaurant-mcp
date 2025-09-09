CREATE TABLE IF NOT EXISTS public.owner_tokens (
  token TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.owner_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_tokens_service_role_all 
ON public.owner_tokens 
FOR ALL TO service_role 
USING (true);

-- Add index for performance
CREATE INDEX idx_owner_tokens_active ON public.owner_tokens(token) WHERE active = true;
CREATE INDEX idx_owner_tokens_owner ON public.owner_tokens(owner_id);

-- Create form_config table to store form IDs
CREATE TABLE IF NOT EXISTS public.form_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT UNIQUE NOT NULL,
  form_id TEXT NOT NULL,
  token_entry_id TEXT NOT NULL,
  form_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE public.form_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY form_config_service_role_all 
ON public.form_config 
FOR ALL TO service_role 
USING (true);

-- Insert the vendas form configuration
INSERT INTO public.form_config (form_type, form_id, token_entry_id, form_url) VALUES
('vendas', '1FAIpQLSfKyhf5FRUsO2CrVigiwgJyxu9YJnIs5Q6dKYSATmNY6CWE6w', 'entry.1118057237', 'https://docs.google.com/forms/d/e/1FAIpQLSfKyhf5FRUsO2CrVigiwgJyxu9YJnIs5Q6dKYSATmNY6CWE6w/viewform')
ON CONFLICT (form_type) DO UPDATE SET
  form_id = EXCLUDED.form_id,
  token_entry_id = EXCLUDED.token_entry_id,
  form_url = EXCLUDED.form_url,
  updated_at = now();

-- Add business info columns to owners if not exists
ALTER TABLE public.owners 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"timezone":"America/Sao_Paulo","language":"pt-BR"}'::jsonb,
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';