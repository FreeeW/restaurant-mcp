-- Add manager phone and closing time to owners table
ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS manager_phone_e164 TEXT,
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '21:30:00',
ADD COLUMN IF NOT EXISTS closing_reminder_enabled BOOLEAN DEFAULT false;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_owners_closing_reminder 
ON public.owners(closing_reminder_enabled, closing_time) 
WHERE closing_reminder_enabled = true;

-- Add manager_phone to form_submissions to track who submitted
ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS submitted_by_phone TEXT;

-- Create a table to track pending sales inputs
CREATE TABLE IF NOT EXISTS public.pending_sales_input (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  manager_phone TEXT NOT NULL,
  reminder_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_received_at TIMESTAMPTZ,
  sales_amount DECIMAL(10,2),
  tips_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, completed, expired
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE public.pending_sales_input ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_sales_service_role_all 
ON public.pending_sales_input 
FOR ALL TO service_role 
USING (true);

-- Index for finding pending responses
CREATE INDEX idx_pending_sales_status 
ON public.pending_sales_input(manager_phone, status) 
WHERE status = 'pending';
