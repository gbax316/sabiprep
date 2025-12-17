-- Add time_limit_seconds column to sessions table for configurable timed mode
ALTER TABLE sessions
ADD COLUMN time_limit_seconds INTEGER;

COMMENT ON COLUMN sessions.time_limit_seconds IS 'Time limit in seconds per question for timed mode sessions';
