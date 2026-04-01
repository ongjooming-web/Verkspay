-- Day 1: Business Units table
CREATE TABLE public.business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  currency TEXT DEFAULT 'MYR',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- RLS
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see units they're assigned to
CREATE POLICY "Users can view assigned business units"
ON public.business_units FOR SELECT
USING (
  id IN (
    SELECT DISTINCT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
  OR
  -- Org admins see all units in their org
  organization_id IN (
    SELECT organization_id FROM public.users 
    WHERE id = auth.uid() AND role = 'org_admin'
  )
);

-- Indexes
CREATE INDEX idx_business_units_organization_id ON public.business_units(organization_id);
CREATE INDEX idx_business_units_code ON public.business_units(code);

COMMENT ON TABLE public.business_units IS 'Subsidiaries (Tai Chew, Bintang Flavours) under Tria Ventures';
