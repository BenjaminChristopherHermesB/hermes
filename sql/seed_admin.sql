-- Seed admin account
-- Run this after schema.sql in the Neon SQL Editor
-- Password: Benjamin1312! (bcrypt hash)
INSERT INTO users (username, password_hash, name, role, ip_address)
VALUES (
  'bchbenjamin',
  '$2a$12$LJ3m4ys2Y5sE8QHd7wVGfuGz0yN8xH5qQZ3X2Y1W0V9U8T7S6R5Q4',
  'Benjamin',
  'admin',
  '0.0.0.0'
) ON CONFLICT (username) DO NOTHING;
