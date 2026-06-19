// LearnEU shared Postgres client.
//
// Lazy connection: the pool is built on first use; if PG_HOST is unset (local dev,
// CI without a database), every helper becomes a no-op so the app still boots.
//
// Schema is auto-applied on first connection (CREATE TABLE IF NOT EXISTS).
//
// Connection details come from app settings (set by infra/modules/app-service.bicep):
//   PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD (KV reference), PG_SSL=require
//
// Helpers exported:
//   logConnection({email,role,app,event,ip,userAgent,detail})
//   logAsk({email,role,app,prompt,answer,model,usage,latencyMs,status,error})
//   listSheets({email,app})
//   getSheet({id,email})
//   createSheet({email,role,app,title,prompt,answer})
//   deleteSheet({id,email})
//
// All helpers swallow errors and log to console — DB outages must not 500 the UX.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Current plain-language consent disclosure version (GDPR Art. 8, US3). Bump when the
// disclosure copy changes so each recorded consent is tied to the exact text agreed to.
const CONSENT_DISCLOSURE_VERSION = 'v1.0';
const CONSENT_TTL_DAYS = parseInt(process.env.CONSENT_LINK_TTL_DAYS || '7', 10);

const HOST = process.env.PG_HOST || '';
const PORT = parseInt(process.env.PG_PORT || '5432', 10);
const DB = process.env.PG_DATABASE || 'learneu';
const USER = process.env.PG_USER || '';
const PWD = process.env.PG_PASSWORD || '';
const SSL = (process.env.PG_SSL || 'require').toLowerCase() !== 'disable';
const APP = process.env.APP_NAME || process.env.APP_ROLE || 'unknown';

const enabled = Boolean(HOST && USER && !PWD.startsWith('@Microsoft.KeyVault'));

// --- Static skill catalogue + item -> skill mapping ------------------------
// Fallback used when demo/data/skills.csv is missing (very early dev / CI).
// Production seeding is CSV-driven by seedReferenceData() (Feature 2).
const SKILL_SEED_FALLBACK = [
  { id: 'SK-FRAC-ADD',      label: 'Add fractions',                domain: 'numeracy', chapter: 'Fractions · operations',      difficulty: 0.40, bloom: 'apply' },
  { id: 'SK-FRAC-SIMPLIFY', label: 'Simplify fractions',           domain: 'numeracy', chapter: 'Fractions · basics',          difficulty: 0.30, bloom: 'understand' },
  { id: 'SK-FRAC-COMPARE',  label: 'Compare fractions',            domain: 'numeracy', chapter: 'Fractions · basics',          difficulty: 0.45, bloom: 'analyze' },
  { id: 'SK-FRAC-CONVERT',  label: 'Convert decimals & fractions', domain: 'numeracy', chapter: 'Fractions · representations', difficulty: 0.55, bloom: 'apply' },
  { id: 'SK-FRAC-WORD',     label: 'Fraction word problems',       domain: 'numeracy', chapter: 'Fractions · word problems',   difficulty: 0.35, bloom: 'apply' },
  { id: 'SK-FRAC-MULT',     label: 'Multiply fractions',           domain: 'numeracy', chapter: 'Fractions · operations',      difficulty: 0.60, bloom: 'apply' },
  { id: 'SK-FRAC-MIXED',    label: 'Mixed numbers',                domain: 'numeracy', chapter: 'Fractions · operations',      difficulty: 0.50, bloom: 'apply' }
];
const ITEM_SKILL_SEED_FALLBACK = [
  { itemId: 'FRAC-01', skillId: 'SK-FRAC-ADD' },
  { itemId: 'FRAC-02', skillId: 'SK-FRAC-SIMPLIFY' },
  { itemId: 'FRAC-03', skillId: 'SK-FRAC-COMPARE' },
  { itemId: 'FRAC-04', skillId: 'SK-FRAC-ADD' },
  { itemId: 'FRAC-05', skillId: 'SK-FRAC-CONVERT' },
  { itemId: 'FRAC-06', skillId: 'SK-FRAC-WORD' },
  { itemId: 'FRAC-07', skillId: 'SK-FRAC-MULT' },
  { itemId: 'FRAC-08', skillId: 'SK-FRAC-MIXED' }
];
const HIERARCHY_SEED = [
  { learnerId: 'student@learneu.demo', classId: 'CLS-7A', schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student1@learneu.demo', classId: 'CLS-7A', schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student2@learneu.demo', classId: 'CLS-7B', schoolId: 'SCH-ROTTERDAM-01', regionId: 'REG-NL-RANDSTAD', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student3@learneu.demo', classId: 'CLS-8A', schoolId: 'SCH-ROTTERDAM-01', regionId: 'REG-NL-RANDSTAD', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student4@learneu.demo', classId: 'CLS-8B', schoolId: 'SCH-UTRECHT-01', regionId: 'REG-NL-CENTRAL', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student5@learneu.demo', classId: 'CLS-8B', schoolId: 'SCH-UTRECHT-02', regionId: 'REG-NL-CENTRAL', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: true },
  { learnerId: 'student5@learneu.demo', classId: 'CLS-8B', schoolId: 'SCH-UTRECHT-03', regionId: 'REG-NL-CENTRAL', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: true },
  { learnerId: 'student6@learneu.demo', classId: 'CLS-7C', schoolId: 'SCH-EINDHOVEN-01', regionId: 'REG-NL-SOUTH', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student7@learneu.demo', classId: 'CLS-7C', schoolId: 'SCH-EINDHOVEN-01', regionId: 'REG-NL-SOUTH', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false },
  { learnerId: 'student8@learneu.demo', classId: 'CLS-9A', schoolId: 'SCH-GRONINGEN-01', regionId: 'REG-NL-NORTH', effectiveFrom: '2026-01-01', sourceSystem: 'demo-seed', status: 'active', exceptionFlag: false }
];
const REPORTING_SCOPE_SEED = [
  { directorSubjectId: 'director@learneu.demo', schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', role: 'director', grantedBy: 'admin@learneu.demo', grantedAt: '2026-06-01T09:00:00Z', status: 'active' },
  { directorSubjectId: 'director@learneu.demo', schoolId: 'SCH-ROTTERDAM-01', regionId: 'REG-NL-RANDSTAD', role: 'director', grantedBy: 'admin@learneu.demo', grantedAt: '2026-06-01T09:00:00Z', status: 'active' },
  { directorSubjectId: 'director.noscope@learneu.demo', schoolId: null, regionId: null, role: 'director', grantedBy: 'admin@learneu.demo', grantedAt: '2026-06-01T09:00:00Z', status: 'active' }
];
const DIRECTOR_PROFILE_SEED = [
  { directorSubjectId: 'director@learneu.demo', directorEmail: 'director@learneu.demo', displayName: 'Ava Janssen', primarySchoolId: 'SCH-AMSTERDAM-01', primaryRegionId: 'REG-NL-NORTH', status: 'active' },
  { directorSubjectId: 'director.noscope@learneu.demo', directorEmail: 'director.noscope@learneu.demo', displayName: 'No Scope Director', primarySchoolId: null, primaryRegionId: null, status: 'active' }
];
const HIERARCHY_EXCEPTION_SEED = [
  { learnerId: 'student5@learneu.demo', issueType: 'conflicting_assignment', issueDetail: 'Two active school assignments exist for the same reporting period.', severity: 'high', status: 'open' },
  { learnerId: 'student8@learneu.demo', issueType: 'missing_class_link', issueDetail: 'Hierarchy review flagged a missing class link in the source enrollment feed.', severity: 'medium', status: 'open' }
];
const EMBEDDED_REPORT_REFERENCE_SEED = [
  { reportId: '3f38a2d1-a6f5-482c-91db-edcb2de374bd', workspaceId: '127a12ab-fa94-421b-bee3-4f534264d3ff', datasetId: '08b3758f-e419-4ebc-a884-2d2306bf9ed4', displayName: 'Director Governance Overview', allowedScopeDimensions: ['school', 'region'], aggregationLevel: 'school-region', sensitivityLabel: 'Confidential-aggregated', isApproved: true }
];

let pool = null;
let initPromise = null;

function getPool() {
  if (!enabled) return null;
  if (pool) return pool;
  // Lazy require so apps without `pg` installed locally don't crash on require time.
  let Pool;
  try { ({ Pool } = require('pg')); }
  catch (e) { console.error('[db] `pg` module not installed:', e.message); return null; }
  pool = new Pool({
    host: HOST,
    port: PORT,
    database: DB,
    user: USER,
    password: PWD,
    ssl: SSL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
  pool.on('error', (e) => console.error('[db] pool error:', e.message));
  return pool;
}

async function init() {
  if (!enabled) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const p = getPool();
    if (!p) return false;
    try {
      // Connectivity preflight: if this fails, skip expensive DDL attempts.
      await p.query('SELECT 1');
    } catch (e) {
      console.error('[db] init connectivity failed:', e.message);
      initPromise = null;
      return false;
    }
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // Apply schema statement-by-statement so a single non-fatal failure (e.g.
    // CREATE EXTENSION lacking SUPERUSER, which is restricted on Azure PG
    // Flexible Server) does not roll back the whole DDL batch.
    const stripped = sql.replace(/--[^\n]*\n/g, '\n');
    const stmts = stripped.split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean);
    let okCount = 0; let failCount = 0;
    for (const stmt of stmts) {
      try { await p.query(stmt); okCount++; }
      catch (e) {
        failCount++;
        console.error('[db] DDL skipped:', e.message, '| sql:', stmt.slice(0, 80));
      }
    }
    console.log(`[db] schema applied to ${HOST}/${DB} (${okCount} ok, ${failCount} skipped)`);
    try {
      // Best-effort seed of static reference data (curricula / glossary / learners).
      await seedReferenceData(p).catch(e => console.error('[db] seed failed:', e.message));
      return true;
    } catch (e) {
      console.error('[db] schema init failed:', e.message);
      initPromise = null;
      return false;
    }
  })();
  return initPromise;
}

// Seed curricula, glossary terms, learners from packaged JSON/CSV (idempotent).
async function seedReferenceData(p) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataDir)) {
    // 1. Curricula (JSON files)
    const curDir = path.join(dataDir, 'curricula');
    if (fs.existsSync(curDir)) {
      for (const f of fs.readdirSync(curDir).filter(x => x.endsWith('.json'))) {
        try {
          const j = JSON.parse(fs.readFileSync(path.join(curDir, f), 'utf8'));
          for (const c of j.competencies || []) {
            await p.query(
              `INSERT INTO curricula (id, country, framework, grade, subject, version, title, description)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
              [c.id, j.country, j.framework, j.grade, j.subject, j.version, c.title, c.description || null]
            );
          }
        } catch (e) { console.error('[db] curriculum seed failed for', f, e.message); }
      }
    }

    // 2. Glossary terms (CSV files: source,target,context)
    const gloDir = path.join(dataDir, 'glossaries');
    if (fs.existsSync(gloDir)) {
      for (const f of fs.readdirSync(gloDir).filter(x => x.endsWith('.csv'))) {
        const lang = f.replace(/^math-/, '').replace(/\.csv$/, ''); // math-de-DE.csv -> de-DE
        try {
          const lines = fs.readFileSync(path.join(gloDir, f), 'utf8').split(/\r?\n/);
          for (let i = 1; i < lines.length; i++) {
            const cells = parseCsvLine(lines[i]);
            if (cells.length < 2 || !cells[0]) continue;
            await p.query(
              `INSERT INTO glossary_terms (source, target, context, language)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (source, language) DO UPDATE SET target = EXCLUDED.target, context = EXCLUDED.context`,
              [cells[0], cells[1], cells[2] || null, lang]
            );
          }
        } catch (e) { console.error('[db] glossary seed failed for', f, e.message); }
      }
    }
  }

  // 3. Skill catalogue + item->skill mapping + skill->competency map (Feature 2; CSV-driven, falls back to inline seed if missing).
  try {
    // 3a. Skills catalogue
    let skills = SKILL_SEED_FALLBACK;
    const skillsCsv = path.join(dataDir, 'skills.csv');
    if (fs.existsSync(skillsCsv)) {
      skills = [];
      const lines = fs.readFileSync(skillsCsv, 'utf8').split(/\r?\n/);
      // header (Feature 4b): id,domain,chapter,label,difficulty,bloom (also tolerates legacy id,domain,label,difficulty,bloom).
      const header = parseCsvLine(lines[0] || '').map(h => (h || '').trim().toLowerCase());
      const idx = name => header.indexOf(name);
      const hasChapter = idx('chapter') >= 0;
      const iId = idx('id'), iDomain = idx('domain'), iChapter = idx('chapter'), iLabel = idx('label'), iDiff = idx('difficulty'), iBloom = idx('bloom');
      for (let i = 1; i < lines.length; i++) {
        const c = parseCsvLine(lines[i]);
        if (!c[iId]) continue;
        const diff = parseFloat(c[iDiff]);
        skills.push({
          id:        c[iId],
          domain:    c[iDomain] || 'numeracy',
          chapter:   hasChapter ? (c[iChapter] || 'General') : 'General',
          label:     c[iLabel] || c[iId],
          difficulty: Number.isFinite(diff) ? diff : 0.5,
          bloom:     c[iBloom] || null
        });
      }
    }
    for (const s of skills) {
      await p.query(
        `INSERT INTO skills (id, label, domain, chapter, difficulty, bloom)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, domain = EXCLUDED.domain, chapter = EXCLUDED.chapter, difficulty = EXCLUDED.difficulty, bloom = EXCLUDED.bloom`,
        [s.id, s.label, s.domain, s.chapter || 'General', s.difficulty, s.bloom]
      );
    }

    // 3b. Item -> skill mapping
    let mapping = ITEM_SKILL_SEED_FALLBACK;
    const itemSkillsCsv = path.join(dataDir, 'items_to_skills.csv');
    if (fs.existsSync(itemSkillsCsv)) {
      mapping = [];
      const lines = fs.readFileSync(itemSkillsCsv, 'utf8').split(/\r?\n/);
      // header: item_id,skill_id
      for (let i = 1; i < lines.length; i++) {
        const c = parseCsvLine(lines[i]);
        if (c.length < 2 || !c[0]) continue;
        mapping.push({ itemId: c[0], skillId: c[1] });
      }
    }
    for (const m of mapping) {
      await p.query(
        `INSERT INTO item_skills (item_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [m.itemId, m.skillId]
      );
    }

    // 3c. Skill -> competency mapping (Feature 2)
    const mapCsv = path.join(dataDir, 'skill_competency_map.csv');
    if (fs.existsSync(mapCsv)) {
      const lines = fs.readFileSync(mapCsv, 'utf8').split(/\r?\n/);
      // header: skill_id,competency_id,weight
      let mapCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const c = parseCsvLine(lines[i]);
        if (c.length < 2 || !c[0]) continue;
        const w = parseFloat(c[2]);
        await p.query(
          `INSERT INTO skill_competency_map (skill_id, competency_id, weight)
           VALUES ($1, $2, $3)
           ON CONFLICT (skill_id, competency_id) DO UPDATE SET weight = EXCLUDED.weight`,
          [c[0], c[1], Number.isFinite(w) ? w : 1.0]
        );
        mapCount++;
      }
      console.log(`[db] seeded ${mapCount} skill->competency mappings`);
    }
  } catch (e) { console.error('[db] skill seed failed:', e.message); }

  // 4. Learners (synthetic_learners.csv: learner_id,market,grade,decile,sen,pseudonym)
  const learnersFile = path.join(dataDir, 'synthetic_learners.csv');
  if (fs.existsSync(learnersFile)) {
    try {
      const lines = fs.readFileSync(learnersFile, 'utf8').split(/\r?\n/);
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length < 6 || !cells[0]) continue;
        await p.query(
          `INSERT INTO learners (learner_id, pseudonym, market, grade, decile, sen)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (learner_id) DO NOTHING`,
          [cells[0], cells[5], cells[1], parseInt(cells[2], 10), parseInt(cells[3], 10), /^true$/i.test(cells[4])]
        );
        count++;
      }
      console.log(`[db] seeded ${count} learner rows`);
    } catch (e) { console.error('[db] learner seed failed:', e.message); }
  }

  // 5. Parent → child links + extended demo cohort (Feature 6 + multi-user demo).
  //    All inserts are idempotent (ON CONFLICT) and the heavier blocks (attempts,
  //    sheets, teacher Q&A) are guarded so they only run once.
  try {
    await seedHierarchyData(p);
    await seedDemoCohort(p);
  } catch (e) { console.error('[db] demo cohort seed failed:', e.message); }
}

async function seedHierarchyData(p) {
  const count = async (table) => {
    const r = await p.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    return r && r.rows[0] ? r.rows[0].n : 0;
  };
  if (await count('learner_hierarchy_assignment') === 0) {
    for (const row of HIERARCHY_SEED) {
      await p.query(
        `INSERT INTO learner_hierarchy_assignment (learner_id, class_id, school_id, region_id, effective_from, effective_to, source_system, status, exception_flag)
         VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9)`,
        [row.learnerId, row.classId, row.schoolId, row.regionId, row.effectiveFrom, row.effectiveTo || null, row.sourceSystem, row.status, Boolean(row.exceptionFlag)]
      );
    }
  }
  if (await count('reporting_scope') === 0) {
    for (const row of REPORTING_SCOPE_SEED) {
      await p.query(
        `INSERT INTO reporting_scope (director_subject_id, school_id, region_id, role, effective_from, effective_to, granted_by, granted_at, status)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8::timestamptz, $9)`,
        [row.directorSubjectId, row.schoolId, row.regionId, row.role, row.effectiveFrom || row.grantedAt || new Date().toISOString(), row.effectiveTo || null, row.grantedBy, row.grantedAt || new Date().toISOString(), row.status]
      );
    }
  }
  if (await count('director_profile') === 0) {
    for (const row of DIRECTOR_PROFILE_SEED) {
      await p.query(
        `INSERT INTO director_profile (director_subject_id, director_email, display_name, primary_school_id, primary_region_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.directorSubjectId, row.directorEmail, row.displayName, row.primarySchoolId, row.primaryRegionId, row.status]
      );
    }
  }
  if (await count('hierarchy_exception') === 0) {
    for (const row of HIERARCHY_EXCEPTION_SEED) {
      await p.query(
        `INSERT INTO hierarchy_exception (learner_id, issue_type, issue_detail, severity, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.learnerId, row.issueType, row.issueDetail, row.severity, row.status]
      );
    }
  }
  for (const row of EMBEDDED_REPORT_REFERENCE_SEED) {
    await p.query(
      `INSERT INTO embedded_report_reference (report_id, workspace_id, dataset_id, display_name, allowed_scope_dimensions, aggregation_level, sensitivity_label, is_approved)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8)
       ON CONFLICT (report_id) DO UPDATE
         SET workspace_id = EXCLUDED.workspace_id,
             dataset_id = EXCLUDED.dataset_id,
             display_name = EXCLUDED.display_name,
             allowed_scope_dimensions = EXCLUDED.allowed_scope_dimensions,
             aggregation_level = EXCLUDED.aggregation_level,
             sensitivity_label = EXCLUDED.sensitivity_label,
             is_approved = EXCLUDED.is_approved`,
      [row.reportId, row.workspaceId, row.datasetId, row.displayName, row.allowedScopeDimensions, row.aggregationLevel, row.sensitivityLabel, row.isApproved]
    );
  }
}

function normalizeList(value) {
  const list = Array.isArray(value) ? value : (value == null ? [] : [value]);
  return [...new Set(list.map(item => String(item).trim()).filter(Boolean))];
}

function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toTimestamp(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Demo cohort: 9 students × 3 teachers × 5 parents with consistent linkage,
// item attempts, mastery rollups, activity bars, teacher Q&A and study sheets.
// Re-runs are no-ops once item_attempts already contains rows for these emails.
// ---------------------------------------------------------------------------
const DEMO_STUDENTS = [
  // email, pseudonym (matches synthetic_learners pattern), profile bucket
  { email: 'student@learneu.demo',  name: 'Lucas',  bucket: 'practising' },
  { email: 'student1@learneu.demo', name: 'Emma',   bucket: 'mastered'   },
  { email: 'student2@learneu.demo', name: 'Noah',   bucket: 'proficient' },
  { email: 'student3@learneu.demo', name: 'Mia',    bucket: 'beginner'   },
  { email: 'student4@learneu.demo', name: 'Liam',   bucket: 'practising' },
  { email: 'student5@learneu.demo', name: 'Olivia', bucket: 'mastered'   },
  { email: 'student6@learneu.demo', name: 'Hugo',   bucket: 'beginner'   },
  { email: 'student7@learneu.demo', name: 'Sofia',  bucket: 'proficient' },
  { email: 'student8@learneu.demo', name: 'Léa',    bucket: 'practising' }
];
const DEMO_PARENT_LINKS = [
  { parent: 'parent@learneu.demo',  child: 'student@learneu.demo',  rel: 'parent' },
  { parent: 'parent@learneu.demo',  child: 'student6@learneu.demo', rel: 'parent' },
  { parent: 'parent1@learneu.demo', child: 'student1@learneu.demo', rel: 'parent' },
  { parent: 'parent1@learneu.demo', child: 'student7@learneu.demo', rel: 'parent' },
  { parent: 'parent2@learneu.demo', child: 'student2@learneu.demo', rel: 'parent' },
  { parent: 'parent3@learneu.demo', child: 'student3@learneu.demo', rel: 'parent' },
  { parent: 'parent3@learneu.demo', child: 'student8@learneu.demo', rel: 'parent' },
  { parent: 'parent4@learneu.demo', child: 'student4@learneu.demo', rel: 'parent' },
  { parent: 'parent4@learneu.demo', child: 'student5@learneu.demo', rel: 'parent' }
];
// Bucket -> target mastery level mean & per-skill correctness probability.
const BUCKET_PROFILES = {
  beginner:   { meanLevel: 0.25, pCorrect: 0.40, attemptsPerSkill: [2, 4] },
  practising: { meanLevel: 0.55, pCorrect: 0.62, attemptsPerSkill: [3, 6] },
  proficient: { meanLevel: 0.78, pCorrect: 0.80, attemptsPerSkill: [4, 7] },
  mastered:   { meanLevel: 0.92, pCorrect: 0.93, attemptsPerSkill: [5, 8] }
};
// Deterministic PRNG seeded from a string — same input ⇒ same output.
function seededRand(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function() { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function seedDemoCohort(p) {
  // Cluster-wide advisory lock prevents two apps from racing the seed and
  // creating duplicate item_attempts / sheets / teacher_questions rows.
  const lock = await p.query(`SELECT pg_try_advisory_lock(739121345) AS ok`);
  if (!lock || !lock.rows[0] || !lock.rows[0].ok) return;
  try {
    await _seedDemoCohortLocked(p);
  } finally {
    await p.query(`SELECT pg_advisory_unlock(739121345)`).catch(() => {});
  }
}

async function _seedDemoCohortLocked(p) {
  // 5a. Parent links (always idempotent).
  for (const l of DEMO_PARENT_LINKS) {
    await p.query(
      `INSERT INTO parent_links (parent_email, child_email, relationship)
       VALUES ($1, $2, $3) ON CONFLICT (parent_email, child_email) DO NOTHING`,
      [l.parent, l.child, l.rel]
    );
  }

  // 5a-consent. Seed GDPR Art. 8 parental consents for most parent-child pairs.
  // Leave parent3→student8 and parent4→student5 WITHOUT consent for demo purposes.
  const CONSENT_SKIP = new Set([
    'parent3@learneu.demo|student8@learneu.demo',
    'parent4@learneu.demo|student5@learneu.demo'
  ]);
  for (const l of DEMO_PARENT_LINKS) {
    if (CONSENT_SKIP.has(l.parent + '|' + l.child)) continue;
    await p.query(
      `INSERT INTO parental_consents (parent_email, child_email, consent_type, granted, granted_at)
       VALUES ($1, $2, 'gdpr_art8', true, now() - INTERVAL '7 days')
       ON CONFLICT (parent_email, child_email, consent_type) DO NOTHING`,
      [l.parent, l.child]
    );
  }

  // Resolve item -> skill mapping(we need real skill ids that exist in `skills`).
  const itemMap = await p.query(
    `SELECT i.item_id, i.skill_id FROM item_skills i JOIN skills s ON s.id = i.skill_id`
  );
  const items = (itemMap && itemMap.rows) ? itemMap.rows : [];
  if (!items.length) { console.warn('[db] demo cohort: no item_skills rows yet, skipping attempts seed'); return; }
  const bySkill = new Map();
  for (const it of items) {
    if (!bySkill.has(it.skill_id)) bySkill.set(it.skill_id, []);
    bySkill.get(it.skill_id).push(it.item_id);
  }
  const skillIds = [...bySkill.keys()];

  // 5b. item_attempts + skill_mastery + learner_activity per student.
  // Per-student guard so adding a new student to DEMO_STUDENTS still seeds it.
  const seenRow = await p.query(
    `SELECT email FROM item_attempts WHERE email = ANY($1::text[]) GROUP BY email`,
    [DEMO_STUDENTS.map(s => s.email)]
  );
  const alreadySeeded = new Set((seenRow && seenRow.rows ? seenRow.rows : []).map(r => r.email));
  let totalAttempts = 0;
  for (const s of DEMO_STUDENTS) {
    if (alreadySeeded.has(s.email)) continue;
    const rng = seededRand(s.email);
    const profile = BUCKET_PROFILES[s.bucket] || BUCKET_PROFILES.practising;
    const masteryAcc = new Map(); // skill_id -> { attempts, correct, sumPredicted }
    const activityAcc = new Map(); // 'YYYY-MM-DD' -> { attempts, correct }

    for (const skillId of skillIds) {
      const itemList = bySkill.get(skillId);
      const [lo, hi] = profile.attemptsPerSkill;
      const n = lo + Math.floor(rng() * (hi - lo + 1));
      for (let i = 0; i < n; i++) {
        const itemId = itemList[Math.floor(rng() * itemList.length)];
        const correct = rng() < profile.pCorrect;
        const predicted = Math.max(0, Math.min(1, profile.meanLevel + (rng() - 0.5) * 0.25));
        const latency = 4000 + Math.floor(rng() * 9000);
        // distribute across the past 14 days, biased to recent (sqrt squashes towards 0)
        const daysAgo = Math.floor(Math.sqrt(rng()) * 14);
        const ts = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rng() * 6 * 3600000));
        await p.query(
          `INSERT INTO item_attempts (email, pseudonym, item_id, difficulty, predicted, correct, latency_ms, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [s.email, s.name, itemId, 0.5, predicted, correct, latency, ts.toISOString()]
        );
        totalAttempts++;
        const mAcc = masteryAcc.get(skillId) || { attempts: 0, correct: 0, sum: 0 };
        mAcc.attempts++; if (correct) mAcc.correct++; mAcc.sum += predicted;
        masteryAcc.set(skillId, mAcc);
        const dayKey = ts.toISOString().slice(0, 10);
        const aAcc = activityAcc.get(dayKey) || { attempts: 0, correct: 0 };
        aAcc.attempts++; if (correct) aAcc.correct++;
        activityAcc.set(dayKey, aAcc);
      }
    }
    // Always include "today" so the activity bar / streak look alive.
    const today = new Date().toISOString().slice(0, 10);
    if (!activityAcc.has(today)) activityAcc.set(today, { attempts: 1, correct: 1 });

    for (const [skillId, m] of masteryAcc) {
      const level = Math.max(0, Math.min(1, 0.6 * (m.correct / Math.max(1, m.attempts)) + 0.4 * (m.sum / Math.max(1, m.attempts))));
      await p.query(
        `INSERT INTO skill_mastery (email, skill_id, attempts, correct, level, last_seen, updated_at)
         VALUES ($1,$2,$3,$4,$5, now(), now())
         ON CONFLICT (email, skill_id) DO UPDATE SET
           attempts = EXCLUDED.attempts, correct = EXCLUDED.correct, level = EXCLUDED.level,
           last_seen = EXCLUDED.last_seen, updated_at = now()`,
        [s.email, skillId, m.attempts, m.correct, level]
      );
    }
    for (const [day, a] of activityAcc) {
      await p.query(
        `INSERT INTO learner_activity (email, day, attempts, correct, updated_at)
         VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (email, day) DO UPDATE SET attempts = EXCLUDED.attempts, correct = EXCLUDED.correct, updated_at = now()`,
        [s.email, day, a.attempts, a.correct]
      );
    }
  }
  console.log(`[db] demo cohort: seeded ${totalAttempts} attempts across ${DEMO_STUDENTS.length} students`);

  // 5c. teacher_questions — 1 to 3 per student, mix of pending and answered.
  const QUESTION_TEMPLATES = [
    { subject: 'Help with adding fractions',          question: 'I keep getting the wrong answer when I add 2/3 + 1/4. What is the trick with the denominators?' },
    { subject: 'Why simplify?',                       question: 'Do I always have to simplify the result, even on a test?' },
    { subject: 'Mixed numbers vs improper fractions', question: 'When should I write 7/3 as 2 1/3 and when should I keep it as 7/3?' },
    { subject: 'Word problem stuck',                  question: 'The recipe asks for 3/4 cup but I want to make half — how do I work that out?' },
    { subject: 'Decimals confusion',                  question: 'My calculator shows 0.333… for 1/3. Is that the same number?' },
    { subject: 'Comparing fractions',                 question: 'Which is bigger: 5/8 or 7/12? I\u2019m not sure how to compare them quickly.' }
  ];
  const ANSWER_TEMPLATES = [
    'Great question! First find a common denominator (here 12). Rewrite both fractions, then add the numerators. We will practise three more in class on Friday.',
    'Yes, when possible — it shows you understood the concept. On a test, write both forms if you have time.',
    'Either form is correct. Use mixed numbers when measuring real things (e.g. 2 1/3 cups), and improper fractions when you keep calculating.',
    'Multiply each ingredient by 1/2. So 3/4 cup × 1/2 = 3/8 cup. Try drawing a tape diagram if it helps.',
    'Yes — 1/3 and 0.333… are the same number. The dots mean "repeats forever".',
    'Convert both to the same denominator (24): 5/8 = 15/24 and 7/12 = 14/24, so 5/8 is bigger.'
  ];
  // Round-robin teacher per student so the inbox shows variety.
  const TEACHERS = [
    { email: 'teacher@learneu.demo',  name: 'Klaus Klein' },
    { email: 'teacher1@learneu.demo', name: 'Marieke Visser' },
    { email: 'teacher2@learneu.demo', name: 'Camille Laurent' }
  ];
  const tqSeen = await p.query(`SELECT learner_email FROM teacher_questions WHERE learner_email = ANY($1::text[]) GROUP BY learner_email`, [DEMO_STUDENTS.map(s => s.email)]);
  const tqDone = new Set((tqSeen && tqSeen.rows ? tqSeen.rows : []).map(r => r.learner_email));
  {
    let tqCount = 0;
    for (let si = 0; si < DEMO_STUDENTS.length; si++) {
      const s = DEMO_STUDENTS[si];
      if (tqDone.has(s.email)) continue;
      const rng = seededRand(s.email + '|tq');
      const nQ = 1 + Math.floor(rng() * 3); // 1-3 questions
      for (let i = 0; i < nQ; i++) {
        const t = QUESTION_TEMPLATES[(si + i) % QUESTION_TEMPLATES.length];
        const a = ANSWER_TEMPLATES[(si + i) % ANSWER_TEMPLATES.length];
        const teacher = TEACHERS[(si + i) % TEACHERS.length];
        const answered = rng() < 0.55; // ~55% answered, rest pending
        const createdAt = new Date(Date.now() - (1 + Math.floor(rng() * 9)) * 86400000);
        const answeredAt = answered ? new Date(createdAt.getTime() + (3 + Math.floor(rng() * 18)) * 3600000) : null;
        await p.query(
          `INSERT INTO teacher_questions (learner_email, learner_name, subject, question, status, teacher_email, teacher_name, answer, created_at, answered_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [s.email, s.name, t.subject, t.question, answered ? 'answered' : 'pending',
           answered ? teacher.email : null, answered ? teacher.name : null, answered ? a : null,
           createdAt.toISOString(), answeredAt ? answeredAt.toISOString() : null]
        );
        tqCount++;
      }
    }
    console.log(`[db] demo cohort: seeded ${tqCount} teacher_questions`);
  }

  // 5d. Study sheets — a couple per student + one per teacher.
  const SHEET_TEMPLATES = [
    { title: 'Adding fractions — quick recipe',
      prompt: 'Explain step by step how to add 2/3 + 1/4 with a worked example.',
      answer: '## Adding fractions in 4 steps\n\n1. **Find the common denominator** — for 2/3 and 1/4 it is **12**.\n2. **Rewrite each fraction**: 2/3 = 8/12 and 1/4 = 3/12.\n3. **Add the numerators**: 8 + 3 = 11.\n4. **Keep the denominator**: result = **11/12**.\n\nIf the result can be simplified, do it — here it cannot.' },
    { title: 'Why simplify a fraction?',
      prompt: 'Why is 6/8 the same as 3/4?',
      answer: '6/8 and 3/4 represent the **same amount of pizza** — only the slices are cut differently.\n\nDivide top and bottom by their greatest common factor (here 2): 6 ÷ 2 = 3, 8 ÷ 2 = 4 → **3/4**.\n\nSimplifying makes the answer easier to compare and read.' },
    { title: 'Compare two fractions',
      prompt: 'How do I compare 5/8 and 7/12?',
      answer: 'Bring them to the **same denominator** (LCM of 8 and 12 is 24):\n\n- 5/8 = **15/24**\n- 7/12 = **14/24**\n\n15 > 14, so **5/8 > 7/12**.' }
  ];
  const TEACHER_SHEET_TEMPLATES = [
    { title: '30-min lesson plan — Year 7 fractions',
      prompt: 'Plan a 30-minute lesson on fractions for Year 7 aligned to Bildungsstandards.',
      answer: '## 30-min Year 7 lesson — *Adding fractions*\n\n| Time | Activity |\n|------|----------|\n| 0–5  | Warm-up: equivalent fractions on whiteboards |\n| 5–15 | Mini-lesson: common denominator with tape diagrams |\n| 15–25| Pair task: 6 worked examples (mixed difficulty) |\n| 25–30| Exit ticket: 2/3 + 1/4 — explain your reasoning |\n\n**Aligned to** Bildungsstandards K3 *Operieren mit Brüchen*.' }
  ];
  const sheetSeen = await p.query(`SELECT email FROM sheets WHERE email = ANY($1::text[]) GROUP BY email`, [[...DEMO_STUDENTS.map(s => s.email), ...TEACHERS.map(t => t.email)]]);
  const shDone = new Set((sheetSeen && sheetSeen.rows ? sheetSeen.rows : []).map(r => r.email));
  {
    let shCount = 0;
    for (let si = 0; si < DEMO_STUDENTS.length; si++) {
      const s = DEMO_STUDENTS[si];
      if (shDone.has(s.email)) continue;
      const rng = seededRand(s.email + '|sh');
      const nS = 1 + Math.floor(rng() * 2); // 1-2 sheets
      for (let i = 0; i < nS; i++) {
        const t = SHEET_TEMPLATES[(si + i) % SHEET_TEMPLATES.length];
        await p.query(
          `INSERT INTO sheets (email, role, app, title, prompt, answer)
           VALUES ($1,'student','student',$2,$3,$4)`,
          [s.email, t.title, t.prompt, t.answer]
        );
        shCount++;
      }
    }
    for (const t of TEACHERS) {
      if (shDone.has(t.email)) continue;
      const tpl = TEACHER_SHEET_TEMPLATES[0];
      await p.query(
        `INSERT INTO sheets (email, role, app, title, prompt, answer)
         VALUES ($1,'teacher','teacher',$2,$3,$4)`,
        [t.email, tpl.title, tpl.prompt, tpl.answer]
      );
      shCount++;
    }
    console.log(`[db] demo cohort: seeded ${shCount} study sheets`);
  }

  // 5e — one-shot normalization of legacy app values so /api/sheets (filtered by APP_ROLE) sees them.
  await p.query(`UPDATE sheets SET app='student' WHERE app='learner-web'`);
  await p.query(`UPDATE sheets SET app='teacher' WHERE app='teacher-console'`);
}

// Minimal CSV line parser: handles unquoted + double-quoted fields. No embedded newlines.
function parseCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"' && cur === '') { inQ = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

async function q(text, params) {
  if (!enabled) return null;
  const p = getPool();
  if (!p) return null;
  const initOk = await init();
  if (!initOk) return null;
  try {
    return await p.query(text, params);
  } catch (e) {
    console.error('[db] query failed:', e.message, '| sql:', text.slice(0, 80));
    return null;
  }
}

// --- Public helpers ---------------------------------------------------------

async function logConnection({ email, role, app, event, ip, userAgent, detail }) {
  await q(
    `INSERT INTO connection_logs (email, role, app, event, ip, user_agent, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [email || 'anonymous', role || 'unknown', app || APP, event, ip || null, (userAgent || '').slice(0, 256), (detail || '').slice(0, 256)]
  );
}

async function recordAuditEvent({ eventType, actorId, actorRole, targetType, targetId, scope, outcome, correlationId }) {
  await q(
    `INSERT INTO audit_event (event_type, actor_id, actor_role, target_type, target_id, scope, outcome, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [eventType, actorId || 'anonymous', actorRole || 'unknown', targetType, targetId, JSON.stringify(scope || {}), outcome || 'ok', correlationId || null]
  );
}

async function logDirectorPortalAccessAudit({ directorSubjectId, actorRole = 'director', scopeSnapshot, outcome = 'opened', correlationId = null }) {
  await recordAuditEvent({
    eventType: 'director_portal_access',
    actorId: String(directorSubjectId || '').toLowerCase() || 'anonymous',
    actorRole,
    targetType: 'director_portal',
    targetId: 'home',
    scope: scopeSnapshot || {},
    outcome,
    correlationId
  });
}

async function logDirectorReportUsageAudit({ directorSubjectId, actorRole = 'director', reportId, scopeSnapshot, outcome = 'opened', correlationId = null }) {
  await recordAuditEvent({
    eventType: 'director_report_usage',
    actorId: String(directorSubjectId || '').toLowerCase() || 'anonymous',
    actorRole,
    targetType: 'report',
    targetId: String(reportId || 'unknown_report'),
    scope: scopeSnapshot || {},
    outcome,
    correlationId
  });
}

async function logHierarchyChangeAudit({ actorId, actorRole = 'admin', learnerId, scopeSnapshot, outcome = 'recorded', correlationId = null }) {
  await recordAuditEvent({
    eventType: 'hierarchy_change',
    actorId: String(actorId || '').toLowerCase() || 'anonymous',
    actorRole,
    targetType: 'learner_hierarchy',
    targetId: String(learnerId || 'unknown_learner').toLowerCase(),
    scope: scopeSnapshot || {},
    outcome,
    correlationId
  });
}

async function logAsk({ email, role, app, prompt, answer, model, usage, latencyMs, status, error }) {
  const u = usage || {};
  const r = await q(
    `INSERT INTO ask_history (email, role, app, prompt, answer, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      email || 'anonymous', role || 'unknown', app || APP,
      String(prompt || '').slice(0, 4000),
      String(answer || '').slice(0, 20000),
      model || null,
      Number.isFinite(u.prompt_tokens) ? u.prompt_tokens : null,
      Number.isFinite(u.completion_tokens) ? u.completion_tokens : null,
      Number.isFinite(u.total_tokens) ? u.total_tokens : null,
      Number.isFinite(latencyMs) ? Math.round(latencyMs) : null,
      Number.isFinite(status) ? status : 200,
      error ? String(error).slice(0, 1000) : null
    ]
  );
  return r && r.rows[0] ? r.rows[0].id : null;
}

async function listLearnerHierarchyAssignments({ learnerId, asOf = new Date() } = {}) {
  const dateOnly = toDateOnly(asOf) || toDateOnly(new Date());
  const r = await q(
    `SELECT id, learner_id AS "learnerId", class_id AS "classId", school_id AS "schoolId", region_id AS "regionId",
            effective_from AS "effectiveFrom", effective_to AS "effectiveTo", source_system AS "sourceSystem",
            status, exception_flag AS "exceptionFlag", created_at AS "createdAt"
       FROM learner_hierarchy_assignment
      WHERE learner_id = $1 AND effective_from <= $2::date AND (effective_to IS NULL OR effective_to >= $2::date)
      ORDER BY effective_from DESC, created_at DESC`,
    [String(learnerId || '').toLowerCase(), dateOnly]
  );
  return r ? r.rows : null;
}

async function resolveLearnerHierarchy({ learnerId, asOf = new Date() } = {}) {
  const assignments = await listLearnerHierarchyAssignments({ learnerId, asOf });
  if (!assignments || assignments.length === 0) {
    return { status: 'missing', learnerId, assignment: null, assignments: [], exception: { issueType: 'missing_assignment', severity: 'high' } };
  }
  if (assignments.length > 1) {
    return { status: 'conflict', learnerId, assignment: null, assignments, exception: { issueType: 'conflicting_assignment', severity: 'high' } };
  }
  return { status: 'resolved', learnerId, assignment: assignments[0], assignments, exception: null };
}

async function listHierarchyRollups({ level = 'school', asOf = new Date() } = {}) {
  const dateOnly = toDateOnly(asOf) || toDateOnly(new Date());
  const levelColumn = level === 'class' ? 'class_id' : (level === 'region' ? 'region_id' : 'school_id');
  const r = await q(
    `WITH active_assignments AS (
       SELECT learner_id, class_id, school_id, region_id, exception_flag,
              ROW_NUMBER() OVER (
                PARTITION BY learner_id
                ORDER BY effective_from DESC, created_at DESC, id DESC
              ) AS rn
         FROM learner_hierarchy_assignment
        WHERE effective_from <= $1::date
          AND (effective_to IS NULL OR effective_to >= $1::date)
          AND status = 'active'
     )
     SELECT ${levelColumn} AS "scopeId",
            COUNT(*)::int AS "learnerCount",
            COUNT(DISTINCT learner_id)::int AS "distinctLearnerCount",
            SUM(CASE WHEN exception_flag THEN 1 ELSE 0 END)::int AS "exceptionCount"
       FROM active_assignments
      WHERE rn = 1
        AND ${levelColumn} IS NOT NULL
      GROUP BY ${levelColumn}
      ORDER BY ${levelColumn}`,
    [dateOnly]
  );
  return r ? r.rows : [];
}

async function getHierarchySummary({ asOf = new Date() } = {}) {
  const [classRows, schoolRows, regionRows, exceptions] = await Promise.all([
    listHierarchyRollups({ level: 'class', asOf }),
    listHierarchyRollups({ level: 'school', asOf }),
    listHierarchyRollups({ level: 'region', asOf }),
    listHierarchyExceptions({ status: 'open' })
  ]);
  return {
    asOf: toDateOnly(asOf) || toDateOnly(new Date()),
    class: classRows || [],
    school: schoolRows || [],
    region: regionRows || [],
    openExceptions: exceptions || []
  };
}

async function writeHierarchyException({ learnerId, issueType, issueDetail, severity = 'medium', status = 'open', resolvedBy = null }) {
  const r = await q(
    `INSERT INTO hierarchy_exception (learner_id, issue_type, issue_detail, severity, status, resolved_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, learner_id AS "learnerId", issue_type AS "issueType", issue_detail AS "issueDetail", severity, status, detected_at AS "detectedAt", resolved_at AS "resolvedAt", resolved_by AS "resolvedBy"`,
    [String(learnerId || '').toLowerCase(), issueType, issueDetail, severity, status, resolvedBy]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listHierarchyExceptions({ learnerId, status } = {}) {
  const params = [];
  const where = [];
  if (learnerId) {
    params.push(String(learnerId).toLowerCase());
    where.push(`learner_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const r = await q(
    `SELECT id, learner_id AS "learnerId", issue_type AS "issueType", issue_detail AS "issueDetail",
            severity, detected_at AS "detectedAt", status, resolved_at AS "resolvedAt", resolved_by AS "resolvedBy"
       FROM hierarchy_exception ${clause}
      ORDER BY detected_at DESC, id DESC`,
    params
  );
  return r ? r.rows : null;
}

async function listReportingScopeForDirector({ directorSubjectId, asOf = new Date() } = {}) {
  const ts = toTimestamp(asOf) || toTimestamp(new Date());
  const r = await q(
    `SELECT id, director_subject_id AS "directorSubjectId", school_id AS "schoolId", region_id AS "regionId",
            role, effective_from AS "effectiveFrom", effective_to AS "effectiveTo", granted_by AS "grantedBy",
            granted_at AS "grantedAt", status
       FROM reporting_scope
      WHERE director_subject_id = $1 AND effective_from <= $2::timestamptz AND (effective_to IS NULL OR effective_to >= $2::timestamptz)
      ORDER BY school_id NULLS LAST, region_id NULLS LAST, granted_at DESC`,
    [String(directorSubjectId || '').toLowerCase(), ts]
  );
  return r ? r.rows : null;
}

async function resolveDirectorScope({ directorSubjectId, asOf = new Date() } = {}) {
  const rows = await listReportingScopeForDirector({ directorSubjectId, asOf });
  const schoolIds = rows ? rows.map(row => row.schoolId).filter(Boolean) : [];
  const regionIds = rows ? rows.map(row => row.regionId).filter(Boolean) : [];
  return {
    directorSubjectId: String(directorSubjectId || '').toLowerCase(),
    schoolIds: normalizeList(schoolIds),
    regionIds: normalizeList(regionIds),
    assignments: rows || [],
    granted: Boolean((schoolIds && schoolIds.length) || (regionIds && regionIds.length))
  };
}

async function recordDirectorPortalSession({ directorSubjectId, role = 'director', scopeSnapshot, reportId = null, outcome = 'opened', correlationId = null }) {
  const r = await q(
    `INSERT INTO director_portal_session (director_subject_id, role, scope_snapshot, report_id, outcome, correlation_id)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING session_id AS "sessionId", director_subject_id AS "directorSubjectId", role, scope_snapshot AS "scopeSnapshot", opened_at AS "openedAt", report_id AS "reportId", outcome, correlation_id AS "correlationId"`,
    [String(directorSubjectId || '').toLowerCase(), role, JSON.stringify(scopeSnapshot || {}), reportId, outcome, correlationId]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listEmbeddedReportReferences({ approvedOnly = true } = {}) {
  const r = await q(
    `SELECT report_id AS "reportId", workspace_id AS "workspaceId", dataset_id AS "datasetId", display_name AS "displayName",
            allowed_scope_dimensions AS "allowedScopeDimensions", aggregation_level AS "aggregationLevel",
            sensitivity_label AS "sensitivityLabel", is_approved AS "isApproved", created_at AS "createdAt"
       FROM embedded_report_reference
      ${approvedOnly ? 'WHERE is_approved = true' : ''}
      ORDER BY aggregation_level, display_name`
  );
  return r ? r.rows : null;
}

// --- Reference data (seeded from packaged files) ---------------------------

async function listCurricula({ country, subject } = {}) {
  const conds = []; const params = [];
  if (country) { params.push(country); conds.push(`country = $${params.length}`); }
  if (subject) { params.push(subject); conds.push(`subject = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(`SELECT id, country, framework, grade, subject, version, title, description FROM curricula ${where} ORDER BY country, id`, params);
  return r ? r.rows : null;
}

async function listGlossary({ language } = {}) {
  const params = []; let where = '';
  if (language) { params.push(language); where = 'WHERE language = $1'; }
  const r = await q(`SELECT source, target, context, language FROM glossary_terms ${where} ORDER BY language, source`, params);
  return r ? r.rows : null;
}

async function summariseLearners() {
  const r = await q(`SELECT market, grade, COUNT(*)::int AS count, ROUND(AVG(decile)::numeric, 2)::float AS avg_decile, SUM(CASE WHEN sen THEN 1 ELSE 0 END)::int AS sen_count FROM learners GROUP BY market, grade ORDER BY market, grade`);
  return r ? r.rows : null;
}

async function pickRandomLearner({ market } = {}) {
  const params = []; let where = '';
  if (market) { params.push(market); where = 'WHERE market = $1'; }
  const r = await q(`SELECT learner_id, pseudonym, market, grade, decile, sen FROM learners ${where} ORDER BY random() LIMIT 1`, params);
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- Adaptive item attempts (ONNX feedback loop) ---------------------------

async function logItemAttempt({ email, pseudonym, itemId, difficulty, predicted, correct, latencyMs }) {
  await q(
    `INSERT INTO item_attempts (email, pseudonym, item_id, difficulty, predicted, correct, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [email || 'anonymous', pseudonym || null, String(itemId), Number.isFinite(difficulty) ? difficulty : null, Number.isFinite(predicted) ? predicted : null, Boolean(correct), Number.isFinite(latencyMs) ? Math.round(latencyMs) : null]
  );
}

async function recentAttempts({ email, limit = 50 }) {
  const r = await q(`SELECT item_id, difficulty, predicted, correct, latency_ms, created_at FROM item_attempts WHERE email = $1 ORDER BY created_at DESC LIMIT $2`, [email, limit]);
  return r ? r.rows : null;
}

async function attemptStats() {
  const r = await q(`SELECT email, COUNT(*)::int AS total, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int AS correct, ROUND(AVG(predicted)::numeric, 3)::float AS avg_predicted FROM item_attempts GROUP BY email ORDER BY total DESC LIMIT 100`);
  return r ? r.rows : null;
}

// --- Content Safety verdicts -----------------------------------------------

async function logContentSafety({ askId, email, app, direction, blocked, severities, raw }) {
  const sev = severities || {};
  await q(
    `INSERT INTO content_safety_results (ask_id, email, app, direction, blocked, hate, self_harm, sexual, violence, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [askId || null, email || 'anonymous', app || APP, direction, Boolean(blocked),
      Number.isFinite(sev.Hate) ? sev.Hate : null,
      Number.isFinite(sev.SelfHarm) ? sev.SelfHarm : null,
      Number.isFinite(sev.Sexual) ? sev.Sexual : null,
      Number.isFinite(sev.Violence) ? sev.Violence : null,
      raw ? JSON.stringify(raw) : null]
  );
}

async function listSheets({ email, app }) {
  const r = await q(
    `SELECT id, title, created_at FROM sheets WHERE email = $1 AND app = $2 ORDER BY created_at DESC LIMIT 100`,
    [email, app || APP]
  );
  return r ? r.rows.map(row => ({ id: row.id, title: row.title, createdAt: row.created_at.toISOString() })) : null;
}

async function getSheet({ id, email }) {
  const r = await q(
    `SELECT id, title, prompt, answer, created_at FROM sheets WHERE id = $1 AND email = $2`,
    [id, email]
  );
  if (!r || r.rows.length === 0) return null;
  const row = r.rows[0];
  return { id: row.id, title: row.title, prompt: row.prompt, answer: row.answer, createdAt: row.created_at.toISOString() };
}

async function createSheet({ email, role, app, title, prompt, answer }) {
  const r = await q(
    `INSERT INTO sheets (email, role, app, title, prompt, answer)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, prompt, answer, created_at`,
    [email, role || 'unknown', app || APP, String(title || '').slice(0, 120), String(prompt || '').slice(0, 2000), String(answer || '').slice(0, 20000)]
  );
  if (!r || r.rows.length === 0) return null;
  const row = r.rows[0];
  return { id: row.id, title: row.title, prompt: row.prompt, answer: row.answer, createdAt: row.created_at.toISOString() };
}

async function deleteSheet({ id, email }) {
  const r = await q(`DELETE FROM sheets WHERE id = $1 AND email = $2`, [id, email]);
  return Boolean(r && r.rowCount > 0);
}

// Force a re-seed and return inserted-row counts + the data dir used. Intended for the admin /api/data/reseed endpoint.
async function reseedReferenceData() {
  if (!enabled) return { enabled: false };
  // Best-effort: ensure schema is applied first (idempotent).
  try { await init(); } catch (_) {}
  const p = getPool();
  if (!p) return { enabled: false };
  const dataDir = path.join(__dirname, '..', 'data');
  const exists = fs.existsSync(dataDir);
  const safeCount = async (table) => {
    try { return (await p.query(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0].n; }
    catch (e) { return `err:${(e && e.message || e).toString().slice(0,120)}`; }
  };
  const before = {
    curricula: await safeCount('curricula'),
    glossary: await safeCount('glossary_terms'),
    learners: await safeCount('learners')
  };
  let error = null;
  try { await seedReferenceData(p); } catch (e) { error = String(e && e.message || e); }
  const after = {
    curricula: await safeCount('curricula'),
    glossary: await safeCount('glossary_terms'),
    learners: await safeCount('learners')
  };
  return { enabled: true, dataDir, dataDirExists: exists, before, after, error };
}

// --- Teacher Q&A (learner ↔ teacher async messaging) -----------------------

async function createTeacherQuestion({ learnerEmail, learnerName, subject, question }) {
  const r = await q(
    `INSERT INTO teacher_questions (learner_email, learner_name, subject, question)
     VALUES ($1, $2, $3, $4)
     RETURNING id, learner_email, learner_name, subject, question, status, teacher_email, teacher_name, answer, created_at, answered_at`,
    [learnerEmail, learnerName || null, String(subject || '').slice(0, 200), String(question || '').slice(0, 4000)]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listTeacherQuestionsForLearner({ learnerEmail, limit = 50 }) {
  const r = await q(
    `SELECT id, learner_email, learner_name, subject, question, status, teacher_email, teacher_name, answer, created_at, answered_at
     FROM teacher_questions WHERE learner_email = $1 ORDER BY created_at DESC LIMIT $2`,
    [learnerEmail, limit]
  );
  return r ? r.rows : null;
}

async function listTeacherQuestionsInbox({ status, limit = 100 } = {}) {
  const params = []; let where = '';
  if (status) { params.push(status); where = `WHERE status = $${params.length}`; }
  params.push(limit);
  const r = await q(
    `SELECT id, learner_email, learner_name, subject, question, status, teacher_email, teacher_name, answer, created_at, answered_at
     FROM teacher_questions ${where} ORDER BY (status = 'pending') DESC, created_at DESC LIMIT $${params.length}`,
    params
  );
  return r ? r.rows : null;
}

async function answerTeacherQuestion({ id, teacherEmail, teacherName, answer }) {
  const r = await q(
    `UPDATE teacher_questions
       SET answer = $1, teacher_email = $2, teacher_name = $3, status = 'answered', answered_at = now()
       WHERE id = $4
     RETURNING id, learner_email, learner_name, subject, question, status, teacher_email, teacher_name, answer, created_at, answered_at`,
    [String(answer || '').slice(0, 8000), teacherEmail, teacherName || null, id]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- Skills progression (Feature 1) ----------------------------------------

// Upsert one (email, skill_id) row by recomputing counters from item_attempts.
// Called from /api/learner/attempt right after logItemAttempt.
async function bumpSkillMasteryFromAttempt({ email, itemId }) {
  // Find every skill linked to this item (usually 1, but the schema allows N).
  const rs = await q(`SELECT skill_id FROM item_skills WHERE item_id = $1`, [itemId]);
  if (!rs || rs.rows.length === 0) return [];
  const updated = [];
  for (const { skill_id } of rs.rows) {
    const r = await q(
      `WITH agg AS (
         SELECT COUNT(*)::int AS attempts,
                SUM(CASE WHEN ia.correct THEN 1 ELSE 0 END)::int AS correct,
                MAX(ia.created_at) AS last_seen
         FROM item_attempts ia
         JOIN item_skills isk ON isk.item_id = ia.item_id
         WHERE ia.email = $1 AND isk.skill_id = $2
       )
       INSERT INTO skill_mastery (email, skill_id, attempts, correct, level, last_seen, updated_at)
       SELECT $1, $2, agg.attempts, agg.correct,
              CASE WHEN agg.attempts > 0 THEN agg.correct::real / agg.attempts::real ELSE 0 END,
              agg.last_seen, now()
       FROM agg
       ON CONFLICT (email, skill_id) DO UPDATE
         SET attempts = EXCLUDED.attempts,
             correct = EXCLUDED.correct,
             level = EXCLUDED.level,
             last_seen = EXCLUDED.last_seen,
             updated_at = now()
       RETURNING email, skill_id, attempts, correct, level, last_seen`,
      [email, skill_id]
    );
    if (r && r.rows[0]) updated.push(r.rows[0]);
  }
  return updated;
}

async function bumpDailyActivity({ email, correct }) {
  await q(
    `INSERT INTO learner_activity (email, day, attempts, correct, updated_at)
     VALUES ($1, CURRENT_DATE, 1, CASE WHEN $2 THEN 1 ELSE 0 END, now())
     ON CONFLICT (email, day) DO UPDATE
       SET attempts = learner_activity.attempts + 1,
           correct = learner_activity.correct + CASE WHEN $2 THEN 1 ELSE 0 END,
           updated_at = now()`,
    [email, Boolean(correct)]
  );
}

async function listMasteryForLearner({ email, limit = 24 }) {
  const r = await q(
    `SELECT s.id AS "skillId", s.label, s.domain, s.chapter, s.difficulty, s.bloom,
            COALESCE(m.attempts, 0)::int AS attempts,
            COALESCE(m.correct, 0)::int AS correct,
            COALESCE(m.level, 0)::float AS level,
            m.last_seen AS "lastSeen"
       FROM skills s
       LEFT JOIN skill_mastery m ON m.skill_id = s.id AND m.email = $1
      ORDER BY s.chapter, s.difficulty, s.id
      LIMIT $2`,
    [email, limit]
  );
  return r ? r.rows : null;
}

async function listClassMastery({ limit = 50 } = {}) {
  const r = await q(
    `SELECT s.id AS "skillId", s.label, s.domain,
            COUNT(m.email)::int AS learners,
            COALESCE(AVG(m.level), 0)::float AS "avgLevel",
            SUM(CASE WHEN m.level >= 0.85 THEN 1 ELSE 0 END)::int AS mastered,
            SUM(CASE WHEN m.level >= 0.65 AND m.level < 0.85 THEN 1 ELSE 0 END)::int AS proficient,
            SUM(CASE WHEN m.level >= 0.40 AND m.level < 0.65 THEN 1 ELSE 0 END)::int AS practising,
            SUM(CASE WHEN m.level < 0.40 THEN 1 ELSE 0 END)::int AS beginner,
            COALESCE(SUM(m.attempts), 0)::int AS "totalAttempts"
       FROM skills s
       LEFT JOIN skill_mastery m ON m.skill_id = s.id
      GROUP BY s.id, s.label, s.domain, s.difficulty
      ORDER BY s.difficulty
      LIMIT $1`,
    [limit]
  );
  return r ? r.rows : null;
}

// Heat-map (Feature 5a). Returns { skills: [...], learners: [{email, pseudonym}], cells: { "email|skillId": {level, attempts, override} } }.
// Only learners that have at least one attempt are included; pseudonym is derived from the learner's
// synthetic profile (joined via pseudonym column on item_attempts) or fall back to a pseudonymised
// hash of the email (so PII is never sent to the teacher UI).
async function getClassHeatmap({ skillLimit = 24, learnerLimit = 30 } = {}) {
  const skillsR = await q(
    `SELECT id AS "skillId", label, chapter, domain, difficulty
       FROM skills ORDER BY chapter, difficulty, id LIMIT $1`,
    [skillLimit]
  );
  if (!skillsR) return null;
  const learnersR = await q(
    `SELECT m.email,
            COALESCE(MAX(NULLIF(ia.pseudonym, '')), 'L-' || substr(md5(m.email), 1, 6)) AS pseudonym,
            SUM(m.attempts)::int AS "totalAttempts"
       FROM skill_mastery m
       LEFT JOIN item_attempts ia ON ia.email = m.email
      GROUP BY m.email
      ORDER BY SUM(m.attempts) DESC
      LIMIT $1`,
    [learnerLimit]
  );
  if (!learnersR) return null;
  const cellsR = await q(
    `SELECT email, skill_id AS "skillId", level::float AS level, attempts::int AS attempts
       FROM skill_mastery
      WHERE email = ANY($1::text[])
        AND skill_id = ANY($2::text[])`,
    [learnersR.rows.map(r => r.email), skillsR.rows.map(r => r.skillId)]
  );
  if (!cellsR) return null;
  // Latest override per (learner, skill) pair.
  const overR = await q(
    `SELECT DISTINCT ON (learner_email, skill_id)
            learner_email AS "learnerEmail", skill_id AS "skillId", human_level::float AS "humanLevel",
            ai_level::float AS "aiLevel", teacher_email AS "teacherEmail", rationale, created_at AS "createdAt"
       FROM teacher_overrides
      WHERE learner_email = ANY($1::text[]) AND skill_id = ANY($2::text[])
      ORDER BY learner_email, skill_id, created_at DESC`,
    [learnersR.rows.map(r => r.email), skillsR.rows.map(r => r.skillId)]
  );
  const cells = {};
  for (const c of cellsR.rows) {
    cells[c.email + '|' + c.skillId] = { level: c.level, attempts: c.attempts, override: null };
  }
  if (overR) {
    for (const o of overR.rows) {
      const k = o.learnerEmail + '|' + o.skillId;
      if (!cells[k]) cells[k] = { level: 0, attempts: 0, override: null };
      cells[k].override = { humanLevel: o.humanLevel, aiLevel: o.aiLevel, teacherEmail: o.teacherEmail, rationale: o.rationale, createdAt: o.createdAt };
    }
  }
  return { skills: skillsR.rows, learners: learnersR.rows, cells };
}

// Record a teacher override (Feature 5a). Returns { id, createdAt } or null.
async function recordTeacherOverride({ teacherEmail, learnerEmail, skillId, aiLevel, humanLevel, rationale }) {
  const r = await q(
    `INSERT INTO teacher_overrides (teacher_email, learner_email, skill_id, ai_level, human_level, rationale)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at AS "createdAt"`,
    [teacherEmail, learnerEmail, skillId, aiLevel, humanLevel, rationale || null]
  );
  return r ? r.rows[0] : null;
}

// Recent overrides for the audit feed.
async function listTeacherOverrides({ learner, skill, limit = 50 } = {}) {
  const conds = [];
  const params = [];
  if (learner) { params.push(learner); conds.push('learner_email = $' + params.length); }
  if (skill)   { params.push(skill);   conds.push('skill_id = $' + params.length); }
  const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
  params.push(limit);
  const r = await q(
    `SELECT o.id, o.teacher_email AS "teacherEmail", o.learner_email AS "learnerEmail",
            o.skill_id AS "skillId", s.label AS "skillLabel",
            o.ai_level::float AS "aiLevel", o.human_level::float AS "humanLevel",
            o.rationale, o.created_at AS "createdAt",
            COALESCE(NULLIF((SELECT MAX(NULLIF(pseudonym,'')) FROM item_attempts WHERE email = o.learner_email), ''),
                     'L-' || substr(md5(o.learner_email), 1, 6)) AS "learnerPseudonym"
       FROM teacher_overrides o
       LEFT JOIN skills s ON s.id = o.skill_id
       ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length}`,
    params
  );
  return r ? r.rows : null;
}

// Parent → child links (Feature 6). All read-only.
async function listChildrenForParent({ parentEmail }) {
  const r = await q(
    `SELECT child_email AS "childEmail", relationship, created_at AS "createdAt"
       FROM parent_links WHERE parent_email = $1 ORDER BY created_at`,
    [String(parentEmail).toLowerCase()]
  );
  return r ? r.rows : null;
}
async function isParentOfChild({ parentEmail, childEmail }) {
  const r = await q(
    `SELECT 1 FROM parent_links WHERE parent_email = $1 AND child_email = $2 LIMIT 1`,
    [String(parentEmail).toLowerCase(), String(childEmail).toLowerCase()]
  );
  return !!(r && r.rows && r.rows.length);
}
async function listParentsForChild({ childEmail }) {
  const r = await q(
    `SELECT parent_email AS "parentEmail", relationship FROM parent_links WHERE child_email = $1 ORDER BY created_at`,
    [String(childEmail).toLowerCase()]
  );
  return r ? r.rows : null;
}
async function listTeacherQuestionsForLearnerReadOnly({ childEmail, limit = 20 }) {
  // Reuse the existing helper but in a parent-safe shape (drop sensitive fields if any).
  return listTeacherQuestionsForLearner({ learnerEmail: childEmail, limit });
}

async function listLearnerActivity({ email, days = 30 }) {
  const r = await q(
    `SELECT day::text AS day, attempts, correct
       FROM learner_activity
      WHERE email = $1 AND day >= CURRENT_DATE - ($2::int - 1)
      ORDER BY day DESC`,
    [email, days]
  );
  return r ? r.rows : null;
}

// Streak + totals + badges (Feature 4). Returns null if DB unavailable.
async function getLearnerStreak({ email, windowDays = 30 }) {
  const rows = await listLearnerActivity({ email, days: windowDays });
  if (!rows) return null;
  const byDay = new Map(rows.map(r => [r.day, r]));
  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  // Streak counts back from today; if today has no attempts yet we forgive that one day.
  let streak = 0;
  let cursor = new Date(today);
  if (!byDay.has(iso(cursor)) || (byDay.get(iso(cursor)).attempts | 0) === 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  for (let i = 0; i < windowDays; i++) {
    const k = iso(cursor);
    const d = byDay.get(k);
    if (d && (d.attempts | 0) > 0) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else { break; }
  }
  const totalAttempts = rows.reduce((s, r) => s + (r.attempts | 0), 0);
  const totalCorrect  = rows.reduce((s, r) => s + (r.correct  | 0), 0);
  const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  // Mastery snapshot for badges.
  const m = await q(
    `SELECT COUNT(*) FILTER (WHERE level >= 0.7)::int AS mastered,
            COUNT(*)::int AS skills_seen
       FROM skill_mastery WHERE email = $1`,
    [email]
  );
  const mastered    = m && m.rows[0] ? (m.rows[0].mastered    | 0) : 0;
  const skillsSeen  = m && m.rows[0] ? (m.rows[0].skills_seen | 0) : 0;
  const badges = [];
  if (totalAttempts >= 1)  badges.push({ id: 'beginner',     label: 'Beginner',          hint: 'First answer recorded' });
  if (totalAttempts >= 10) badges.push({ id: 'reviewer',     label: 'Reviewer',          hint: '10+ attempts in 30 days' });
  if (streak >= 3)         badges.push({ id: 'on_fire',      label: 'On fire (3-day)',   hint: 'Practised 3 days in a row' });
  if (streak >= 7)         badges.push({ id: 'week_streak',  label: 'Week streak',       hint: '7-day practice streak' });
  if (mastered >= 3)       badges.push({ id: 'mastered_3',   label: 'Mastered x3',       hint: '3 skills at 70%+ mastery' });
  if (totalAttempts >= 10 && accuracy >= 0.8) badges.push({ id: 'sharpshooter', label: 'Sharpshooter', hint: '80%+ accuracy over 10+ attempts' });
  return { streak, totalAttempts, totalCorrect, accuracy, mastered, skillsSeen, badges, windowDays };
}

// Class-wide badge roster for the teacher gamification view (Feature 4 visibility).
// Returns one row per learner with their earned badges. Learners are pseudonymised
// (no raw email leaves the server) so the teacher UI shows opaque identifiers only.
async function listClassBadges({ limit = 30 } = {}) {
  const lr = await q(
    `SELECT m.email,
            COALESCE(MAX(NULLIF(ia.pseudonym, '')), 'L-' || substr(md5(m.email), 1, 6)) AS pseudonym,
            SUM(m.attempts)::int AS attempts
       FROM skill_mastery m
       LEFT JOIN item_attempts ia ON ia.email = m.email
      GROUP BY m.email
      ORDER BY SUM(m.attempts) DESC
      LIMIT $1`,
    [limit]
  );
  if (!lr) return null;
  const out = [];
  for (const row of lr.rows) {
    const s = await getLearnerStreak({ email: row.email });
    const badges = s ? s.badges : [];
    out.push({
      email: row.pseudonym,
      displayName: row.pseudonym,
      badges,
      badgeCount: badges.length,
      lastEarnedAt: null
    });
  }
  return out;
}

// --- Parental consent (GDPR Art. 8) ----------------------------------------

async function getConsentsForParent({ parentEmail }) {
  const r = await q(
    `SELECT id, parent_email, child_email, consent_type, granted, granted_at, withdrawn_at, ip, user_agent, created_at, updated_at
       FROM parental_consents WHERE parent_email = $1 ORDER BY created_at`,
    [String(parentEmail).toLowerCase()]
  );
  return r ? r.rows : null;
}

async function upsertConsent({ parentEmail, childEmail, consentType, granted, ip, userAgent, disclosureVersion }) {
  const pEmail = String(parentEmail).toLowerCase();
  const cEmail = String(childEmail).toLowerCase();
  const cType = consentType || 'gdpr_art8';
  const dVer = disclosureVersion || CONSENT_DISCLOSURE_VERSION;
  let r;
  if (granted) {
    r = await q(
      `INSERT INTO parental_consents (parent_email, child_email, consent_type, granted, granted_at, ip, user_agent, disclosure_version, updated_at)
       VALUES ($1, $2, $3, true, now(), $4, $5, $6, now())
       ON CONFLICT (parent_email, child_email, consent_type) DO UPDATE
         SET granted = true, granted_at = now(), withdrawn_at = NULL, ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent, disclosure_version = EXCLUDED.disclosure_version, updated_at = now()
       RETURNING *`,
      [pEmail, cEmail, cType, ip || null, (userAgent || '').slice(0, 256), dVer]
    );
  } else {
    r = await q(
      `INSERT INTO parental_consents (parent_email, child_email, consent_type, granted, withdrawn_at, ip, user_agent, disclosure_version, updated_at)
       VALUES ($1, $2, $3, false, now(), $4, $5, $6, now())
       ON CONFLICT (parent_email, child_email, consent_type) DO UPDATE
         SET granted = false, withdrawn_at = now(), ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent, disclosure_version = EXCLUDED.disclosure_version, updated_at = now()
       RETURNING *`,
      [pEmail, cEmail, cType, ip || null, (userAgent || '').slice(0, 256), dVer]
    );
  }
  return r && r.rows[0] ? r.rows[0] : null;
}

async function hasActiveConsentForLearner({ childEmail }) {
  const r = await q(
    `SELECT 1 FROM parental_consents
     WHERE child_email = $1 AND consent_type = 'gdpr_art8' AND granted = true AND withdrawn_at IS NULL
     LIMIT 1`,
    [String(childEmail).toLowerCase()]
  );
  return !!(r && r.rows && r.rows.length);
}

// --- Consent requests: token issuance, expiry, versioned recording (US3, T037) -----------

// Create (or reuse) a pending consent request for a parent↔child pair. Idempotent: if an
// unexpired pending request already exists it is returned unchanged so we never spam links.
async function createConsentRequest({ parentEmail, childEmail, consentType, ttlDays, disclosureVersion }) {
  const pEmail = String(parentEmail).toLowerCase();
  const cEmail = String(childEmail).toLowerCase();
  const cType = consentType || 'gdpr_art8';
  const dVer = disclosureVersion || CONSENT_DISCLOSURE_VERSION;
  const ttl = Number.isFinite(Number(ttlDays)) && Number(ttlDays) > 0 ? Number(ttlDays) : CONSENT_TTL_DAYS;
  // First retire any stale (expired) pending rows so the lookup below is accurate.
  await q(
    `UPDATE consent_requests SET status = 'expired'
       WHERE child_email = $1 AND parent_email = $2 AND consent_type = $3
         AND status = 'pending' AND expires_at < now()`,
    [cEmail, pEmail, cType]
  );
  const existing = await q(
    `SELECT * FROM consent_requests
       WHERE child_email = $1 AND parent_email = $2 AND consent_type = $3
         AND status = 'pending' AND expires_at >= now()
       ORDER BY requested_at DESC LIMIT 1`,
    [cEmail, pEmail, cType]
  );
  if (existing && existing.rows && existing.rows[0]) return existing.rows[0];
  const token = crypto.randomBytes(24).toString('hex');
  const r = await q(
    `INSERT INTO consent_requests (token, parent_email, child_email, consent_type, disclosure_version, status, requested_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', now(), now() + ($6 || ' days')::interval)
     RETURNING *`,
    [token, pEmail, cEmail, cType, dVer, String(ttl)]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Look up a request by its opaque token; flags whether it has expired (pending past TTL).
async function getConsentRequestByToken({ token }) {
  const r = await q(
    `SELECT *, (status = 'pending' AND expires_at < now()) AS is_expired
       FROM consent_requests WHERE token = $1 LIMIT 1`,
    [String(token || '')]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Resolve a pending request with an explicit parent decision. Validates token + expiry,
// records the versioned consent on grant, and stamps evidence (ip/user_agent/resolved_at).
async function resolveConsentRequest({ token, decision, ip, userAgent }) {
  const req = await getConsentRequestByToken({ token });
  if (!req) return { ok: false, reason: 'not_found' };
  if (req.status === 'granted' || req.status === 'declined') return { ok: false, reason: 'already_resolved', request: req };
  if (req.status === 'expired' || req.is_expired) {
    if (req.status !== 'expired') {
      await q(`UPDATE consent_requests SET status = 'expired' WHERE id = $1`, [req.id]);
    }
    return { ok: false, reason: 'expired', request: req };
  }
  const grant = decision === 'granted';
  const ua = (userAgent || '').slice(0, 256);
  const upd = await q(
    `UPDATE consent_requests
        SET status = $2, resolved_at = now(), ip = $3, user_agent = $4
      WHERE id = $1 AND status = 'pending'
      RETURNING *`,
    [req.id, grant ? 'granted' : 'declined', ip || null, ua]
  );
  const request = upd && upd.rows[0] ? upd.rows[0] : req;
  let consent = null;
  if (grant) {
    consent = await upsertConsent({
      parentEmail: req.parent_email,
      childEmail: req.child_email,
      consentType: req.consent_type,
      granted: true,
      ip, userAgent: ua,
      disclosureVersion: req.disclosure_version
    });
  }
  return { ok: true, decision: grant ? 'granted' : 'declined', request, consent };
}

// Pending requests still unresolved and not yet reminded after `reminderAfterDays` (default 6).
async function listConsentRequestsNeedingReminder({ reminderAfterDays } = {}) {
  const days = Number.isFinite(Number(reminderAfterDays)) ? Number(reminderAfterDays) : 6;
  const r = await q(
    `SELECT * FROM consent_requests
       WHERE status = 'pending' AND reminded_at IS NULL
         AND requested_at <= now() - ($1 || ' days')::interval
         AND expires_at >= now()
       ORDER BY requested_at ASC`,
    [String(days)]
  );
  return r ? r.rows : [];
}

async function markConsentRequestReminded({ id }) {
  const r = await q(
    `UPDATE consent_requests SET reminded_at = now() WHERE id = $1 RETURNING id, reminded_at`,
    [Number(id)]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Sweep: mark any pending requests past their TTL as expired. Returns the count expired.
async function expireStaleConsentRequests() {
  const r = await q(
    `UPDATE consent_requests SET status = 'expired'
       WHERE status = 'pending' AND expires_at < now()
       RETURNING id`
  );
  return r ? r.rowCount : 0;
}

// All consent requests for a parent (history + pending), newest first.
async function listConsentRequestsForParent({ parentEmail }) {
  const r = await q(
    `SELECT id, token, child_email, consent_type, disclosure_version, status,
            requested_at, expires_at, reminded_at, resolved_at,
            (status = 'pending' AND expires_at < now()) AS is_expired
       FROM consent_requests WHERE parent_email = $1 ORDER BY requested_at DESC`,
    [String(parentEmail).toLowerCase()]
  );
  return r ? r.rows : [];
}

// --- Parent portal: messaging (Feature 6, US2) -----------------------------
// Stable thread id for a parent ↔ teacher conversation about one child.
function parentThreadId({ parentEmail, childEmail, classId }) {
  const p = String(parentEmail || '').toLowerCase();
  const c = String(childEmail || '').toLowerCase();
  return classId ? `class:${classId}` : `pc:${p}|${c}`;
}

async function createParentMessage({ threadId, senderEmail, senderRole, recipientEmail, childEmail, classId, subject, body, csVerdict, csSeverities, deliveryState }) {
  const r = await q(
    `INSERT INTO parent_messages
       (thread_id, sender_email, sender_role, recipient_email, child_email, class_id, subject, body, cs_verdict, cs_severities, delivery_state)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
     RETURNING *`,
    [
      String(threadId), String(senderEmail).toLowerCase(), String(senderRole),
      recipientEmail ? String(recipientEmail).toLowerCase() : null,
      childEmail ? String(childEmail).toLowerCase() : null,
      classId || null, subject ? String(subject).slice(0, 200) : null,
      String(body).slice(0, 4000), csVerdict || 'clean',
      JSON.stringify(csSeverities || {}), deliveryState || 'delivered'
    ]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Messages in a thread, optionally only those visible to a non-moderator (delivered + own).
async function listParentThread({ threadId, viewerEmail, includeQuarantined = false, limit = 100 }) {
  const params = [String(threadId)];
  let where = `thread_id = $1`;
  if (!includeQuarantined) {
    params.push(String(viewerEmail || '').toLowerCase());
    where += ` AND (delivery_state = 'delivered' OR sender_email = $${params.length})`;
  }
  params.push(Math.min(Number(limit) || 100, 200));
  const r = await q(
    `SELECT id, thread_id, sender_email, sender_role, recipient_email, child_email, class_id,
            subject, body, cs_verdict, delivery_state, moderated_by, moderated_at, read_at, created_at
       FROM parent_messages WHERE ${where} ORDER BY created_at ASC LIMIT $${params.length}`,
    params
  );
  return r ? r.rows : null;
}

// A parent's inbox: latest delivered message per thread + unread count.
async function listParentInbox({ recipientEmail, limit = 50 }) {
  const r = await q(
    `SELECT DISTINCT ON (thread_id)
            id, thread_id, sender_email, sender_role, child_email, class_id, subject, body,
            delivery_state, read_at, created_at
       FROM parent_messages
      WHERE recipient_email = $1 AND delivery_state = 'delivered'
      ORDER BY thread_id, created_at DESC
      LIMIT $2`,
    [String(recipientEmail).toLowerCase(), Math.min(Number(limit) || 50, 200)]
  );
  return r ? r.rows : null;
}

async function countUnreadParentMessages({ recipientEmail }) {
  const r = await q(
    `SELECT COUNT(*)::int AS unread FROM parent_messages
      WHERE recipient_email = $1 AND delivery_state = 'delivered' AND read_at IS NULL`,
    [String(recipientEmail).toLowerCase()]
  );
  return r && r.rows[0] ? (r.rows[0].unread | 0) : 0;
}

async function markParentMessageRead({ id, recipientEmail }) {
  const r = await q(
    `UPDATE parent_messages SET read_at = now()
      WHERE id = $1 AND recipient_email = $2 AND read_at IS NULL
      RETURNING id, read_at`,
    [Number(id), String(recipientEmail).toLowerCase()]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Teacher moderation queue: quarantined (flagged) messages awaiting a decision.
async function listParentModerationQueue({ limit = 100 }) {
  const r = await q(
    `SELECT id, thread_id, sender_email, sender_role, recipient_email, child_email, class_id,
            subject, body, cs_verdict, cs_severities, delivery_state, created_at
       FROM parent_messages WHERE delivery_state = 'quarantined'
      ORDER BY created_at ASC LIMIT $1`,
    [Math.min(Number(limit) || 100, 200)]
  );
  return r ? r.rows : null;
}

// Teacher approves (deliver) or rejects a quarantined message.
async function moderateParentMessage({ id, moderatorEmail, action }) {
  const state = action === 'approve' ? 'delivered' : 'rejected';
  const r = await q(
    `UPDATE parent_messages
        SET delivery_state = $3, moderated_by = $2, moderated_at = now()
      WHERE id = $1 AND delivery_state = 'quarantined'
      RETURNING *`,
    [Number(id), String(moderatorEmail).toLowerCase(), state]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- Parent portal: preferences (Feature 6, US4/US5) -----------------------
async function getParentPreferences({ parentEmail }) {
  const email = String(parentEmail).toLowerCase();
  const r = await q(`SELECT * FROM parent_preferences WHERE parent_email = $1`, [email]);
  if (r && r.rows[0]) return r.rows[0];
  return { parent_email: email, language: 'en', digest_opt_in: true, email_frequency: 'weekly', notify_in_app: true, notify_email: true };
}

async function setParentPreferences({ parentEmail, language, digestOptIn, emailFrequency, notifyInApp, notifyEmail }) {
  const email = String(parentEmail).toLowerCase();
  const r = await q(
    `INSERT INTO parent_preferences (parent_email, language, digest_opt_in, email_frequency, notify_in_app, notify_email, updated_at)
     VALUES ($1, COALESCE($2,'en'), COALESCE($3,true), COALESCE($4,'weekly'), COALESCE($5,true), COALESCE($6,true), now())
     ON CONFLICT (parent_email) DO UPDATE SET
       language        = COALESCE($2, parent_preferences.language),
       digest_opt_in   = COALESCE($3, parent_preferences.digest_opt_in),
       email_frequency = COALESCE($4, parent_preferences.email_frequency),
       notify_in_app   = COALESCE($5, parent_preferences.notify_in_app),
       notify_email    = COALESCE($6, parent_preferences.notify_email),
       updated_at      = now()
     RETURNING *`,
    [
      email,
      language != null ? String(language).slice(0, 8) : null,
      digestOptIn != null ? Boolean(digestOptIn) : null,
      emailFrequency != null ? String(emailFrequency).slice(0, 16) : null,
      notifyInApp != null ? Boolean(notifyInApp) : null,
      notifyEmail != null ? Boolean(notifyEmail) : null
    ]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- Parent portal: weekly digest (Feature 6, US4) -------------------------
// Aggregate one child's current-week activity + per-domain mastery for the digest/dashboard.
async function weeklyChildSummary({ childEmail, weekStart }) {
  const email = String(childEmail).toLowerCase();
  const start = weekStart ? new Date(weekStart) : null;
  // Items completed + accuracy over the last 7 days (or the given week).
  const act = await q(
    start
      ? `SELECT COALESCE(SUM(attempts),0)::int AS attempts, COALESCE(SUM(correct),0)::int AS correct,
                COUNT(*) FILTER (WHERE attempts > 0)::int AS active_days
           FROM learner_activity WHERE email = $1 AND day >= $2::date AND day < $2::date + 7`
      : `SELECT COALESCE(SUM(attempts),0)::int AS attempts, COALESCE(SUM(correct),0)::int AS correct,
                COUNT(*) FILTER (WHERE attempts > 0)::int AS active_days
           FROM learner_activity WHERE email = $1 AND day >= CURRENT_DATE - 6`,
    start ? [email, start.toISOString().slice(0, 10)] : [email]
  );
  const a = act && act.rows[0] ? act.rows[0] : { attempts: 0, correct: 0, active_days: 0 };
  // Top domains by mastery.
  const dom = await q(
    `SELECT s.domain, ROUND(AVG(sm.level)::numeric, 2)::float AS mastery, COUNT(*)::int AS skills
       FROM skill_mastery sm JOIN skills s ON s.id = sm.skill_id
      WHERE sm.email = $1
      GROUP BY s.domain ORDER BY mastery DESC`,
    [email]
  );
  const domains = dom ? dom.rows : [];
  const attempts = a.attempts | 0;
  const correct = a.correct | 0;
  const accuracy = attempts > 0 ? correct / attempts : 0;
  // Tone heuristic: celebrate a strong, active week; flag a weak subject for support.
  const weakest = domains.length ? domains[domains.length - 1] : null;
  let tone = 'neutral';
  if (attempts >= 10 && accuracy >= 0.75) tone = 'celebration';
  else if (weakest && weakest.mastery < 0.5) tone = 'support';
  return {
    childEmail: email,
    itemsCompleted: attempts,
    correct,
    accuracy: Math.round(accuracy * 100) / 100,
    activeDays: a.active_days | 0,
    topDomains: domains.slice(0, 3),
    weakestDomain: weakest,
    tone
  };
}

async function upsertParentDigest({ parentEmail, childEmail, weekStart, summary, howToHelp, tone, language }) {
  const r = await q(
    `INSERT INTO parent_digests (parent_email, child_email, week_start, summary, how_to_help, tone, language)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,COALESCE($7,'en'))
     ON CONFLICT (parent_email, child_email, week_start) DO UPDATE SET
       summary = EXCLUDED.summary, how_to_help = EXCLUDED.how_to_help, tone = EXCLUDED.tone, language = EXCLUDED.language
     RETURNING *`,
    [
      String(parentEmail).toLowerCase(), String(childEmail).toLowerCase(),
      new Date(weekStart).toISOString().slice(0, 10), JSON.stringify(summary || {}),
      howToHelp ? String(howToHelp).slice(0, 600) : null, tone || 'neutral',
      language ? String(language).slice(0, 8) : 'en'
    ]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function markDigestSent({ id }) {
  const r = await q(`UPDATE parent_digests SET sent_at = now() WHERE id = $1 RETURNING id, sent_at`, [Number(id)]);
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listParentDigests({ parentEmail, limit = 12 }) {
  const r = await q(
    `SELECT id, child_email, week_start, summary, how_to_help, tone, language, sent_at, opened_at, created_at
       FROM parent_digests WHERE parent_email = $1 ORDER BY week_start DESC LIMIT $2`,
    [String(parentEmail).toLowerCase(), Math.min(Number(limit) || 12, 52)]
  );
  return r ? r.rows : null;
}

// All (parent, child) pairs eligible for the weekly digest — opt-out aware.
// Parents with no preference row default to opted-in (LEFT JOIN + IS NOT FALSE).
async function listDigestRecipients() {
  const r = await q(
    `SELECT pl.parent_email AS "parentEmail", pl.child_email AS "childEmail",
            COALESCE(pp.language, 'en') AS language
       FROM parent_links pl
       LEFT JOIN parent_preferences pp ON pp.parent_email = pl.parent_email
      WHERE pp.digest_opt_in IS NOT FALSE
      ORDER BY pl.parent_email, pl.child_email`,
    []
  );
  return r ? r.rows : null;
}

// --- Skill catalogue (Feature 2) ------------------------------------------

// List the skill catalogue with optional filters and per-skill counts of
// mapped competencies and items. Used by /api/data/skills.
async function listSkillsCatalogue({ domain, competency, limit = 200 } = {}) {
  const conds = []; const params = [];
  if (domain) { params.push(domain); conds.push(`s.domain = $${params.length}`); }
  if (competency) {
    params.push(competency);
    conds.push(`EXISTS (SELECT 1 FROM skill_competency_map m WHERE m.skill_id = s.id AND m.competency_id = $${params.length})`);
  }
  params.push(limit);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(
    `SELECT s.id AS "skillId", s.label, s.domain, s.difficulty, s.bloom,
            (SELECT COUNT(*)::int FROM skill_competency_map m WHERE m.skill_id = s.id) AS "competencyCount",
            (SELECT COUNT(*)::int FROM item_skills isk WHERE isk.skill_id = s.id) AS "itemCount"
       FROM skills s
       ${where}
       ORDER BY s.domain, s.difficulty, s.id
       LIMIT $${params.length}`,
    params
  );
  return r ? r.rows : null;
}

// Detailed view of one skill: linked competencies (with curriculum context if known) + items.
async function getSkillById({ id }) {
  const sr = await q(
    `SELECT id AS "skillId", label, domain, difficulty, bloom FROM skills WHERE id = $1`,
    [id]
  );
  if (!sr || sr.rows.length === 0) return null;
  const skill = sr.rows[0];
  const cr = await q(
    `SELECT m.competency_id AS "competencyId", m.weight,
            c.country, c.framework, c.grade, c.subject, c.title, c.description
       FROM skill_competency_map m
       LEFT JOIN curricula c ON c.id = m.competency_id
       WHERE m.skill_id = $1
       ORDER BY c.country NULLS LAST, m.competency_id`,
    [id]
  );
  const ir = await q(
    `SELECT item_id AS "itemId" FROM item_skills WHERE skill_id = $1 ORDER BY item_id`,
    [id]
  );
  return {
    ...skill,
    competencies: cr ? cr.rows : [],
    items: ir ? ir.rows.map(r => r.itemId) : []
  };
}

// Admin-only: rebuild the entire skill_mastery table from item_attempts (idempotent).
async function recomputeAllMastery() {
  if (!enabled) return { enabled: false };
  const p = getPool();
  if (!p) return { enabled: false };
  try {
    await p.query('TRUNCATE skill_mastery');
    const r = await p.query(
      `INSERT INTO skill_mastery (email, skill_id, attempts, correct, level, last_seen, updated_at)
       SELECT ia.email, isk.skill_id,
              COUNT(*)::int,
              SUM(CASE WHEN ia.correct THEN 1 ELSE 0 END)::int,
              CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN ia.correct THEN 1 ELSE 0 END)::real / COUNT(*)::real ELSE 0 END,
              MAX(ia.created_at),
              now()
         FROM item_attempts ia
         JOIN item_skills isk ON isk.item_id = ia.item_id
         GROUP BY ia.email, isk.skill_id`
    );
    return { enabled: true, rebuilt: r.rowCount };
  } catch (e) {
    return { enabled: true, error: String(e && e.message || e) };
  }
}

// --- Quality telemetry (Feature 3) ----------------------------------------

// Insert a learner feedback row for a previous /api/chat answer.
// Returns the new row id (or null on failure).
async function logAskFeedback({ askId, email, rating, note }) {
  if (!enabled) return null;
  const allowed = new Set(['helpful', 'confusing', 'wrong']);
  if (!allowed.has(rating)) return null;
  const r = await q(
    `INSERT INTO ask_feedback (ask_id, email, rating, note)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      Number.isFinite(askId) ? askId : null,
      String(email || 'anonymous'),
      rating,
      note ? String(note).slice(0, 500) : null
    ]
  );
  return r && r.rows[0] ? r.rows[0].id : null;
}

// Headline KPIs for the admin Quality dashboard. Reads the v_quality_kpis_24h view.
async function getQualityKpis() {
  const r = await q('SELECT * FROM v_quality_kpis_24h');
  if (!r || r.rows.length === 0) {
    return {
      prompts_24h: 0, p50_latency_ms: null, p95_latency_ms: null,
      pct_blocked_cs_24h: 0, feedback_24h: 0, pct_helpful_24h: 0,
      teacher_median_response_seconds_7d: null
    };
  }
  return r.rows[0];
}

// Latest free-form learner feedback (for the admin Quality dashboard).
async function getQualityFeedback({ limit = 50 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const r = await q(
    `SELECT id, ask_id AS "askId", email, rating, note, created_at AS "createdAt",
            ask_role AS "askRole", ask_app AS "askApp", prompt, model, latency_ms AS "latencyMs"
       FROM v_quality_feedback
       LIMIT $1`,
    [lim]
  );
  return r ? r.rows : null;
}

// ---------------------------------------------------------------------------
// Teacher Assessment, AI Rubric Assist & At-Risk Dashboards (Feature 008)
// All helpers fail-soft (return null when DB disabled). Generation/safety/approval
// actions are paired with an immutable audit_event write by the route layer.
// ---------------------------------------------------------------------------

// Correlation id for chaining generate → scan → approve → assign across audit rows.
function newCorrelationId() {
  try { return crypto.randomUUID(); } catch (_) { return crypto.randomBytes(16).toString('hex'); }
}

// Data-minimisation: never persist raw objective prompts — only a stable hash.
function hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

// Convenience wrapper around recordAuditEvent that always attaches a correlation id.
async function recordAssessmentAudit({ eventType, actorId, actorRole = 'teacher', targetType, targetId, scope, outcome = 'ok', correlationId }) {
  const cid = correlationId || newCorrelationId();
  await recordAuditEvent({ eventType, actorId, actorRole, targetType, targetId, scope, outcome, correlationId: cid });
  return cid;
}

// --- US1 Rubrics & scoring -------------------------------------------------

async function createRubric({ title, creatorTeacherId, levelCount, criterionCount, criteria, weightingMode, sharedVisibility }) {
  const lc = Math.min(Math.max(Number(levelCount) || 4, 3), 5);
  const cc = Math.min(Math.max(Number(criterionCount) || (Array.isArray(criteria) ? criteria.length : 3), 2), 5);
  const r = await q(
    `INSERT INTO rubrics (title, creator_teacher_id, level_count, criterion_count, criteria_json, weighting_mode, shared_visibility)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING *`,
    [String(title || 'Untitled rubric').slice(0, 200), String(creatorTeacherId || 'anonymous').toLowerCase(),
     lc, cc, JSON.stringify(Array.isArray(criteria) ? criteria : []),
     weightingMode === 'weighted' ? 'weighted' : 'equal',
     ['private', 'class', 'school'].includes(sharedVisibility) ? sharedVisibility : 'private']
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listRubrics({ creatorTeacherId, status, limit = 100 } = {}) {
  const conds = []; const params = [];
  if (creatorTeacherId) { params.push(String(creatorTeacherId).toLowerCase()); conds.push(`creator_teacher_id = $${params.length}`); }
  if (status) { params.push(status); conds.push(`status = $${params.length}`); }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(`SELECT * FROM rubrics ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
  return r ? r.rows : null;
}

async function getRubric({ id }) {
  const r = await q(`SELECT * FROM rubrics WHERE id = $1`, [id]);
  return r && r.rows[0] ? r.rows[0] : null;
}

async function publishRubric({ id }) {
  const r = await q(`UPDATE rubrics SET status = 'published', updated_at = now() WHERE id = $1 RETURNING *`, [id]);
  return r && r.rows[0] ? r.rows[0] : null;
}

async function recordRubricScore({ rubricId, learnerId, assessmentId, criterionScores, overallLevel, masteryPercent, teacherFeedbackText, feedbackSafetyStatus, scoredByTeacherId }) {
  const mp = Math.min(Math.max(Number(masteryPercent) || 0, 0), 100);
  const r = await q(
    `INSERT INTO rubric_scores (rubric_id, learner_id, assessment_id, criterion_scores_json, overall_level, mastery_percent, teacher_feedback_text, feedback_safety_status, scored_by_teacher_id)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9) RETURNING *`,
    [rubricId, String(learnerId || '').toLowerCase(), assessmentId || null,
     JSON.stringify(Array.isArray(criterionScores) ? criterionScores : []),
     overallLevel != null ? Number(overallLevel) : null, mp,
     teacherFeedbackText ? String(teacherFeedbackText).slice(0, 2000) : null,
     ['not_scanned', 'pass', 'flagged', 'blocked'].includes(feedbackSafetyStatus) ? feedbackSafetyStatus : 'not_scanned',
     String(scoredByTeacherId || 'anonymous').toLowerCase()]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listRubricScores({ rubricId, learnerId, limit = 200 } = {}) {
  const conds = []; const params = [];
  if (rubricId) { params.push(rubricId); conds.push(`rubric_id = $${params.length}`); }
  if (learnerId) { params.push(String(learnerId).toLowerCase()); conds.push(`learner_id = $${params.length}`); }
  params.push(Math.min(Number(limit) || 200, 1000));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(`SELECT * FROM rubric_scores ${where} ORDER BY scored_at DESC LIMIT $${params.length}`, params);
  return r ? r.rows : null;
}

// --- US2 Shared assessment library & copy lineage --------------------------

async function createSharedAssessment({ sourceAssessmentId, ownerTeacherId, title, description, gradeTag, subjectTag, skillTags, difficultyLevel, governanceOwnerId, payload }) {
  const r = await q(
    `INSERT INTO shared_assessments (source_assessment_id, owner_teacher_id, title, description, grade_tag, subject_tag, skill_tags, difficulty_level, governance_owner_id, payload_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *`,
    [sourceAssessmentId || null, String(ownerTeacherId || 'anonymous').toLowerCase(),
     String(title || 'Untitled assessment').slice(0, 200), description ? String(description).slice(0, 1000) : null,
     gradeTag || null, subjectTag || null,
     Array.isArray(skillTags) ? skillTags.map(s => String(s).slice(0, 60)).slice(0, 20) : [],
     ['support', 'core', 'stretch'].includes(difficultyLevel) ? difficultyLevel : 'core',
     governanceOwnerId || null, JSON.stringify(payload || {})]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listSharedAssessments({ gradeTag, subjectTag, skillTag, difficultyLevel, search, limit = 100 } = {}) {
  const conds = [`publish_status = 'published'`]; const params = [];
  if (gradeTag) { params.push(gradeTag); conds.push(`grade_tag = $${params.length}`); }
  if (subjectTag) { params.push(subjectTag); conds.push(`subject_tag = $${params.length}`); }
  if (difficultyLevel) { params.push(difficultyLevel); conds.push(`difficulty_level = $${params.length}`); }
  if (skillTag) { params.push(skillTag); conds.push(`$${params.length} = ANY(skill_tags)`); }
  if (search) { params.push(`%${String(search).slice(0, 80)}%`); conds.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
  params.push(Math.min(Number(limit) || 100, 500));
  const r = await q(`SELECT * FROM shared_assessments WHERE ${conds.join(' AND ')} ORDER BY usage_count DESC, created_at DESC LIMIT $${params.length}`, params);
  return r ? r.rows : null;
}

async function getSharedAssessment({ id }) {
  const r = await q(`SELECT * FROM shared_assessments WHERE id = $1`, [id]);
  return r && r.rows[0] ? r.rows[0] : null;
}

// Copy isolation: a new assessment_copies row; source edits never mutate copies.
async function copySharedAssessment({ sharedAssessmentId, destinationClassId, copiedByTeacherId, dueDate, localizedEdits, curriculumMapping }) {
  const src = await getSharedAssessment({ id: sharedAssessmentId });
  if (!src) return null;
  const r = await q(
    `INSERT INTO assessment_copies (shared_assessment_id, source_version, destination_class_id, copied_by_teacher_id, due_date, localized_edits_json, curriculum_mapping_json)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) RETURNING *`,
    [sharedAssessmentId, src.source_version || 1, String(destinationClassId || '').slice(0, 80),
     String(copiedByTeacherId || 'anonymous').toLowerCase(), dueDate || null,
     JSON.stringify(localizedEdits || {}), JSON.stringify(curriculumMapping || {})]
  );
  if (r && r.rows[0]) {
    await q(`UPDATE shared_assessments SET usage_count = usage_count + 1 WHERE id = $1`, [sharedAssessmentId]);
  }
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- US3 Remediation groups & progress -------------------------------------

async function createRemediationGroup({ classId, createdByTeacherId, title, thresholdRule, learnerMembers, sequenceDefinition }) {
  const r = await q(
    `INSERT INTO remediation_groups (class_id, created_by_teacher_id, title, threshold_rule, learner_members_json, sequence_definition_json)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) RETURNING *`,
    [String(classId || '').slice(0, 80), String(createdByTeacherId || 'anonymous').toLowerCase(),
     String(title || 'Catch-up group').slice(0, 200), JSON.stringify(thresholdRule || {}),
     JSON.stringify(Array.isArray(learnerMembers) ? learnerMembers : []),
     JSON.stringify(Array.isArray(sequenceDefinition) ? sequenceDefinition : [])]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listRemediationGroups({ classId, limit = 100 } = {}) {
  const conds = []; const params = [];
  if (classId) { params.push(String(classId).slice(0, 80)); conds.push(`class_id = $${params.length}`); }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(`SELECT * FROM remediation_groups ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
  return r ? r.rows : null;
}

async function upsertRemediationProgress({ remediationGroupId, learnerId, stepId, stepStatus, reassessmentScore, clearedFlag }) {
  const r = await q(
    `INSERT INTO remediation_progress (remediation_group_id, learner_id, step_id, step_status, completion_timestamp, reassessment_score, cleared_flag, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now())
     ON CONFLICT (remediation_group_id, learner_id, step_id) DO UPDATE SET
       step_status = EXCLUDED.step_status,
       completion_timestamp = EXCLUDED.completion_timestamp,
       reassessment_score = EXCLUDED.reassessment_score,
       cleared_flag = EXCLUDED.cleared_flag,
       updated_at = now()
     RETURNING *`,
    [remediationGroupId, String(learnerId || '').toLowerCase(), String(stepId || '').slice(0, 80),
     ['assigned', 'in_progress', 'completed'].includes(stepStatus) ? stepStatus : 'assigned',
     stepStatus === 'completed' ? new Date().toISOString() : null,
     reassessmentScore != null ? Number(reassessmentScore) : null, Boolean(clearedFlag)]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listRemediationProgress({ remediationGroupId, limit = 500 } = {}) {
  const r = await q(
    `SELECT * FROM remediation_progress WHERE remediation_group_id = $1 ORDER BY learner_id, step_id LIMIT $2`,
    [remediationGroupId, Math.min(Number(limit) || 500, 2000)]
  );
  return r ? r.rows : null;
}

// --- US4 AI-generated artifacts, safety verdicts & teacher approvals --------

async function createAIArtifact({ artifactType, objectiveText, boundedPromptContext, modelDeployment, modelVersion, generatedText, templateVersion, createdByTeacherId, safetyStatus, generationStatus }) {
  const r = await q(
    `INSERT INTO ai_generated_artifacts (artifact_type, objective_text_hash, bounded_prompt_context, model_deployment, model_version, generated_text, generation_status, safety_status, template_version, created_by_teacher_id)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [['rubric', 'question_set', 'remediation_suggestion'].includes(artifactType) ? artifactType : 'rubric',
     hashText(objectiveText), JSON.stringify(boundedPromptContext || {}),
     modelDeployment || null, modelVersion || null, generatedText ? String(generatedText).slice(0, 8000) : null,
     ['draft', 'safety_reviewed', 'needs_edit', 'approved', 'rejected', 'assigned'].includes(generationStatus) ? generationStatus : 'draft',
     ['not_scanned', 'pass', 'flagged', 'blocked'].includes(safetyStatus) ? safetyStatus : 'not_scanned',
     templateVersion || null, String(createdByTeacherId || 'anonymous').toLowerCase()]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function getAIArtifact({ id }) {
  const r = await q(`SELECT * FROM ai_generated_artifacts WHERE id = $1`, [id]);
  return r && r.rows[0] ? r.rows[0] : null;
}

async function updateAIArtifactStatus({ id, generationStatus, safetyStatus, approvedForAssignment }) {
  const sets = ['updated_at = now()']; const params = [];
  if (generationStatus) { params.push(generationStatus); sets.push(`generation_status = $${params.length}`); }
  if (safetyStatus) { params.push(safetyStatus); sets.push(`safety_status = $${params.length}`); }
  if (approvedForAssignment != null) { params.push(Boolean(approvedForAssignment)); sets.push(`approved_for_assignment = $${params.length}`); }
  params.push(id);
  const r = await q(`UPDATE ai_generated_artifacts SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listAIArtifacts({ createdByTeacherId, generationStatus, limit = 100 } = {}) {
  const conds = []; const params = [];
  if (createdByTeacherId) { params.push(String(createdByTeacherId).toLowerCase()); conds.push(`created_by_teacher_id = $${params.length}`); }
  if (generationStatus) { params.push(generationStatus); conds.push(`generation_status = $${params.length}`); }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await q(`SELECT * FROM ai_generated_artifacts ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
  return r ? r.rows : null;
}

async function recordSafetyVerdict({ artifactId, contentType, categoryScores, flaggedCategories, verdictStatus, requiresManualReview }) {
  const r = await q(
    `INSERT INTO assessment_safety_verdicts (artifact_id, content_type, category_scores_json, flagged_categories_json, verdict_status, requires_manual_review)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6) RETURNING *`,
    [artifactId || null,
     ['generated_rubric', 'generated_question_set', 'remediation_suggestion', 'teacher_feedback'].includes(contentType) ? contentType : 'teacher_feedback',
     JSON.stringify(categoryScores || {}), JSON.stringify(Array.isArray(flaggedCategories) ? flaggedCategories : []),
     ['pass', 'flagged', 'blocked', 'accepted_with_review'].includes(verdictStatus) ? verdictStatus : 'pass',
     Boolean(requiresManualReview)]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

// Mandatory teacher-approval gate: an artifact is only assignable when an
// approve decision with approved_for_assignment=true exists. Append-only.
async function recordTeacherApproval({ artifactId, teacherId, decision, decisionReason, editedText, approvedForAssignment }) {
  const dec = ['approve', 'reject', 'needs_edit'].includes(decision) ? decision : 'needs_edit';
  const approve = dec === 'approve' && Boolean(approvedForAssignment);
  const r = await q(
    `INSERT INTO teacher_approvals (artifact_id, teacher_id, decision, decision_reason, edited_text_hash, approved_for_assignment)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [artifactId, String(teacherId || 'anonymous').toLowerCase(), dec,
     decisionReason ? String(decisionReason).slice(0, 1000) : null,
     editedText ? hashText(editedText) : null, approve]
  );
  if (r && r.rows[0]) {
    const nextStatus = dec === 'approve' ? 'approved' : (dec === 'reject' ? 'rejected' : 'needs_edit');
    await updateAIArtifactStatus({ id: artifactId, generationStatus: nextStatus, approvedForAssignment: approve });
  }
  return r && r.rows[0] ? r.rows[0] : null;
}

async function listTeacherApprovals({ artifactId, limit = 50 } = {}) {
  const r = await q(`SELECT * FROM teacher_approvals WHERE artifact_id = $1 ORDER BY decided_at DESC LIMIT $2`,
    [artifactId, Math.min(Number(limit) || 50, 200)]);
  return r ? r.rows : null;
}

// Returns true only when the artifact has an approved + assignable decision.
async function isArtifactAssignable({ artifactId }) {
  const a = await getAIArtifact({ id: artifactId });
  if (!a) return false;
  return a.generation_status === 'approved' && a.approved_for_assignment === true && a.safety_status !== 'blocked';
}

// --- US5 At-risk dashboard snapshots (advisory only) -----------------------

async function upsertDashboardSnapshot({ classId, topicId, masteryPercent, completionRate, atRiskCount, ungradedCount, recommendationSummary }) {
  const r = await q(
    `INSERT INTO at_risk_dashboard_snapshots (class_id, topic_id, mastery_percent, completion_rate, at_risk_count, ungraded_count, recommendation_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [String(classId || '').slice(0, 80), topicId || null,
     Math.min(Math.max(Number(masteryPercent) || 0, 0), 100), Math.min(Math.max(Number(completionRate) || 0, 0), 100),
     Number(atRiskCount) || 0, Number(ungradedCount) || 0,
     recommendationSummary ? String(recommendationSummary).slice(0, 1000) : null]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

async function getLatestDashboardSnapshot({ classId }) {
  const r = await q(`SELECT * FROM at_risk_dashboard_snapshots WHERE class_id = $1 ORDER BY computed_at DESC LIMIT 1`,
    [String(classId || '').slice(0, 80)]);
  return r && r.rows[0] ? r.rows[0] : null;
}

// --- Template-cache governance ---------------------------------------------

async function getTemplateCacheEntry({ cacheKey }) {
  const r = await q(`SELECT * FROM template_cache_entries WHERE cache_key = $1 AND review_status = 'approved' AND (expires_at IS NULL OR expires_at > now())`,
    [String(cacheKey || '').slice(0, 200)]);
  if (r && r.rows[0]) {
    await q(`UPDATE template_cache_entries SET hit_count = hit_count + 1, last_used_at = now() WHERE cache_key = $1`, [cacheKey]);
  }
  return r && r.rows[0] ? r.rows[0] : null;
}

async function upsertTemplateCacheEntry({ cacheKey, templateFamily, templateVersion, pedagogicalTags, locale, templateText, ownerRole, reviewStatus, expiresAt }) {
  const r = await q(
    `INSERT INTO template_cache_entries (cache_key, template_family, template_version, pedagogical_tags_json, locale, template_text, hash, owner_role, review_status, expires_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (cache_key) DO UPDATE SET
       template_text = EXCLUDED.template_text, template_version = EXCLUDED.template_version,
       hash = EXCLUDED.hash, review_status = EXCLUDED.review_status, expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [String(cacheKey || '').slice(0, 200), String(templateFamily || 'generic').slice(0, 80),
     templateVersion || 'v1', JSON.stringify(Array.isArray(pedagogicalTags) ? pedagogicalTags : []),
     locale || 'en', String(templateText || '').slice(0, 4000), hashText(templateText),
     ownerRole || 'learning-sciences', ['draft', 'approved', 'deprecated'].includes(reviewStatus) ? reviewStatus : 'approved',
     expiresAt || null]
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

module.exports = {
  enabled,
  init,
  logConnection,
  logAsk,
  recordAuditEvent,
  newCorrelationId,
  hashText,
  recordAssessmentAudit,
  createRubric,
  listRubrics,
  getRubric,
  publishRubric,
  recordRubricScore,
  listRubricScores,
  createSharedAssessment,
  listSharedAssessments,
  getSharedAssessment,
  copySharedAssessment,
  createRemediationGroup,
  listRemediationGroups,
  upsertRemediationProgress,
  listRemediationProgress,
  createAIArtifact,
  getAIArtifact,
  updateAIArtifactStatus,
  listAIArtifacts,
  recordSafetyVerdict,
  recordTeacherApproval,
  listTeacherApprovals,
  isArtifactAssignable,
  upsertDashboardSnapshot,
  getLatestDashboardSnapshot,
  getTemplateCacheEntry,
  upsertTemplateCacheEntry,
  logDirectorPortalAccessAudit,
  logDirectorReportUsageAudit,
  logHierarchyChangeAudit,
  listSheets,
  getSheet,
  createSheet,
  deleteSheet,
  listCurricula,
  listGlossary,
  summariseLearners,
  pickRandomLearner,
  reseedReferenceData,
  logItemAttempt,
  recentAttempts,
  attemptStats,
  logContentSafety,
  createTeacherQuestion,
  listTeacherQuestionsForLearner,
  listTeacherQuestionsInbox,
  answerTeacherQuestion,
  bumpSkillMasteryFromAttempt,
  bumpDailyActivity,
  listMasteryForLearner,
  listClassMastery,
  getClassHeatmap,
  recordTeacherOverride,
  listTeacherOverrides,
  listChildrenForParent,
  isParentOfChild,
  listParentsForChild,
  listTeacherQuestionsForLearnerReadOnly,
  listLearnerActivity,
  listLearnerHierarchyAssignments,
  resolveLearnerHierarchy,
  listHierarchyRollups,
  getHierarchySummary,
  writeHierarchyException,
  listHierarchyExceptions,
  listReportingScopeForDirector,
  resolveDirectorScope,
  recordDirectorPortalSession,
  listEmbeddedReportReferences,
  recomputeAllMastery,
  getLearnerStreak,
  listClassBadges,
  getConsentsForParent,
  upsertConsent,
  hasActiveConsentForLearner,
  createConsentRequest,
  getConsentRequestByToken,
  resolveConsentRequest,
  listConsentRequestsNeedingReminder,
  markConsentRequestReminded,
  expireStaleConsentRequests,
  listConsentRequestsForParent,
  CONSENT_DISCLOSURE_VERSION,
  CONSENT_TTL_DAYS,
  parentThreadId,
  createParentMessage,
  listParentThread,
  listParentInbox,
  countUnreadParentMessages,
  markParentMessageRead,
  listParentModerationQueue,
  moderateParentMessage,
  getParentPreferences,
  setParentPreferences,
  weeklyChildSummary,
  upsertParentDigest,
  markDigestSent,
  listParentDigests,
  listDigestRecipients,
  listSkillsCatalogue,
  getSkillById,
  logAskFeedback,
  getQualityKpis,
  getQualityFeedback,
  // Generic read-only query helper for admin dashboards. Returns null on failure.
  _query: q
};
