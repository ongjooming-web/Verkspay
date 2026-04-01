-- Day 1: Customers table (contacts for both Tai Chew and Bintang)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  -- Bintang Flavours specific fields
  price_tier TEXT, -- 'distributor', 'wholesaler', 'horeca', 'ecommerce' (NULL for Tai Chew)
  credit_term TEXT, -- 'net_30', 'net_60', 'net_90', 'cod' (NULL for Tai Chew - always cash)
  credit_limit NUMERIC, -- Max credit for B2B (Bintang)
  outstanding_balance NUMERIC DEFAULT 0,
  -- General
  type TEXT, -- 'b2b', 'b2c', 'supplier'
  status TEXT DEFAULT 'active', -- 'prospect', 'active', 'inactive', 'churned'
  tags JSONB, -- Array of tags
  notes TEXT,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers for their business units"
ON public.customers FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_customers_business_unit_id ON public.customers(business_unit_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_price_tier ON public.customers(price_tier);
CREATE INDEX idx_customers_status ON public.customers(status);

COMMENT ON TABLE public.customers IS 'B2B customers (Bintang wholesalers/distributors) and retail customers (Tai Chew)';
