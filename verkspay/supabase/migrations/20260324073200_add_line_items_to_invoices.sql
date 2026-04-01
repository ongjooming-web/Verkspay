-- Add line_items JSONB column to invoices table
-- This allows invoices to have itemized breakdowns while maintaining backward compatibility

ALTER TABLE invoices ADD COLUMN line_items JSONB DEFAULT NULL;

-- Add comment documenting the line_items structure
COMMENT ON COLUMN invoices.line_items IS 'Array of line item objects. Each item has: { "description": string, "quantity": number, "rate": number, "amount": number (quantity * rate) }. When present, sum of all line item amounts should equal the invoice amount field. Example: [{"description": "Web Design", "quantity": 1, "rate": 2500, "amount": 2500}, {"description": "Revisions", "quantity": 2, "rate": 500, "amount": 1000}]';

-- Add GIN index for efficient JSONB queries (future use)
CREATE INDEX idx_invoices_line_items_gin ON invoices USING GIN (line_items);

-- Note: RLS policies on invoices table automatically apply to the line_items column
-- No new policies are needed as line_items is part of the invoice row
