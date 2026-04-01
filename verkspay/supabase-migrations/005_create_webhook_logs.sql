-- Day 1: Webhook logs (audit trail - log EVERYTHING raw)
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  source TEXT NOT NULL, -- 'taichew-pos', 'shopee', 'lazada', 'direct', 'whatsapp'
  event_type TEXT, -- 'order.created', 'order.updated', etc.
  raw_payload JSONB NOT NULL, -- Store ENTIRE raw payload - never lose data
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT, -- If processing failed
  status TEXT DEFAULT 'received', -- 'received', 'processed', 'failed', 'duplicate'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhook logs for their business units"
ON public.webhook_logs FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM public.users_business_units 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_webhook_logs_business_unit_id ON public.webhook_logs(business_unit_id);
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

COMMENT ON TABLE public.webhook_logs IS 'Raw webhook audit trail - log every incoming payload before processing';
