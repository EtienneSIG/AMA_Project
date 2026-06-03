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
  email       TEXT,
  market      TEXT        NOT NULL,             -- DE | NL
  grade       INTEGER     NOT NULL,
  decile      INTEGER     NOT NULL,             -- 1..10 (deprivation decile)
  sen         BOOLEAN     NOT NULL,             -- special educational needs
  age_group   TEXT        CHECK (age_group IN ('10-12','13-15','16-18')),
  gender      TEXT        CHECK (gender IN ('M','F','Non-binary','Prefer not to say')),
  loaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learners_market ON learners (market, grade);
CREATE INDEX IF NOT EXISTS idx_learners_email  ON learners (email);

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

-- Admin operational controls (infra state checks/actions; no learner content).
CREATE TABLE IF NOT EXISTS operational_events (
  id              BIGSERIAL    PRIMARY KEY,
  app             TEXT         NOT NULL,
  actor_email     TEXT         NOT NULL,
  actor_role      TEXT         NOT NULL,
  event_type      TEXT         NOT NULL CHECK (event_type IN ('postgres_status_check', 'postgres_wakeup')),
  outcome         TEXT         NOT NULL,
  correlation_id  TEXT         NOT NULL,
  detail          TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operational_events_created ON operational_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_events_event_created ON operational_events (event_type, created_at DESC);

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

-- ---------------------------------------------------------------------------
-- Skills progression (Feature 1)
-- A small static skill catalogue + per-learner mastery + daily activity rollup.
-- The catalogue is light here; Feature 2 (model-oriented skill catalogue) replaces
-- the seed data with a richer schema (skill_competency_map etc.).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id          TEXT        PRIMARY KEY,                       -- e.g. SK-FRAC-ADD
  label       TEXT        NOT NULL,                          -- "Add fractions"
  domain      TEXT        NOT NULL DEFAULT 'numeracy',
  chapter     TEXT        NOT NULL DEFAULT 'General',        -- groups skills in the learner's progress dashboard
  difficulty  REAL        NOT NULL DEFAULT 0.5,              -- 0..1
  bloom       TEXT,                                          -- remember | understand | apply | ...
  loaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive migration: keep the canonical schema runnable against pre-Feature-4b databases.
ALTER TABLE skills ADD COLUMN IF NOT EXISTS chapter TEXT NOT NULL DEFAULT 'General';

-- Many-to-many between adaptive items (FRAC-01, FRAC-02, ...) and skills.
CREATE TABLE IF NOT EXISTS item_skills (
  item_id   TEXT NOT NULL,
  skill_id  TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_item_skills_skill ON item_skills (skill_id);

-- ---------------------------------------------------------------------------
-- Skill <-> curriculum competency mapping (Feature 2)
-- One skill can map to many ministerial competencies (DE Bildungsstandards,
-- NL Kerndoelen, ...) and one competency may aggregate several skills.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_competency_map (
  skill_id      TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL,
  weight        REAL NOT NULL DEFAULT 1.0,
  loaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (skill_id, competency_id)
);
CREATE INDEX IF NOT EXISTS idx_skill_comp_competency ON skill_competency_map (competency_id);

-- Per-learner mastery rollup. Recomputed on every /api/learner/attempt.
CREATE TABLE IF NOT EXISTS skill_mastery (
  email       TEXT        NOT NULL,
  skill_id    TEXT        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  correct     INTEGER     NOT NULL DEFAULT 0,
  level       REAL        NOT NULL DEFAULT 0.0,              -- 0..1
  last_seen   TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_skill_mastery_email ON skill_mastery (email, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_mastery_skill ON skill_mastery (skill_id);

-- Daily activity rollup per learner (used by streak / badges in Feature 4 too).
CREATE TABLE IF NOT EXISTS learner_activity (
  email       TEXT        NOT NULL,
  day         DATE        NOT NULL,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  correct     INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, day)
);
CREATE INDEX IF NOT EXISTS idx_learner_activity_email ON learner_activity (email, day DESC);

-- ---------------------------------------------------------------------------
-- Quality telemetry (Feature 3)
-- One row per learner feedback click on an assistant answer.
-- The optional groundedness probe also writes here with rating='confusing'
-- and a 'low_groundedness' note when a curriculum-tagged prompt yields an
-- answer that does not cite any competency id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ask_feedback (
  id          BIGSERIAL    PRIMARY KEY,
  ask_id      BIGINT       REFERENCES ask_history(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  rating      TEXT         NOT NULL CHECK (rating IN ('helpful','confusing','wrong')),
  note        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ask_feedback_ask     ON ask_feedback (ask_id);
CREATE INDEX IF NOT EXISTS idx_ask_feedback_created ON ask_feedback (created_at DESC);

-- View: rolling 24h KPIs for the admin Quality dashboard.
CREATE OR REPLACE VIEW v_quality_kpis_24h AS
SELECT
  (SELECT COUNT(*)::int FROM ask_history WHERE created_at > now() - INTERVAL '24 hours')                                       AS prompts_24h,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::int FROM ask_history WHERE created_at > now() - INTERVAL '24 hours' AND latency_ms IS NOT NULL) AS p50_latency_ms,
  (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::int FROM ask_history WHERE created_at > now() - INTERVAL '24 hours' AND latency_ms IS NOT NULL) AS p95_latency_ms,
  (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * SUM(CASE WHEN blocked THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 2)::float END
     FROM content_safety_results WHERE created_at > now() - INTERVAL '24 hours')                                              AS pct_blocked_cs_24h,
  (SELECT COUNT(*)::int FROM ask_feedback WHERE created_at > now() - INTERVAL '24 hours')                                      AS feedback_24h,
  (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * SUM(CASE WHEN rating = 'helpful' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 2)::float END
     FROM ask_feedback WHERE created_at > now() - INTERVAL '24 hours')                                                         AS pct_helpful_24h,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (answered_at - created_at)))::int
     FROM teacher_questions WHERE answered_at IS NOT NULL AND answered_at > now() - INTERVAL '7 days')                         AS teacher_median_response_seconds_7d;

-- View: latest free-form learner feedback (joined to ask context).
CREATE OR REPLACE VIEW v_quality_feedback AS
SELECT f.id, f.ask_id, f.email, f.rating, f.note, f.created_at,
       a.role AS ask_role, a.app AS ask_app, a.prompt, a.model, a.latency_ms
  FROM ask_feedback f
  LEFT JOIN ask_history a ON a.id = f.ask_id
 ORDER BY f.created_at DESC;

-- Teacher overrides (Feature 5a — EU AI Act Article 14 audit trail).
-- Records every manual change a teacher makes to an AI-suggested mastery level.
CREATE TABLE IF NOT EXISTS teacher_overrides (
  id              BIGSERIAL    PRIMARY KEY,
  teacher_email   TEXT         NOT NULL,
  learner_email   TEXT         NOT NULL,
  skill_id        TEXT         NOT NULL,
  ai_level        REAL,
  human_level     REAL         NOT NULL,
  rationale       TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_overrides_learner ON teacher_overrides (learner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_overrides_skill   ON teacher_overrides (skill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_overrides_created ON teacher_overrides (created_at DESC);

-- Parent → child links (Feature 6). Read-only consent the parent gives the platform
-- to follow the learner's progress in plain language; never carries data write rights.
CREATE TABLE IF NOT EXISTS parent_links (
  id              BIGSERIAL    PRIMARY KEY,
  parent_email    TEXT         NOT NULL,
  child_email     TEXT         NOT NULL,
  relationship    TEXT         NOT NULL DEFAULT 'parent',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (parent_email, child_email)
);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_links (parent_email);
CREATE INDEX IF NOT EXISTS idx_parent_links_child  ON parent_links (child_email);

-- Parental consent (GDPR Art. 8). Active consent = granted = true AND withdrawn_at IS NULL.
CREATE TABLE IF NOT EXISTS parental_consents (
  id            BIGSERIAL PRIMARY KEY,
  parent_email  TEXT NOT NULL,
  child_email   TEXT NOT NULL,
  consent_type  TEXT NOT NULL DEFAULT 'gdpr_art8',
  granted       BOOLEAN NOT NULL DEFAULT false,
  granted_at    TIMESTAMPTZ,
  withdrawn_at  TIMESTAMPTZ,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_email, child_email, consent_type)
);
CREATE INDEX IF NOT EXISTS idx_parental_consents_parent ON parental_consents (parent_email);
CREATE INDEX IF NOT EXISTS idx_parental_consents_child ON parental_consents (child_email);
