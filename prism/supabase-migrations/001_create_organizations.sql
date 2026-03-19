-- Day 1: Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  headquarters_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy: All users in org can see org
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT DISTINCT organization_id FROM public.users 
    WHERE auth.uid() = id
  )
);

-- Index
CREATE INDEX idx_organizations_name ON public.organizations(name);

COMMENT ON TABLE public.organizations IS 'Holding company (Tria Ventures) - parent entity for business units';
