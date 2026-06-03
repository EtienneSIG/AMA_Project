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
      return false;
    }
  })();
  return initPromise;
}

// Seed curricula, glossary terms, learners from packaged JSON/CSV (idempotent).
async function seedReferenceData(p) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return;

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
    await seedDemoCohort(p);
  } catch (e) { console.error('[db] demo cohort seed failed:', e.message); }
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
  await init();
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

async function logOperationalEvent({ app, actorEmail, actorRole, eventType, outcome, correlationId, detail }) {
  await q(
    `INSERT INTO operational_events (app, actor_email, actor_role, event_type, outcome, correlation_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      app || APP,
      actorEmail || 'anonymous',
      actorRole || 'unknown',
      eventType,
      outcome || 'unknown',
      String(correlationId || 'none').slice(0, 128),
      (detail || '').slice(0, 500)
    ]
  );
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

// --- Parental consent (GDPR Art. 8) ----------------------------------------

async function getConsentsForParent({ parentEmail }) {
  const r = await q(
    `SELECT id, parent_email, child_email, consent_type, granted, granted_at, withdrawn_at, ip, user_agent, created_at, updated_at
       FROM parental_consents WHERE parent_email = $1 ORDER BY created_at`,
    [String(parentEmail).toLowerCase()]
  );
  return r ? r.rows : null;
}

async function upsertConsent({ parentEmail, childEmail, consentType, granted, ip, userAgent }) {
  const pEmail = String(parentEmail).toLowerCase();
  const cEmail = String(childEmail).toLowerCase();
  const cType = consentType || 'gdpr_art8';
  let r;
  if (granted) {
    r = await q(
      `INSERT INTO parental_consents (parent_email, child_email, consent_type, granted, granted_at, ip, user_agent, updated_at)
       VALUES ($1, $2, $3, true, now(), $4, $5, now())
       ON CONFLICT (parent_email, child_email, consent_type) DO UPDATE
         SET granted = true, granted_at = now(), withdrawn_at = NULL, ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent, updated_at = now()
       RETURNING *`,
      [pEmail, cEmail, cType, ip || null, (userAgent || '').slice(0, 256)]
    );
  } else {
    r = await q(
      `INSERT INTO parental_consents (parent_email, child_email, consent_type, granted, withdrawn_at, ip, user_agent, updated_at)
       VALUES ($1, $2, $3, false, now(), $4, $5, now())
       ON CONFLICT (parent_email, child_email, consent_type) DO UPDATE
         SET granted = false, withdrawn_at = now(), ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent, updated_at = now()
       RETURNING *`,
      [pEmail, cEmail, cType, ip || null, (userAgent || '').slice(0, 256)]
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

module.exports = {
  enabled,
  init,
  logConnection,
  logOperationalEvent,
  logAsk,
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
  listTeacherQuestionsForLearnerReadOnly,
  listLearnerActivity,
  recomputeAllMastery,
  getLearnerStreak,
  getConsentsForParent,
  upsertConsent,
  hasActiveConsentForLearner,
  listSkillsCatalogue,
  getSkillById,
  logAskFeedback,
  getQualityKpis,
  getQualityFeedback,
  // Generic read-only query helper for admin dashboards. Returns null on failure.
  _query: q
};
