-- Day 1: SKUs (products) table with tiered pricing
CREATE TABLE public.skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- 'hardware', 'timber', 'tools' (Tai Chew) or 'spice_blend', 'sauce' (Bintang)
  cost_price NUMERIC NOT NULL,
  -- Tai Chew: single price
  sale_price NUMERIC,
  -- Bintang Flavours: tiered pricing
  distributor_price NUMERIC,
  wholesaler_price NUMERIC,
  horeca_price NUMERIC,
  ecommerce_price NUMERIC,
  -- Inventory
  unit TEXT NOT NULL, -- 'box', 'kg', 'meter', 'liter', 'batch', 'pack'
  current_stock INT DEFAULT 0,
  reorder_level INT DEFAULT 0,
  -- Supplier
  supplier_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_unit_id, sku_code)
);

-- RLS
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SKUs for their business units"
ON public.skus FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_skus_business_unit_id ON public.skus(business_unit_id);
CREATE INDEX idx_skus_sku_code ON public.skus(sku_code);
CREATE INDEX idx_skus_category ON public.skus(category);
CREATE INDEX idx_skus_status ON public.skus(status);

COMMENT ON TABLE public.skus IS 'Products: Tai Chew hardware/timber items or Bintang Flavours spice blends/sauces';
