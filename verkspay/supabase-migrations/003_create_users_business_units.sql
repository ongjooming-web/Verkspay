-- Day 1: User-Business Unit assignment table
CREATE TABLE public.users_business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'org_admin', 'unit_admin', 'unit_staff'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, business_unit_id)
);

-- RLS
ALTER TABLE public.users_business_units ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own assignments
CREATE POLICY "Users can view their business unit assignments"
ON public.users_business_units FOR SELECT
USING (user_id = auth.uid());

-- Policy: Org admins can view all assignments
CREATE POLICY "Org admins can view all assignments"
ON public.users_business_units FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE role = 'org_admin'
  )
);

-- Indexes
CREATE INDEX idx_users_business_units_user_id ON public.users_business_units(user_id);
CREATE INDEX idx_users_business_units_business_unit_id ON public.users_business_units(business_unit_id);

COMMENT ON TABLE public.users_business_units IS 'Maps users to business units they have access to';
