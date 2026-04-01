-- Day 1: Inventory movements table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES public.skus(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'damage'
  quantity INT NOT NULL,
  reference TEXT, -- Order ID, PO number, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory for their business units"
ON public.inventory FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_inventory_business_unit_id ON public.inventory(business_unit_id);
CREATE INDEX idx_inventory_sku_id ON public.inventory(sku_id);
CREATE INDEX idx_inventory_movement_type ON public.inventory(movement_type);
CREATE INDEX idx_inventory_created_at ON public.inventory(created_at);

COMMENT ON TABLE public.inventory IS 'Stock movements (purchases, sales, adjustments, damage)';
