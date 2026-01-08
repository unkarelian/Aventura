-- Add time_tracker column to stories for tracking story progression time
-- Stores JSON with years, days, hours, minutes fields
ALTER TABLE stories ADD COLUMN time_tracker TEXT;
