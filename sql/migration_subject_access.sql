-- Migration: Subject Access Control
-- Run this in the Neon SQL Editor

-- Access mode per user: 'all' = unrestricted, 'restricted' = use subject_access table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject_access_mode VARCHAR(10) DEFAULT 'all';

-- Per-user subject access table
CREATE TABLE IF NOT EXISTS subject_access (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    granted_by  INT REFERENCES users(id) ON DELETE SET NULL,
    granted_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_access_user ON subject_access(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_access_subject ON subject_access(subject_id);
