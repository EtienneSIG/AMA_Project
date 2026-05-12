// LearnEU shared auth lib — demo-grade session manager.
// Production: replace SEED_USERS with Azure Table Storage via DefaultAzureCredential,
//             swap SECRET to a KV-referenced env var, add CSRF tokens, rate-limit /login.
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

const SEED_USERS = [
  { email: 'admin@learneu.demo',   role: 'admin',   firstName: 'Alex',   lastName: 'Admin',    age: 35, social: '@alex.admin',  language: 'en' },
  { email: 'teacher@learneu.demo', role: 'teacher', firstName: 'Klaus',  lastName: 'Klein',    age: 42, social: '@klaus.klein', language: 'de' },
  { email: 'parent@learneu.demo',  role: 'parent',  firstName: 'Sophie', lastName: 'De Vries', age: 40, social: '@sophie.dv',   language: 'nl' },
  { email: 'student@learneu.demo', role: 'student', firstName: 'Lucas',  lastName: 'Janssen',  age: 12, social: '@lucas12',     language: 'fr' }
];
const SEED_PASSWORD = 'DemoPass2026!';
const COOKIE = 'learneu_session';
const TTL_MS = 8 * 60 * 60 * 1000;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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
  const { passwordHash, ...rest } = u;
  return rest;
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
  app.use((req, _res, next) => {
    const session = verify(req.cookies && req.cookies[COOKIE]);
    if (session) {
      const u = userMap.get(session.email);
      if (u) req.user = u;
    }
    next();
  });

  app.get('/api/auth/me', (req, res) => res.json({ user: publicProfile(req.user), allowedRoles }));

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

  app.post('/api/auth/login', async (req, res) => {
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
    db.logConnection({ email: u.email, role: u.role, app: APP_NAME, event: 'login', ip, userAgent: ua }).catch(() => {});
    res.json({ user: publicProfile(u) });
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
  const PUBLIC = new Set(['/login.html', '/logo.svg', '/favicon.ico']);
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

module.exports = { mountAuth, gateMiddleware, publicProfile, getStats };

function getStats() {
  let sheetCount = 0;
  const users = [];
  for (const u of userMap.values()) {
    users.push({ email: u.email, role: u.role, language: u.language || 'en', sheets: (u.sheets || []).length });
    sheetCount += (u.sheets || []).length;
  }
  return { users, sheetCount, total: userMap.size };
}
