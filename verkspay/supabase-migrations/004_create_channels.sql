-- Day 1: Channels table (POS, Shopee, Lazada, Direct, etc.)
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'POS-TaiChew', 'Shopee-BF', 'Lazada-BF', 'Direct-BF', 'WhatsApp-BF'
  code TEXT NOT NULL, -- 'taichew-pos', 'shopee', 'lazada', 'direct', 'whatsapp'
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_unit_id, code)
);

-- RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channels for their business units"
ON public.channels FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_channels_business_unit_id ON public.channels(business_unit_id);
CREATE INDEX idx_channels_code ON public.channels(code);

COMMENT ON TABLE public.channels IS 'Sales channels (POS, Shopee, Lazada, Direct, WhatsApp) per business unit';
