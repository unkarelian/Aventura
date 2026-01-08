-- Add time_tracker_snapshot column to checkpoints for time tracking restoration
ALTER TABLE checkpoints ADD COLUMN time_tracker_snapshot TEXT;
