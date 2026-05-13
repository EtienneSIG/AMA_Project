-- LearnEU app data schema (PostgreSQL 14+).
-- Auto-applied on app startup by apps/_shared/db.js (CREATE TABLE IF NOT EXISTS).
--
-- Three concerns, three tables:
--   1. connection_logs — every login / logout / failed-login event (audit trail, GDPR Art. 30)
--   2. ask_history    — every /api/chat round-trip (prompt, answer, model, usage, latency)
--   3. sheets         — saved markdown study sheets per user (replaces in-memory store in auth.js)
--
-- Identifiers:
--   - users are identified by their email (matches SEED_USERS in apps/_shared/auth.js)
--   - app is the originating App Service ('learner-web' | 'parent-portal' | 'teacher-console' | 'admin')

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS connection_logs (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  app         TEXT        NOT NULL,
  event       TEXT        NOT NULL CHECK (event IN ('login', 'logout', 'login_failed', 'forbidden')),
  ip          TEXT,
  user_agent  TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connection_logs_email_created ON connection_logs (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_app_created   ON connection_logs (app, created_at DESC);

CREATE TABLE IF NOT EXISTS ask_history (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT        NOT NULL,
  role              TEXT        NOT NULL,
  app               TEXT        NOT NULL,
  prompt            TEXT        NOT NULL,
  answer            TEXT,
  model             TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,
  latency_ms        INTEGER,
  status            INTEGER     NOT NULL DEFAULT 200,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ask_history_email_created ON ask_history (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ask_history_app_created   ON ask_history (app, created_at DESC);

CREATE TABLE IF NOT EXISTS sheets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  app         TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  prompt      TEXT,
  answer      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sheets_email_created ON sheets (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheets_app_created   ON sheets (app, created_at DESC);

-- Curricula loaded from data/curricula/*.json (one row per competency).
CREATE TABLE IF NOT EXISTS curricula (
  id            TEXT        PRIMARY KEY,         -- e.g. NL-MATH-Y7-FRAC-01
  country       TEXT        NOT NULL,
  framework     TEXT        NOT NULL,            -- kerndoelen | bildungsstandards
  grade         INTEGER     NOT NULL,
  subject       TEXT        NOT NULL,
  version       TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  loaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curricula_country ON curricula (country, subject, grade);

-- Glossary terms (math-{lang}.csv) for localisation pipeline + parent FAQ.
CREATE TABLE IF NOT EXISTS glossary_terms (
  id          BIGSERIAL    PRIMARY KEY,
  source      TEXT        NOT NULL,
  target      TEXT        NOT NULL,
  context     TEXT,
  language    TEXT        NOT NULL,             -- de-DE | nl-NL
  loaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, language)
);
CREATE INDEX IF NOT EXISTS idx_glossary_lang ON glossary_terms (language);

-- Synthetic learner personas (no real PII). Pseudonymous identifiers only.
CREATE TABLE IF NOT EXISTS learners (
  learner_id  UUID        PRIMARY KEY,
  pseudonym   TEXT        NOT NULL UNIQUE,
  market      TEXT        NOT NULL,             -- DE | NL
  grade       INTEGER     NOT NULL,
  decile      INTEGER     NOT NULL,             -- 1..10 (deprivation decile)
  sen         BOOLEAN     NOT NULL,             -- special educational needs
  loaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learners_market ON learners (market, grade);

-- Per-item attempts written by the ONNX adaptive loop in learner-web.
-- Used to compute next-item recommendations and to show progress in the admin UI.
CREATE TABLE IF NOT EXISTS item_attempts (
  id            BIGSERIAL    PRIMARY KEY,
  email         TEXT        NOT NULL,
  pseudonym     TEXT,
  item_id       TEXT        NOT NULL,
  difficulty    REAL,
  predicted     REAL,
  correct       BOOLEAN     NOT NULL,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_attempts_email ON item_attempts (email, created_at DESC);

-- Content Safety verdicts (one row per scanned text). Linked back to ask_history by ask_id.
CREATE TABLE IF NOT EXISTS content_safety_results (
  id          BIGSERIAL    PRIMARY KEY,
  ask_id      BIGINT,                           -- FK-ish to ask_history.id (nullable; eventual consistency)
  email       TEXT        NOT NULL,
  app         TEXT        NOT NULL,
  direction   TEXT        NOT NULL CHECK (direction IN ('input', 'output')),
  blocked     BOOLEAN     NOT NULL,
  hate        INTEGER,                          -- 0..7 severity
  self_harm   INTEGER,
  sexual      INTEGER,
  violence    INTEGER,
  raw         JSONB,                            -- full CS response for audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_results_email ON content_safety_results (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_results_app   ON content_safety_results (app, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_results_blocked ON content_safety_results (blocked, created_at DESC);

-- Q&A thread between learners and teachers (asynchronous, demo-grade).
CREATE TABLE IF NOT EXISTS teacher_questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_email   TEXT        NOT NULL,
  learner_name    TEXT,
  subject         TEXT        NOT NULL,
  question        TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered')),
  teacher_email   TEXT,
  teacher_name    TEXT,
  answer          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_teacher_questions_learner ON teacher_questions (learner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_questions_status  ON teacher_questions (status, created_at DESC);
