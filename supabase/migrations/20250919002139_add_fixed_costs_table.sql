-- Tabela de custos fixos
CREATE TABLE fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('monthly', 'annual')),
  category TEXT,
  due_day INTEGER,
  due_month TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de compromissos (já existe como 'events' no seu banco)
-- Pode usar a tabela 'events' existente ou criar uma nova 'appointments'