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
  listLearnerActivity,
  recomputeAllMastery,
  getLearnerStreak,
  listSkillsCatalogue,
  getSkillById,
  logAskFeedback,
  getQualityKpis,
  getQualityFeedback,
  // Generic read-only query helper for admin dashboards. Returns null on failure.
  _query: q
};
