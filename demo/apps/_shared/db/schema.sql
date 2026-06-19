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
-- Versioned consent recording (US3, T037): which plain-language disclosure version the
-- parent agreed to. Added idempotently so existing demos upgrade in place.
ALTER TABLE parental_consents ADD COLUMN IF NOT EXISTS disclosure_version TEXT NOT NULL DEFAULT 'v1.0';

-- Consent requests (GDPR Art. 8, US3). A time-boxed (default 7-day) token link sent to a
-- parent so they can review the disclosure and grant/decline consent for an under-16 learner.
-- status: 'pending' (awaiting parent) | 'granted' | 'declined' | 'expired'.
-- reminded_at marks the day-6 reminder; resolved_at marks grant/decline; expires_at enforces TTL.
CREATE TABLE IF NOT EXISTS consent_requests (
  id                 BIGSERIAL PRIMARY KEY,
  token              TEXT NOT NULL UNIQUE,
  parent_email       TEXT NOT NULL,
  child_email        TEXT NOT NULL,
  consent_type       TEXT NOT NULL DEFAULT 'gdpr_art8',
  disclosure_version TEXT NOT NULL DEFAULT 'v1.0',
  status             TEXT NOT NULL DEFAULT 'pending',
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  reminded_at        TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  ip                 TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_requests_token  ON consent_requests (token);
CREATE INDEX IF NOT EXISTS idx_consent_requests_child  ON consent_requests (child_email);
CREATE INDEX IF NOT EXISTS idx_consent_requests_status ON consent_requests (status);

-- Parent ↔ teacher messaging (Feature 6, US2). Every message is scanned by Azure
-- Content Safety before delivery; flagged content is quarantined for teacher moderation.
-- delivery_state: 'delivered' (clean, visible to recipient) | 'quarantined' (flagged,
-- held pending teacher action) | 'rejected' (moderator blocked).
CREATE TABLE IF NOT EXISTS parent_messages (
  id              BIGSERIAL    PRIMARY KEY,
  thread_id       TEXT         NOT NULL,
  sender_email    TEXT         NOT NULL,
  sender_role     TEXT         NOT NULL,
  recipient_email TEXT,
  child_email     TEXT,
  class_id        TEXT,
  subject         TEXT,
  body            TEXT         NOT NULL,
  cs_verdict      TEXT         NOT NULL DEFAULT 'clean',
  cs_severities   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  delivery_state  TEXT         NOT NULL DEFAULT 'delivered',
  moderated_by    TEXT,
  moderated_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parent_messages_thread ON parent_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_parent_messages_recipient ON parent_messages (recipient_email, read_at);
CREATE INDEX IF NOT EXISTS idx_parent_messages_moderation ON parent_messages (delivery_state, created_at);

-- Parent preferences (Feature 6, US4/US5): UI language, weekly digest opt-in, channels.
CREATE TABLE IF NOT EXISTS parent_preferences (
  parent_email    TEXT         PRIMARY KEY,
  language        TEXT         NOT NULL DEFAULT 'en',
  digest_opt_in   BOOLEAN      NOT NULL DEFAULT true,
  email_frequency TEXT         NOT NULL DEFAULT 'weekly',
  notify_in_app   BOOLEAN      NOT NULL DEFAULT true,
  notify_email    BOOLEAN      NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Weekly digest dispatch records (Feature 6, US4): one row per (parent, child, week).
-- tone: 'celebration' (strong week) | 'support' (needs attention) | 'neutral'.
CREATE TABLE IF NOT EXISTS parent_digests (
  id              BIGSERIAL    PRIMARY KEY,
  parent_email    TEXT         NOT NULL,
  child_email     TEXT         NOT NULL,
  week_start      DATE         NOT NULL,
  summary         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  how_to_help     TEXT,
  tone            TEXT         NOT NULL DEFAULT 'neutral',
  language        TEXT         NOT NULL DEFAULT 'en',
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (parent_email, child_email, week_start)
);
CREATE INDEX IF NOT EXISTS idx_parent_digests_parent ON parent_digests (parent_email, week_start DESC);

-- ---------------------------------------------------------------------------
-- Learner hierarchy and director reporting (Feature 4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_hierarchy_assignment (
  id              BIGSERIAL    PRIMARY KEY,
  learner_id      TEXT         NOT NULL,
  class_id        TEXT         NOT NULL,
  school_id       TEXT         NOT NULL,
  region_id       TEXT         NOT NULL,
  effective_from  DATE         NOT NULL,
  effective_to    DATE,
  source_system   TEXT         NOT NULL DEFAULT 'demo-seed',
  status          TEXT         NOT NULL DEFAULT 'active',
  exception_flag  BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lha_learner_effective ON learner_hierarchy_assignment (learner_id, effective_from DESC, effective_to DESC);
CREATE INDEX IF NOT EXISTS idx_lha_school_effective ON learner_hierarchy_assignment (school_id, region_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_lha_exception ON learner_hierarchy_assignment (exception_flag, created_at DESC);

CREATE TABLE IF NOT EXISTS reporting_scope (
  id                   BIGSERIAL    PRIMARY KEY,
  director_subject_id   TEXT         NOT NULL,
  school_id             TEXT,
  region_id             TEXT,
  role                  TEXT         NOT NULL DEFAULT 'director',
  effective_from        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  effective_to          TIMESTAMPTZ,
  granted_by            TEXT         NOT NULL,
  granted_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status                TEXT         NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_reporting_scope_director_effective ON reporting_scope (director_subject_id, role, effective_from DESC, effective_to DESC);
CREATE INDEX IF NOT EXISTS idx_reporting_scope_school_region ON reporting_scope (school_id, region_id, status);

CREATE TABLE IF NOT EXISTS director_profile (
  director_subject_id   TEXT         PRIMARY KEY,
  director_email        TEXT         NOT NULL,
  display_name          TEXT         NOT NULL,
  primary_school_id     TEXT,
  primary_region_id     TEXT,
  status                TEXT         NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_director_profile_school ON director_profile (primary_school_id, status);
CREATE INDEX IF NOT EXISTS idx_director_profile_region ON director_profile (primary_region_id, status);

CREATE TABLE IF NOT EXISTS hierarchy_exception (
  id             BIGSERIAL    PRIMARY KEY,
  learner_id     TEXT         NOT NULL,
  issue_type     TEXT         NOT NULL,
  issue_detail   TEXT         NOT NULL,
  severity       TEXT         NOT NULL,
  detected_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status         TEXT         NOT NULL DEFAULT 'open',
  resolved_at    TIMESTAMPTZ,
  resolved_by    TEXT
);
CREATE INDEX IF NOT EXISTS idx_hierarchy_exception_learner ON hierarchy_exception (learner_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_hierarchy_exception_status ON hierarchy_exception (status, severity, detected_at DESC);

CREATE OR REPLACE VIEW vw_reporting_scope_expanded AS
SELECT
  rs.id,
  rs.director_subject_id,
  COALESCE(dp.display_name, rs.director_subject_id) AS director_name,
  COALESCE(dp.director_email, rs.director_subject_id) AS director_email,
  rs.school_id,
  rs.region_id,
  rs.role,
  rs.effective_from,
  rs.effective_to,
  rs.status
FROM reporting_scope rs
LEFT JOIN director_profile dp
  ON dp.director_subject_id = rs.director_subject_id;

CREATE OR REPLACE VIEW vw_hierarchy_rollup_school AS
WITH active_assignments AS (
  SELECT learner_id, school_id, region_id, exception_flag,
         ROW_NUMBER() OVER (
           PARTITION BY learner_id
           ORDER BY effective_from DESC, created_at DESC, id DESC
         ) AS rn
  FROM learner_hierarchy_assignment
  WHERE status = 'active'
)
SELECT
  school_id,
  region_id,
  COUNT(*)::int AS learner_count,
  COUNT(DISTINCT learner_id)::int AS distinct_learner_count,
  SUM(CASE WHEN exception_flag THEN 1 ELSE 0 END)::int AS exception_count
FROM active_assignments
WHERE rn = 1
GROUP BY school_id, region_id;

CREATE TABLE IF NOT EXISTS director_portal_session (
  session_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  director_subject_id   TEXT         NOT NULL,
  role                  TEXT         NOT NULL,
  scope_snapshot        JSONB        NOT NULL,
  opened_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  report_id             TEXT,
  outcome               TEXT         NOT NULL,
  correlation_id        TEXT
);
CREATE INDEX IF NOT EXISTS idx_director_portal_session_director ON director_portal_session (director_subject_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_director_portal_session_outcome ON director_portal_session (outcome, opened_at DESC);

CREATE TABLE IF NOT EXISTS embedded_report_reference (
  report_id               TEXT         PRIMARY KEY,
  workspace_id            TEXT         NOT NULL,
  dataset_id              TEXT         NOT NULL,
  display_name            TEXT         NOT NULL,
  allowed_scope_dimensions TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  aggregation_level       TEXT         NOT NULL,
  sensitivity_label       TEXT         NOT NULL,
  is_approved             BOOLEAN      NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_embedded_report_reference_approved ON embedded_report_reference (is_approved, aggregation_level, display_name);
CREATE INDEX IF NOT EXISTS idx_embedded_report_reference_scope_dims ON embedded_report_reference USING GIN (allowed_scope_dimensions);

CREATE TABLE IF NOT EXISTS audit_event (
  id             BIGSERIAL    PRIMARY KEY,
  event_type     TEXT         NOT NULL,
  actor_id       TEXT         NOT NULL,
  actor_role     TEXT         NOT NULL,
  target_type    TEXT         NOT NULL,
  target_id      TEXT         NOT NULL,
  scope          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  timestamp      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  outcome        TEXT         NOT NULL,
  correlation_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_event_timestamp ON audit_event (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_actor ON audit_event (actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_target ON audit_event (target_type, target_id, timestamp DESC);

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_event_update ON audit_event;
CREATE TRIGGER trg_prevent_audit_event_update
BEFORE UPDATE ON audit_event
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_event_delete ON audit_event;
CREATE TRIGGER trg_prevent_audit_event_delete
BEFORE DELETE ON audit_event
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

-- ---------------------------------------------------------------------------
-- Learner gamification UX (Feature 003)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_badges (
  email       TEXT         NOT NULL,
  badge_key   TEXT         NOT NULL,
  badge_label TEXT         NOT NULL,
  source      TEXT         NOT NULL,
  earned_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (email, badge_key)
);
CREATE INDEX IF NOT EXISTS idx_learner_badges_earned ON learner_badges (email, earned_at DESC);

CREATE TABLE IF NOT EXISTS learner_daily_chests (
  email             TEXT         NOT NULL,
  day               DATE         NOT NULL,
  reward_badge_key  TEXT         NOT NULL,
  reward_label      TEXT         NOT NULL,
  claimed_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (email, day)
);

CREATE TABLE IF NOT EXISTS learner_motivation_messages (
  id            BIGSERIAL    PRIMARY KEY,
  class_key     TEXT         NOT NULL,
  email         TEXT         NOT NULL,
  display_name  TEXT         NOT NULL,
  message       TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_motivation_class_created ON learner_motivation_messages (class_key, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_gamification_overrides (
  id            BIGSERIAL    PRIMARY KEY,
  teacher_email TEXT         NOT NULL,
  action_type   TEXT         NOT NULL,
  target_type   TEXT         NOT NULL,
  target_id     TEXT         NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gamification_overrides_created ON learner_gamification_overrides (created_at DESC);

CREATE TABLE IF NOT EXISTS learner_champion_challenges (
  id            BIGSERIAL    PRIMARY KEY,
  class_key     TEXT         NOT NULL,
  author_email  TEXT         NOT NULL,
  author_name   TEXT         NOT NULL,
  question      TEXT         NOT NULL,
  options       JSONB        NOT NULL,
  correct_index INTEGER      NOT NULL,
  explanation   TEXT,
  status        TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  winner_email  TEXT,
  winner_name   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_champion_challenges_class_created ON learner_champion_challenges (class_key, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_champion_answers (
  id               BIGSERIAL    PRIMARY KEY,
  challenge_id     BIGINT       NOT NULL REFERENCES learner_champion_challenges(id) ON DELETE CASCADE,
  challenger_email TEXT         NOT NULL,
  challenger_name  TEXT         NOT NULL,
  selected_index   INTEGER      NOT NULL,
  is_correct       BOOLEAN      NOT NULL,
  points_awarded   INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, challenger_email)
);
CREATE INDEX IF NOT EXISTS idx_champion_answers_challenge ON learner_champion_answers (challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_champion_answers_email ON learner_champion_answers (challenger_email, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_duels (
  id              BIGSERIAL    PRIMARY KEY,
  class_key       TEXT         NOT NULL,
  challenger_email TEXT        NOT NULL,
  challenger_name TEXT         NOT NULL,
  opponent_email  TEXT         NOT NULL,
  opponent_name   TEXT         NOT NULL,
  question        TEXT         NOT NULL,
  options         JSONB        NOT NULL,
  correct_index   INTEGER      NOT NULL,
  time_limit_sec  INTEGER      NOT NULL DEFAULT 90,
  status          TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'expired')),
  winner_email    TEXT,
  winner_name     TEXT,
  points_awarded  INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  answered_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_duels_class_created ON learner_duels (class_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duels_users ON learner_duels (challenger_email, opponent_email, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_duel_answers (
  id              BIGSERIAL    PRIMARY KEY,
  duel_id         BIGINT       NOT NULL REFERENCES learner_duels(id) ON DELETE CASCADE,
  player_email    TEXT         NOT NULL,
  player_name     TEXT         NOT NULL,
  selected_index  INTEGER      NOT NULL,
  is_correct      BOOLEAN      NOT NULL,
  elapsed_ms      INTEGER      NOT NULL,
  bonus_points    INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (duel_id, player_email)
);
CREATE INDEX IF NOT EXISTS idx_duel_answers_duel ON learner_duel_answers (duel_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Teacher Assessment, AI Rubric Assist & At-Risk Dashboards (Feature 008)
-- High-risk AI discipline: every AI-generated artifact is teacher-gated before it
-- can become assignable; all generated/feedback text is Content-Safety scanned;
-- generation/safety/approval/assignment actions are written to the immutable
-- audit_event table. EU-resident storage only; data-minimised (prompt hashes).
-- ---------------------------------------------------------------------------

-- Rubric: structured grading rubric (3-5 levels, 2-5 criteria).
CREATE TABLE IF NOT EXISTS rubrics (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT         NOT NULL,
  creator_teacher_id TEXT         NOT NULL,
  level_count        INTEGER      NOT NULL CHECK (level_count BETWEEN 3 AND 5),
  criterion_count    INTEGER      NOT NULL CHECK (criterion_count BETWEEN 2 AND 5),
  criteria_json      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  weighting_mode     TEXT         NOT NULL DEFAULT 'equal' CHECK (weighting_mode IN ('equal','weighted')),
  status             TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  shared_visibility  TEXT         NOT NULL DEFAULT 'private' CHECK (shared_visibility IN ('private','class','school')),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rubrics_creator ON rubrics (creator_teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rubrics_status  ON rubrics (status, created_at DESC);

-- RubricScore: teacher scoring of a learner submission against a rubric.
CREATE TABLE IF NOT EXISTS rubric_scores (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id             UUID         NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  learner_id            TEXT         NOT NULL,
  assessment_id         TEXT,
  criterion_scores_json JSONB        NOT NULL DEFAULT '[]'::jsonb,
  overall_level         INTEGER,
  mastery_percent       INTEGER      NOT NULL DEFAULT 0 CHECK (mastery_percent BETWEEN 0 AND 100),
  teacher_feedback_text TEXT,
  feedback_safety_status TEXT        NOT NULL DEFAULT 'not_scanned' CHECK (feedback_safety_status IN ('not_scanned','pass','flagged','blocked')),
  scored_by_teacher_id  TEXT         NOT NULL,
  scored_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_rubric  ON rubric_scores (rubric_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_learner ON rubric_scores (learner_id, scored_at DESC);

-- SharedAssessment: library-managed reusable assessment with discoverability metadata.
CREATE TABLE IF NOT EXISTS shared_assessments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_assessment_id TEXT,
  source_version      INTEGER      NOT NULL DEFAULT 1,
  owner_teacher_id    TEXT         NOT NULL,
  title               TEXT         NOT NULL,
  description         TEXT,
  grade_tag           TEXT,
  subject_tag         TEXT,
  skill_tags          TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  difficulty_level    TEXT         NOT NULL DEFAULT 'core' CHECK (difficulty_level IN ('support','core','stretch')),
  publish_status      TEXT         NOT NULL DEFAULT 'published' CHECK (publish_status IN ('draft','published','deprecated')),
  usage_count         INTEGER      NOT NULL DEFAULT 0,
  average_performance INTEGER,
  governance_owner_id TEXT,
  reviewed_at         TIMESTAMPTZ,
  payload_json        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_assessments_owner   ON shared_assessments (owner_teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_assessments_status  ON shared_assessments (publish_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_assessments_tags    ON shared_assessments USING GIN (skill_tags);

-- AssessmentCopy: class-specific copy derived from a shared assessment (isolated edits).
CREATE TABLE IF NOT EXISTS assessment_copies (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_assessment_id UUID        NOT NULL REFERENCES shared_assessments(id) ON DELETE CASCADE,
  source_version      INTEGER      NOT NULL DEFAULT 1,
  destination_class_id TEXT        NOT NULL,
  copied_by_teacher_id TEXT        NOT NULL,
  due_date            DATE,
  localized_edits_json JSONB       NOT NULL DEFAULT '{}'::jsonb,
  curriculum_mapping_json JSONB    NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_copies_source ON assessment_copies (shared_assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_copies_class  ON assessment_copies (destination_class_id, created_at DESC);

-- RemediationGroup: teacher-managed learner group for targeted catch-up.
CREATE TABLE IF NOT EXISTS remediation_groups (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id            TEXT         NOT NULL,
  created_by_teacher_id TEXT       NOT NULL,
  title               TEXT         NOT NULL DEFAULT 'Catch-up group',
  threshold_rule      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  learner_members_json JSONB       NOT NULL DEFAULT '[]'::jsonb,
  sequence_definition_json JSONB   NOT NULL DEFAULT '[]'::jsonb,
  status              TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_remediation_groups_class ON remediation_groups (class_id, created_at DESC);

-- RemediationProgress: per-learner progress through remediation sequence steps.
CREATE TABLE IF NOT EXISTS remediation_progress (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  remediation_group_id UUID        NOT NULL REFERENCES remediation_groups(id) ON DELETE CASCADE,
  learner_id          TEXT         NOT NULL,
  step_id             TEXT         NOT NULL,
  step_status         TEXT         NOT NULL DEFAULT 'assigned' CHECK (step_status IN ('assigned','in_progress','completed')),
  completion_timestamp TIMESTAMPTZ,
  reassessment_score  INTEGER,
  cleared_flag        BOOLEAN      NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (remediation_group_id, learner_id, step_id)
);
CREATE INDEX IF NOT EXISTS idx_remediation_progress_group   ON remediation_progress (remediation_group_id, learner_id);
CREATE INDEX IF NOT EXISTS idx_remediation_progress_cleared ON remediation_progress (cleared_flag, updated_at DESC);

-- AIGeneratedArtifact: generated rubric/question drafts + lifecycle state.
CREATE TABLE IF NOT EXISTS ai_generated_artifacts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type       TEXT         NOT NULL CHECK (artifact_type IN ('rubric','question_set','remediation_suggestion')),
  objective_text_hash TEXT         NOT NULL,
  bounded_prompt_context JSONB     NOT NULL DEFAULT '{}'::jsonb,
  model_deployment    TEXT,
  model_version       TEXT,
  generated_text      TEXT,
  generation_status   TEXT         NOT NULL DEFAULT 'draft' CHECK (generation_status IN ('draft','safety_reviewed','needs_edit','approved','rejected','assigned')),
  safety_status       TEXT         NOT NULL DEFAULT 'not_scanned' CHECK (safety_status IN ('not_scanned','pass','flagged','blocked')),
  approved_for_assignment BOOLEAN  NOT NULL DEFAULT false,
  template_version    TEXT,
  created_by_teacher_id TEXT       NOT NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_teacher ON ai_generated_artifacts (created_by_teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_status  ON ai_generated_artifacts (generation_status, created_at DESC);

-- ContentSafetyVerdict: artifact/feedback-linked Content Safety result (purpose-built;
-- the global content_safety_results table still receives a central log entry too).
CREATE TABLE IF NOT EXISTS assessment_safety_verdicts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id         UUID         REFERENCES ai_generated_artifacts(id) ON DELETE CASCADE,
  content_type        TEXT         NOT NULL CHECK (content_type IN ('generated_rubric','generated_question_set','remediation_suggestion','teacher_feedback')),
  category_scores_json JSONB       NOT NULL DEFAULT '{}'::jsonb,
  flagged_categories_json JSONB    NOT NULL DEFAULT '[]'::jsonb,
  verdict_status      TEXT         NOT NULL DEFAULT 'pass' CHECK (verdict_status IN ('pass','flagged','blocked','accepted_with_review')),
  requires_manual_review BOOLEAN   NOT NULL DEFAULT false,
  acknowledged_by_teacher_id TEXT,
  acknowledged_at     TIMESTAMPTZ,
  scanned_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_safety_verdicts_artifact ON assessment_safety_verdicts (artifact_id, scanned_at DESC);

-- TeacherApproval: immutable approve/reject/needs_edit record for AI artifacts.
CREATE TABLE IF NOT EXISTS teacher_approvals (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id         UUID         NOT NULL REFERENCES ai_generated_artifacts(id) ON DELETE CASCADE,
  teacher_id          TEXT         NOT NULL,
  decision            TEXT         NOT NULL CHECK (decision IN ('approve','reject','needs_edit')),
  decision_reason     TEXT,
  edited_text_hash    TEXT,
  approved_for_assignment BOOLEAN  NOT NULL DEFAULT false,
  decided_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_approvals_artifact ON teacher_approvals (artifact_id, decided_at DESC);
-- TeacherApproval records are append-only (immutability mirrors audit_event posture).
CREATE OR REPLACE FUNCTION prevent_teacher_approval_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'teacher_approvals is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_teacher_approval_update ON teacher_approvals;
CREATE TRIGGER trg_prevent_teacher_approval_update
BEFORE UPDATE ON teacher_approvals FOR EACH ROW
EXECUTE FUNCTION prevent_teacher_approval_mutation();
DROP TRIGGER IF EXISTS trg_prevent_teacher_approval_delete ON teacher_approvals;
CREATE TRIGGER trg_prevent_teacher_approval_delete
BEFORE DELETE ON teacher_approvals FOR EACH ROW
EXECUTE FUNCTION prevent_teacher_approval_mutation();

-- AtRiskDashboardSnapshot: aggregated, advisory-only class analytics.
CREATE TABLE IF NOT EXISTS at_risk_dashboard_snapshots (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id            TEXT         NOT NULL,
  topic_id            TEXT,
  mastery_percent     INTEGER      NOT NULL DEFAULT 0,
  completion_rate     INTEGER      NOT NULL DEFAULT 0,
  at_risk_count       INTEGER      NOT NULL DEFAULT 0,
  ungraded_count      INTEGER      NOT NULL DEFAULT 0,
  recommendation_summary TEXT,
  computed_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atrisk_snapshots_class ON at_risk_dashboard_snapshots (class_id, computed_at DESC);

-- TemplateCacheEntry: governed prompt-template fragment cache for generation consistency.
CREATE TABLE IF NOT EXISTS template_cache_entries (
  cache_key           TEXT         PRIMARY KEY,
  template_family     TEXT         NOT NULL,
  template_version    TEXT         NOT NULL DEFAULT 'v1',
  pedagogical_tags_json JSONB      NOT NULL DEFAULT '[]'::jsonb,
  locale              TEXT         NOT NULL DEFAULT 'en',
  template_text       TEXT         NOT NULL,
  hash                TEXT,
  owner_role          TEXT         NOT NULL DEFAULT 'learning-sciences',
  review_status       TEXT         NOT NULL DEFAULT 'approved' CHECK (review_status IN ('draft','approved','deprecated')),
  hit_count           INTEGER      NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_template_cache_family ON template_cache_entries (template_family, review_status);

-- Teacher overrides (Feature 5a ΓÇö EU AI Act Article 14 audit trail).

-- ===========================================================================
-- Feature 007 — Adaptive Learning (Next-Best-Activity, Catch-Up & Stretch)
-- HIGH-RISK (EU AI Act Annex III §3). Every adaptive decision is a transparent,
-- teacher-overridable RECOMMENDATION — never an autonomous action.
-- Decision/override/audit tables are APPEND-ONLY (Art. 12 record-keeping).
-- adaptive_path_state is device-scoped, mutable (cross-device resume only).
-- ===========================================================================

-- Every adaptive recommendation, with the deterministic reasoning that produced it.
CREATE TABLE IF NOT EXISTS adaptive_decision (
  id                       BIGSERIAL    PRIMARY KEY,
  learner_email            TEXT         NOT NULL,
  skill_id                 TEXT,                              -- skill the decision is anchored to
  prior_item_id            TEXT,                              -- activity the learner just completed
  recommended_activity_id  TEXT,                              -- next-best activity id (null in non-adaptive fallback)
  reason                   TEXT         NOT NULL CHECK (reason IN ('catch_up','peer_practice','challenge','stretch','non_adaptive')),
  mastery_level            REAL,                              -- 0..1 used to derive the band
  threshold_band           TEXT         NOT NULL CHECK (threshold_band IN ('0-50','50-80','80-plus','unknown')),
  model_version            TEXT         NOT NULL DEFAULT 'adaptive-v1',
  explanation_learner      TEXT,                              -- plain-language "why this activity" (Art. 13)
  explanation_teacher      TEXT,                              -- full reasoning visible to teacher
  data_reliable            BOOLEAN      NOT NULL DEFAULT true, -- false => mastery evidence unavailable/flagged
  teacher_overridden       BOOLEAN      NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adaptive_decision_learner ON adaptive_decision (learner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adaptive_decision_skill   ON adaptive_decision (skill_id, created_at DESC);

-- Scaffolded catch-up sequence assigned when mastery is below 50%.
CREATE TABLE IF NOT EXISTS adaptive_catch_up_sequence (
  id                       BIGSERIAL    PRIMARY KEY,
  learner_email            TEXT         NOT NULL,
  skill_id                 TEXT         NOT NULL,
  activity_ids             TEXT[]       NOT NULL,             -- ordered scaffolded steps
  checkpoint_activity_id   TEXT,                              -- gate before advancement
  current_index            INTEGER      NOT NULL DEFAULT 0,
  status                   TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','re_catch_up','overridden')),
  started_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ,
  final_mastery            REAL,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adaptive_catchup_learner ON adaptive_catch_up_sequence (learner_email, skill_id, started_at DESC);

-- Stretch opportunity surfaced after sustained high mastery (3+ consecutive 85%+).
CREATE TABLE IF NOT EXISTS adaptive_stretch_activity (
  id                       BIGSERIAL    PRIMARY KEY,
  learner_email            TEXT         NOT NULL,
  skill_id                 TEXT         NOT NULL,
  activity_id              TEXT,
  trigger_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ,
  teacher_assigned         BOOLEAN      NOT NULL DEFAULT false,
  qualitative_feedback     TEXT,                              -- teacher notes (formative, not a grade)
  feedback_teacher_email   TEXT,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adaptive_stretch_learner ON adaptive_stretch_activity (learner_email, skill_id, trigger_at DESC);

-- Teacher override of an adaptive recommendation (Art. 14 human oversight). APPEND-ONLY.
CREATE TABLE IF NOT EXISTS adaptive_teacher_override (
  id                       BIGSERIAL    PRIMARY KEY,
  decision_id              BIGINT       NOT NULL,             -- references adaptive_decision.id
  learner_email            TEXT         NOT NULL,
  teacher_email            TEXT         NOT NULL,
  skill_id                 TEXT,
  recommended_activity_id  TEXT,
  override_activity_id     TEXT,                              -- teacher's chosen alternative (null = manual intervention)
  reasoning                TEXT,                              -- optional teacher rationale
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adaptive_override_learner ON adaptive_teacher_override (learner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adaptive_override_decision ON adaptive_teacher_override (decision_id);

-- Immutable adaptive audit trail (Art. 12). One row per material event. APPEND-ONLY.
CREATE TABLE IF NOT EXISTS adaptive_audit (
  id            BIGSERIAL    PRIMARY KEY,
  event_type    TEXT         NOT NULL CHECK (event_type IN (
                  'decision_made','override_applied','checkpoint_passed','checkpoint_failed',
                  'path_changed','anomaly_flagged','stretch_triggered','stretch_completed',
                  'catch_up_started','high_intervention','resume','non_adaptive_fallback')),
  learner_email TEXT         NOT NULL,
  teacher_email TEXT,
  data          JSONB        NOT NULL DEFAULT '{}'::jsonb,    -- full decision/override snapshot
  latency_ms    INTEGER,                                      -- telemetry (Art. 15 robustness)
  logged_by_system BOOLEAN   NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adaptive_audit_learner ON adaptive_audit (learner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adaptive_audit_event   ON adaptive_audit (event_type, created_at DESC);

-- Cross-device adaptive path state (resume). Mutable, device-session scoped (NOT an audit record).
CREATE TABLE IF NOT EXISTS adaptive_path_state (
  learner_email        TEXT         NOT NULL,
  current_activity_id  TEXT,
  sequence_id          BIGINT,                                -- active catch-up sequence id, if any
  checkpoint_progress  TEXT,                                  -- e.g. "2 of 4 catch-up activities"
  prior_hints          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  prior_feedback       TEXT,
  last_device          TEXT,
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_email)
);

-- Append-only guardrails (mirror teacher_approvals immutability posture).
CREATE OR REPLACE FUNCTION prevent_adaptive_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'adaptive_audit is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_adaptive_audit_update ON adaptive_audit;
CREATE TRIGGER trg_prevent_adaptive_audit_update
BEFORE UPDATE ON adaptive_audit FOR EACH ROW
EXECUTE FUNCTION prevent_adaptive_audit_mutation();
DROP TRIGGER IF EXISTS trg_prevent_adaptive_audit_delete ON adaptive_audit;
CREATE TRIGGER trg_prevent_adaptive_audit_delete
BEFORE DELETE ON adaptive_audit FOR EACH ROW
EXECUTE FUNCTION prevent_adaptive_audit_mutation();

CREATE OR REPLACE FUNCTION prevent_adaptive_override_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'adaptive_teacher_override is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_adaptive_override_update ON adaptive_teacher_override;
CREATE TRIGGER trg_prevent_adaptive_override_update
BEFORE UPDATE ON adaptive_teacher_override FOR EACH ROW
EXECUTE FUNCTION prevent_adaptive_override_mutation();
DROP TRIGGER IF EXISTS trg_prevent_adaptive_override_delete ON adaptive_teacher_override;
CREATE TRIGGER trg_prevent_adaptive_override_delete
BEFORE DELETE ON adaptive_teacher_override FOR EACH ROW
EXECUTE FUNCTION prevent_adaptive_override_mutation();

-- ===========================================================================
-- Feature 009 — Interoperability (SCORM, xAPI, SIS, SSO, calendar, GDPR export)
-- EU residency only. Secrets are NEVER stored here — only Key Vault references.
-- Every external API interaction is logged immutably (AI Act Art. 12).
-- ===========================================================================

-- Connector configuration. secret_ref is a Key Vault reference, never a plaintext secret.
CREATE TABLE IF NOT EXISTS integration_config (
  id            BIGSERIAL    PRIMARY KEY,
  connector_type TEXT        NOT NULL CHECK (connector_type IN ('scorm','xapi','sis','sso','calendar','export')),
  name          TEXT         NOT NULL,
  endpoint      TEXT,                                         -- must be an EU host (validated at onboarding)
  region        TEXT         NOT NULL DEFAULT 'westeurope',
  secret_ref    TEXT,                                         -- e.g. @KeyVault(name=kv-learneu;secret=sis-token)
  claim_map     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT         NOT NULL DEFAULT 'configured' CHECK (status IN ('configured','healthy','degraded','disabled')),
  enabled       BOOLEAN      NOT NULL DEFAULT false,
  created_by    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (connector_type, name)
);

-- Immutable external API audit (Art. 12). APPEND-ONLY. No raw payloads or secrets — hash + redacted summary only.
CREATE TABLE IF NOT EXISTS external_api_audit (
  id             BIGSERIAL   PRIMARY KEY,
  correlation_id TEXT        NOT NULL,
  connector_type TEXT        NOT NULL,
  event_type     TEXT        NOT NULL,
  direction      TEXT        NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  endpoint       TEXT,
  outcome        TEXT        NOT NULL CHECK (outcome IN ('success','failure','retry','blocked','dead_letter')),
  status_code    INTEGER,
  payload_hash   TEXT,                                        -- sha256 of payload (no raw payload stored)
  redacted_summary TEXT,
  actor          TEXT,                                        -- user or 'system'
  latency_ms     INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ext_audit_corr ON external_api_audit (correlation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_audit_conn ON external_api_audit (connector_type, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_external_api_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'external_api_audit is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_ext_audit_update ON external_api_audit;
CREATE TRIGGER trg_prevent_ext_audit_update
BEFORE UPDATE ON external_api_audit FOR EACH ROW
EXECUTE FUNCTION prevent_external_api_audit_mutation();
DROP TRIGGER IF EXISTS trg_prevent_ext_audit_delete ON external_api_audit;
CREATE TRIGGER trg_prevent_ext_audit_delete
BEFORE DELETE ON external_api_audit FOR EACH ROW
EXECUTE FUNCTION prevent_external_api_audit_mutation();

-- SCORM packages (1.2 / 2004) and learner attempts.
CREATE TABLE IF NOT EXISTS scorm_package (
  package_id    TEXT         PRIMARY KEY,
  title         TEXT         NOT NULL,
  scorm_version TEXT         NOT NULL DEFAULT '1.2' CHECK (scorm_version IN ('1.2','2004')),
  launch_href   TEXT,
  manifest      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  blob_ref      TEXT,                                         -- EU Blob reference (assets)
  status        TEXT         NOT NULL DEFAULT 'parsed' CHECK (status IN ('uploaded','parsed','parse_failed','enabled','disabled')),
  uploaded_by   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scorm_attempt (
  id            BIGSERIAL    PRIMARY KEY,
  package_id    TEXT         NOT NULL,
  learner_email TEXT         NOT NULL,
  lesson_status TEXT         NOT NULL DEFAULT 'incomplete',
  score_raw     REAL,
  session_time  TEXT,                                         -- SCORM CMITime
  suspend_data  TEXT,
  committed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scorm_attempt_learner ON scorm_attempt (learner_email, package_id, created_at DESC);

-- xAPI statement envelopes with delivery lifecycle (queue -> delivered / dead_letter).
CREATE TABLE IF NOT EXISTS xapi_statement (
  statement_id  UUID         PRIMARY KEY,
  actor_hash    TEXT         NOT NULL,                        -- pseudonymous actor (no raw email to LRS)
  verb          TEXT         NOT NULL,
  object_id     TEXT         NOT NULL,
  result        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','dead_letter')),
  attempts      INTEGER      NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xapi_status ON xapi_statement (status, created_at);

-- SIS sync jobs and identity conflicts.
CREATE TABLE IF NOT EXISTS sis_sync_job (
  job_id        TEXT         PRIMARY KEY,
  mode          TEXT         NOT NULL DEFAULT 'delta' CHECK (mode IN ('full','delta')),
  status        TEXT         NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  learners_seen INTEGER      NOT NULL DEFAULT 0,
  upserts       INTEGER      NOT NULL DEFAULT 0,
  conflicts     INTEGER      NOT NULL DEFAULT 0,
  checksum      TEXT,
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS sis_conflict (
  id            BIGSERIAL    PRIMARY KEY,
  job_id        TEXT         NOT NULL,
  learner_ref   TEXT         NOT NULL,
  conflict_type TEXT         NOT NULL,
  details       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolution    TEXT,
  resolved_by   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- SSO federated identity links.
CREATE TABLE IF NOT EXISTS sso_identity_link (
  id            BIGSERIAL    PRIMARY KEY,
  provider      TEXT         NOT NULL,
  subject       TEXT         NOT NULL,
  learner_email TEXT         NOT NULL,
  claim_map     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT         NOT NULL DEFAULT 'linked' CHECK (status IN ('linked','revoked')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (provider, subject)
);

-- Normalized school calendar events and assignment due-date adjustments.
CREATE TABLE IF NOT EXISTS calendar_event (
  id            BIGSERIAL    PRIMARY KEY,
  provider      TEXT         NOT NULL DEFAULT 'school',
  event_date    DATE         NOT NULL,
  kind          TEXT         NOT NULL DEFAULT 'closure' CHECK (kind IN ('closure','open')),
  label         TEXT,
  source_checksum TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (provider, event_date)
);
CREATE TABLE IF NOT EXISTS due_date_adjustment (
  id            BIGSERIAL    PRIMARY KEY,
  assignment_id TEXT         NOT NULL,
  original_due  DATE         NOT NULL,
  adjusted_due  DATE,
  reason        TEXT,
  status        TEXT         NOT NULL DEFAULT 'auto' CHECK (status IN ('auto','pending_confirm','confirmed','rejected')),
  teacher_email TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_due_adj_assignment ON due_date_adjustment (assignment_id, created_at DESC);

-- GDPR Art. 15 data export requests.
CREATE TABLE IF NOT EXISTS data_export_request (
  request_id    TEXT         PRIMARY KEY,
  subject_email TEXT         NOT NULL,
  requested_by  TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','packaged','delivered','expired','failed')),
  package_ref   TEXT,
  manifest      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  encrypted     BOOLEAN      NOT NULL DEFAULT true,
  link_expires_at TIMESTAMPTZ,
  sla_due_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_export_subject ON data_export_request (subject_email, created_at DESC);
