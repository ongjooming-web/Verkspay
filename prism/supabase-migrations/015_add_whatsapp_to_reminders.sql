-- Add WhatsApp link column to reminders_log for easy access to pre-filled wa.me URLs
ALTER TABLE public.reminders_log 
ADD COLUMN IF NOT EXISTS whatsapp_link TEXT DEFAULT NULL;

-- Comment
COMMENT ON COLUMN public.reminders_log.whatsapp_link IS 'Pre-generated wa.me link for quick WhatsApp reminder sending. Users can click this link to open WhatsApp with pre-filled message.';
