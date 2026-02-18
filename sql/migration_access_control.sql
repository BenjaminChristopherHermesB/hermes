-- Migration: Access Control, Ban/Unban, Answer Timing
-- Run this on your existing Neon DB

ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS time_taken INT;

-- Grant all existing users access
UPDATE users SET approved = TRUE;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned);
