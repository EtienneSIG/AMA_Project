// LearnEU shared auth lib — demo-grade session manager.
// Production: replace SEED_USERS with Azure Table Storage via DefaultAzureCredential,
//             swap SECRET to a KV-referenced env var, integrate Azure AD B2C.
// Demo password (all 4 users): DemoPass2026!
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const db = require('./db');

const APP_NAME = process.env.APP_NAME || process.env.APP_ROLE || 'unknown';

function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return xf || req.ip || (req.connection && req.connection.remoteAddress) || null;
}

// SEED_USERS: 4 baseline accounts + an extended cohort used by the seed script
// in db/index.js to populate item_attempts, skill_mastery, learner_activity,
// teacher_questions, sheets and parent_links.  All accounts share the same
// demo password (DemoPass2026!).  Markets: DE | NL | FR | ES | IT.
const SEED_USERS = [
  // --- baseline (do not rename — referenced by docs) -----------------------
  { email: 'admin@learneu.demo',    role: 'admin',   firstName: 'Alex',     lastName: 'Admin',    age: 35, social: '@alex.admin',     language: 'en' },
  { email: 'teacher@learneu.demo',  role: 'teacher', firstName: 'Klaus',    lastName: 'Klein',    age: 42, social: '@klaus.klein',    language: 'de' },
  { email: 'parent@learneu.demo',   role: 'parent',  firstName: 'Sophie',   lastName: 'De Vries', age: 40, social: '@sophie.dv',      language: 'nl' },
  { email: 'student@learneu.demo',  role: 'student', firstName: 'Lucas',    lastName: 'Janssen',  age: 12, social: '@lucas12',        language: 'fr' },
  { email: 'director@learneu.demo', role: 'director', firstName: 'Ines',     lastName: 'Bakker',   age: 46, social: '@ines.director',  language: 'en', reportingScope: { schoolIds: ['SCH-AMSTERDAM-01'], regionIds: ['REG-NL-NORTH'], grantedBy: 'admin@learneu.demo', grantedAt: '2026-06-01T09:00:00Z', effectiveFrom: '2026-06-01T00:00:00Z' } },
  { email: 'director.noscope@learneu.demo', role: 'director', firstName: 'Noa', lastName: 'Scope', age: 47, social: '@noa.noscope', language: 'en', reportingScope: { schoolIds: [], regionIds: [], grantedBy: 'admin@learneu.demo', grantedAt: '2026-06-01T09:00:00Z', effectiveFrom: '2026-06-01T00:00:00Z' } },
  // --- extended teachers ---------------------------------------------------
  { email: 'teacher1@learneu.demo', role: 'teacher', firstName: 'Marieke',  lastName: 'Visser',   age: 38, social: '@m.visser',       language: 'nl' },
  { email: 'teacher2@learneu.demo', role: 'teacher', firstName: 'Camille',  lastName: 'Laurent',  age: 45, social: '@c.laurent',      language: 'fr' },
  // --- extended parents ----------------------------------------------------
  { email: 'parent1@learneu.demo',  role: 'parent',  firstName: 'Anna',     lastName: 'Müller',   age: 41, social: '@anna.muller',    language: 'de' },
  { email: 'parent2@learneu.demo',  role: 'parent',  firstName: 'Pieter',   lastName: 'De Vries', age: 44, social: '@p.devries',      language: 'nl' },
  { email: 'parent3@learneu.demo',  role: 'parent',  firstName: 'Marc',     lastName: 'Dubois',   age: 39, social: '@marc.dubois',    language: 'fr' },
  { email: 'parent4@learneu.demo',  role: 'parent',  firstName: 'Lukas',    lastName: 'Schmidt',  age: 43, social: '@lukas.schmidt',  language: 'de' },
  // --- extended students (diverse mastery profiles seeded in db/index.js) -
  { email: 'student1@learneu.demo', role: 'student', firstName: 'Emma',     lastName: 'Müller',   age: 12, social: '@emma12',         language: 'de' },
  { email: 'student2@learneu.demo', role: 'student', firstName: 'Noah',     lastName: 'De Vries', age: 13, social: '@noah13',         language: 'nl' },
  { email: 'student3@learneu.demo', role: 'student', firstName: 'Mia',      lastName: 'Dubois',   age: 11, social: '@mia11',          language: 'fr' },
  { email: 'student4@learneu.demo', role: 'student', firstName: 'Liam',     lastName: 'Schmidt',  age: 12, social: '@liam12',         language: 'de' },
  { email: 'student5@learneu.demo', role: 'student', firstName: 'Olivia',   lastName: 'Bakker',   age: 13, social: '@olivia13',       language: 'nl' },
  { email: 'student6@learneu.demo', role: 'student', firstName: 'Hugo',     lastName: 'García',   age: 11, social: '@hugo11',         language: 'es' },
  { email: 'student7@learneu.demo', role: 'student', firstName: 'Sofia',    lastName: 'Rossi',    age: 12, social: '@sofia12',        language: 'it' },
  { email: 'student8@learneu.demo', role: 'student', firstName: 'Léa',      lastName: 'Martin',   age: 13, social: '@lea13',          language: 'fr' }
];
const SEED_PASSWORD = 'DemoPass2026!';
const COOKIE = 'learneu_session';
const TTL_MS = 8 * 60 * 60 * 1000;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// --- CSRF Protection (double-submit cookie pattern) ---
const CSRF_COOKIE = 'learneu_csrf';
function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}
function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', maxAge: TTL_MS, secure: true });
}
function csrfMiddleware(req, res, next) {
  // Skip safe methods and public paths
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/api/auth/login') || req.path === '/api/health') return next();
  const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token mismatch. Refresh the page and try again.' });
  }
  next();
}

// --- Rate Limiting (in-memory sliding window) ---
const RATE_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000;
const RATE_MAX_LOGIN = parseInt(process.env.RATE_LIMIT_LOGIN, 10) || 10;
const RATE_MAX_API   = parseInt(process.env.RATE_LIMIT_API, 10) || 60;
const rateBuckets = new Map();

// Evict stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [key, timestamps] of rateBuckets) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateBuckets.delete(key);
    else rateBuckets.set(key, filtered);
  }
}, 5 * 60 * 1000).unref();

function rateLimitMiddleware(bucketPrefix, maxRequests) {
  return (req, res, next) => {
    const ip = clientIp(req) || 'unknown';
    const key = `${bucketPrefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - RATE_WINDOW_MS;
    let timestamps = rateBuckets.get(key) || [];
    timestamps = timestamps.filter(t => t > cutoff);
    if (timestamps.length >= maxRequests) {
      res.set('Retry-After', String(Math.ceil(RATE_WINDOW_MS / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    timestamps.push(now);
    rateBuckets.set(key, timestamps);
    next();
  };
}

const userMap = new Map();
let ready = false;
(async () => {
  for (const u of SEED_USERS) {
    u.passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    userMap.set(u.email.toLowerCase(), u);
  }
  ready = true;
})().catch(e => console.error('[auth] seed failed:', e));

function publicProfile(u) {
  if (!u) return null;
  const { passwordHash, reportingScope, ...rest } = u;
  if (u.role === 'director') {
    rest.directorAuthorization = buildDirectorAuthorization(u);
  }
  return rest;
}

function normalizeDirectorScope(scope = {}) {
  const normalizeIds = (value) => {
    const list = Array.isArray(value) ? value : (value == null ? [] : [value]);
    return [...new Set(list.map(item => String(item).trim()).filter(Boolean))];
  };
  return {
    schoolIds: normalizeIds(scope.schoolIds || scope.schoolId || scope.schools),
    regionIds: normalizeIds(scope.regionIds || scope.regionId || scope.regions),
    grantedBy: scope.grantedBy || null,
    grantedAt: scope.grantedAt || null,
    effectiveFrom: scope.effectiveFrom || null,
    effectiveTo: scope.effectiveTo || null
  };
}

function buildDirectorAuthorization(u) {
  if (!u || u.role !== 'director') return null;
  const scope = normalizeDirectorScope(u.reportingScope || {});
  return {
    role: 'director',
    granted: scope.schoolIds.length > 0 || scope.regionIds.length > 0,
    scope
  };
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

function mountAuth(app, options = {}) {
  const allowedRoles = options.allowedRoles || [];

  app.use(cookieParser());

  // Issue a CSRF token cookie on every request (client reads it and sends as header)
  app.use((req, res, next) => {
    if (!req.cookies[CSRF_COOKIE]) {
      setCsrfCookie(res, generateCsrfToken());
    }
    next();
  });

  app.use((req, _res, next) => {
    const session = verify(req.cookies && req.cookies[COOKIE]);
    if (session) {
      const u = userMap.get(session.email);
      if (u) req.user = u;
    }
    next();
  });

  // CSRF protection on all state-changing requests
  app.use(csrfMiddleware);

  // Rate limit all API routes
  app.use('/api/', rateLimitMiddleware('api', RATE_MAX_API));

  // CSRF token endpoint — clients call this to get a fresh token
  app.get('/api/auth/csrf', (req, res) => {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    res.json({ csrfToken: token });
  });

  app.get('/api/auth/me', (req, res) => res.json({ user: publicProfile(req.user), allowedRoles, directorAuthorization: buildDirectorAuthorization(req.user) }));

  // PATCH /api/auth/me — update mutable profile fields (firstName, lastName, age, social, language).
  // Demo-grade: writes only to in-memory userMap (persists until app restart).
  app.patch('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    const allowed = ['firstName', 'lastName', 'age', 'social', 'language'];
    const supportedLangs = new Set(['en', 'fr', 'de', 'nl', 'es', 'it', 'pt']);
    const patch = {};
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        let v = req.body[k];
        if (k === 'age') {
          v = parseInt(v, 10);
          if (!Number.isFinite(v) || v < 4 || v > 120) return res.status(400).json({ error: 'age must be 4-120' });
        } else {
          v = String(v).trim().slice(0, 80);
          if (k === 'language') {
            v = v.toLowerCase();
            if (!supportedLangs.has(v)) return res.status(400).json({ error: 'language must be one of: ' + [...supportedLangs].join(', ') });
          }
        }
        patch[k] = v;
      }
    }
    Object.assign(req.user, patch);
    res.json({ user: publicProfile(req.user) });
  });

  app.post('/api/auth/login', rateLimitMiddleware('login', RATE_MAX_LOGIN), async (req, res) => {
    if (!ready) return res.status(503).json({ error: 'auth not ready, retry in 1s' });
    const { email, password } = req.body || {};
    const ip = clientIp(req);
    const ua = req.headers['user-agent'] || '';
    const u = userMap.get(String(email || '').toLowerCase());
    if (!u || !(await bcrypt.compare(String(password || ''), u.passwordHash))) {
      db.logConnection({ email: String(email || 'unknown'), role: 'unknown', app: APP_NAME, event: 'login_failed', ip, userAgent: ua, detail: 'bad credentials' }).catch(() => {});
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (allowedRoles.length && !allowedRoles.includes(u.role)) {
      db.logConnection({ email: u.email, role: u.role, app: APP_NAME, event: 'forbidden', ip, userAgent: ua, detail: `role ${u.role} not allowed by ${APP_NAME}` }).catch(() => {});
      return res.status(403).json({ error: `This portal accepts: ${allowedRoles.join(', ')}. Your role: ${u.role}.` });
    }
    const token = sign({ email: u.email.toLowerCase(), role: u.role, exp: Date.now() + TTL_MS });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: TTL_MS, secure: true });
    // Issue fresh CSRF token after login
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
    db.logConnection({ email: u.email, role: u.role, app: APP_NAME, event: 'login', ip, userAgent: ua }).catch(() => {});
    res.json({ user: publicProfile(u), csrfToken });
  });

  app.post('/api/auth/logout', (req, res) => {
    const u = req.user;
    res.clearCookie(COOKIE);
    if (u) db.logConnection({ email: u.email, role: u.role, app: APP_NAME, event: 'logout', ip: clientIp(req), userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    res.json({ ok: true });
  });

  // --- Study sheets — Postgres-backed when PG_HOST is set, in-memory fallback otherwise.
  // Each sheet: { id, title, prompt, answer (markdown), createdAt }
  const MAX_SHEETS = 50;
  function getMemSheets(u) { if (!u.sheets) u.sheets = []; return u.sheets; }

  app.get('/api/sheets', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    if (db.enabled) {
      const list = await db.listSheets({ email: req.user.email, app: APP_NAME });
      if (list) return res.json({ sheets: list, store: 'postgres' });
    }
    const list = getMemSheets(req.user).map(s => ({ id: s.id, title: s.title, createdAt: s.createdAt }));
    res.json({ sheets: list, store: 'memory' });
  });

  app.get('/api/sheets/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    if (db.enabled) {
      const s = await db.getSheet({ id: req.params.id, email: req.user.email });
      if (s) return res.json({ sheet: s });
      // fall through to memory if pg returned null (could be just-not-found)
    }
    const s = getMemSheets(req.user).find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    res.json({ sheet: s });
  });

  app.post('/api/sheets', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    const { title, prompt, answer } = req.body || {};
    const a = String(answer || '').trim();
    if (!a) return res.status(400).json({ error: 'answer required' });
    const computedTitle = String(title || '').trim().slice(0, 120) || (String(prompt || '').trim().slice(0, 80) || 'Untitled sheet');
    if (db.enabled) {
      const s = await db.createSheet({
        email: req.user.email, role: req.user.role, app: APP_NAME,
        title: computedTitle, prompt: String(prompt || ''), answer: a
      });
      if (s) return res.json({ sheet: s, store: 'postgres' });
    }
    const sheets = getMemSheets(req.user);
    if (sheets.length >= MAX_SHEETS) sheets.shift();
    const sheet = {
      id: crypto.randomBytes(8).toString('hex'),
      title: computedTitle,
      prompt: String(prompt || '').slice(0, 2000),
      answer: a.slice(0, 20000),
      createdAt: new Date().toISOString()
    };
    sheets.push(sheet);
    res.json({ sheet, store: 'memory' });
  });

  app.delete('/api/sheets/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    if (db.enabled) {
      const ok = await db.deleteSheet({ id: req.params.id, email: req.user.email });
      if (ok) return res.json({ ok: true, store: 'postgres' });
    }
    const sheets = getMemSheets(req.user);
    const i = sheets.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not found' });
    sheets.splice(i, 1);
    res.json({ ok: true, store: 'memory' });
  });
}

// Gate every request after public ones. PUBLIC_PATHS + /api/auth/* + /api/health are open.
function gateMiddleware(allowedRoles) {
  const PUBLIC = new Set(['/login.html', '/logo.svg', '/favicon.ico', '/no-access.html',
    // Editorial theme assets (CSS + toggle) are static and safe to serve pre-auth
    // so public pages (login, consent, no-access) render the optional theme too.
    '/theme.css', '/theme-toggle.js',
    // Age-adaptive theme assets (spec 014) — static, safe to serve pre-auth.
    '/age-theme.js', '/themes/age-themes.css',
    // Parental consent link is reached by an unauthenticated parent (GDPR Art. 8, US3).
    '/consent-pending.html', '/csrf.js', '/models/consent.js']);
  return (req, res, next) => {
    if (PUBLIC.has(req.path) || req.path.startsWith('/api/auth/') || req.path === '/api/health') return next();
    if (!req.user) {
      if (req.accepts('html') && !req.path.startsWith('/api/')) return res.redirect('/login.html');
      return res.status(401).json({ error: 'authentication required' });
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `forbidden — requires ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { mountAuth, gateMiddleware, publicProfile, getStats, SEED_USERS };

function getStats() {
  let sheetCount = 0;
  const users = [];
  for (const u of userMap.values()) {
    users.push({ email: u.email, role: u.role, language: u.language || 'en', sheets: (u.sheets || []).length });
    sheetCount += (u.sheets || []).length;
  }
  return { users, sheetCount, total: userMap.size };
}
