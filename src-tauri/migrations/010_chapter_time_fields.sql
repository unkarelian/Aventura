-- Add start_time and end_time columns to chapters for timeline tracking
-- Stores JSON with years, days, hours, minutes fields
ALTER TABLE chapters ADD COLUMN start_time TEXT;
ALTER TABLE chapters ADD COLUMN end_time TEXT;
