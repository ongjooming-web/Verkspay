-- Day 1: Seed organizations, business units, channels, and sample SKUs

-- ORGANIZATION: Tria Ventures
INSERT INTO public.organizations (name, headquarters_address)
VALUES ('Tria Ventures', 'Kuala Lumpur, Malaysia')
ON CONFLICT DO NOTHING;

-- Get organization ID
WITH org AS (
  SELECT id FROM public.organizations WHERE name = 'Tria Ventures' LIMIT 1
)

-- BUSINESS UNITS
INSERT INTO public.business_units (organization_id, name, code, currency, status)
SELECT org.id, 'Tai Chew Hardware & Timber', 'TC', 'MYR', 'active' FROM org
ON CONFLICT DO NOTHING;

INSERT INTO public.business_units (organization_id, name, code, currency, status)
SELECT org.id, 'Bintang Flavours', 'BF', 'MYR', 'active' FROM org
ON CONFLICT DO NOTHING;

-- CHANNELS: Tai Chew
INSERT INTO public.channels (business_unit_id, name, code, description, status)
SELECT bu.id, 'Tai Chew POS', 'taichew-pos', 'Point of Sale System', 'active'
FROM public.business_units bu
WHERE bu.code = 'TC'
ON CONFLICT DO NOTHING;

-- CHANNELS: Bintang Flavours
INSERT INTO public.channels (business_unit_id, name, code, description, status)
SELECT bu.id, 'Shopee', 'shopee', 'Shopee Marketplace', 'active'
FROM public.business_units bu
WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

INSERT INTO public.channels (business_unit_id, name, code, description, status)
SELECT bu.id, 'Lazada', 'lazada', 'Lazada Marketplace', 'active'
FROM public.business_units bu
WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

INSERT INTO public.channels (business_unit_id, name, code, description, status)
SELECT bu.id, 'Direct Sales', 'direct', 'Direct B2B Orders', 'active'
FROM public.business_units bu
WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

INSERT INTO public.channels (business_unit_id, name, code, description, status)
SELECT bu.id, 'WhatsApp', 'whatsapp', 'WhatsApp Business Orders', 'active'
FROM public.business_units bu
WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

-- SAMPLE SKUs: Tai Chew Hardware
INSERT INTO public.skus (business_unit_id, sku_code, name, category, cost_price, sale_price, unit, reorder_level)
SELECT bu.id, 'TC-HW-001', 'Wood Plank (2x4)', 'timber', 25.00, 45.00, 'meter', 50
FROM public.business_units bu WHERE bu.code = 'TC'
ON CONFLICT DO NOTHING;

INSERT INTO public.skus (business_unit_id, sku_code, name, category, cost_price, sale_price, unit, reorder_level)
SELECT bu.id, 'TC-TOOL-001', 'Hammer 16oz', 'tools', 15.00, 28.00, 'piece', 20
FROM public.business_units bu WHERE bu.code = 'TC'
ON CONFLICT DO NOTHING;

-- SAMPLE SKUs: Bintang Flavours
INSERT INTO public.skus (business_unit_id, sku_code, name, category, cost_price, distributor_price, wholesaler_price, horeca_price, ecommerce_price, unit, reorder_level)
SELECT bu.id, 'BF-CURRY-001', 'Curry Powder Blend 500g', 'spice_blend', 8.00, 15.00, 18.00, 22.00, 25.00, 'box', 100
FROM public.business_units bu WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

INSERT INTO public.skus (business_unit_id, sku_code, name, category, cost_price, distributor_price, wholesaler_price, horeca_price, ecommerce_price, unit, reorder_level)
SELECT bu.id, 'BF-SAUCE-001', 'Chili Sauce 1L', 'sauce', 5.00, 9.00, 11.00, 13.00, 15.00, 'bottle', 200
FROM public.business_units bu WHERE bu.code = 'BF'
ON CONFLICT DO NOTHING;

COMMIT;
