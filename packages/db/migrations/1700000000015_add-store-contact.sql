-- §15 Store contact channels — WhatsApp and SMS numbers for the "Ask Us" feature.
-- Both are optional. When null, the button is hidden on the tap page.
-- Stored as E.164 digits (e.g. "14155551234") without + prefix for wa.me URLs;
-- the application layer adds formatting as needed for sms: links.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS whatsapp_number  text,
  ADD COLUMN IF NOT EXISTS sms_number       text;

-- Down
-- ALTER TABLE stores DROP COLUMN IF EXISTS whatsapp_number, DROP COLUMN IF EXISTS sms_number;
