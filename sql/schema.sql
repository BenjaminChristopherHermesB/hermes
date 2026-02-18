-- Hermes The Quizzer — Database Schema
-- Run this in the Neon SQL Editor to create all tables

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  approved BOOLEAN DEFAULT FALSE,
  banned BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  theme_preference VARCHAR(10) DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer VARCHAR(500) NOT NULL,
  explanation TEXT,
  module INT NOT NULL CHECK (module BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, question)
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  total_questions INT NOT NULL,
  correct_count INT DEFAULT 0,
  is_timed BOOLEAN DEFAULT FALSE,
  time_per_question INT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer VARCHAR(500),
  is_correct BOOLEAN NOT NULL,
  time_taken INT,
  answered_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_question_stats (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE CASCADE,
  times_attempted INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  last_attempted_at TIMESTAMP,
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_answers_session ON quiz_answers(session_id);
CREATE INDEX idx_user_question_stats_user ON user_question_stats(user_id);
CREATE INDEX idx_user_question_stats_question ON user_question_stats(question_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_users_banned ON users(banned);
