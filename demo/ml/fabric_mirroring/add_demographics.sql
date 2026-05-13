-- Migration: Add demographic classification columns to the learners table.
-- These are synthetic/pseudonymous demographics for analytics — never real PII.
-- Run against the learneu database after the base schema is applied.

ALTER TABLE learners
  ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('10-12','13-15','16-18')),
  ADD COLUMN IF NOT EXISTS gender    TEXT CHECK (gender IN ('M','F','Non-binary','Prefer not to say'));

-- Update existing synthetic learners with random demographics (demo only).
UPDATE learners
SET age_group = CASE (floor(random() * 3))::int
                  WHEN 0 THEN '10-12'
                  WHEN 1 THEN '13-15'
                  ELSE '16-18'
                END,
    gender = CASE (floor(random() * 4))::int
               WHEN 0 THEN 'M'
               WHEN 1 THEN 'F'
               WHEN 2 THEN 'Non-binary'
               ELSE 'Prefer not to say'
             END
WHERE age_group IS NULL;

-- Add email column to learners for joining with fact tables.
ALTER TABLE learners
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups.
CREATE INDEX IF NOT EXISTS idx_learners_email ON learners (email);

COMMENT ON COLUMN learners.age_group IS 'Synthetic age band for analytics classification (not real DOB)';
COMMENT ON COLUMN learners.gender    IS 'Synthetic gender for analytics classification (self-declared or synthetic)';
COMMENT ON COLUMN learners.email     IS 'Links learner profile to activity facts (pseudonymous in analytics)';
