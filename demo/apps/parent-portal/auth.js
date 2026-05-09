// LearnEU shared auth lib — demo-grade session manager.
// Production: replace SEED_USERS with Azure Table Storage via DefaultAzureCredential,
//             swap SECRET to a KV-referenced env var, add CSRF tokens, rate-limit /login.
// Demo password (all 4 users): DemoPass2026!
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

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

  app.post('/api/auth/login', async (req, res) => {
    if (!ready) return res.status(503).json({ error: 'auth not ready, retry in 1s' });
    const { email, password } = req.body || {};
    const u = userMap.get(String(email || '').toLowerCase());
    if (!u || !(await bcrypt.compare(String(password || ''), u.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (allowedRoles.length && !allowedRoles.includes(u.role)) {
      return res.status(403).json({ error: `This portal accepts: ${allowedRoles.join(', ')}. Your role: ${u.role}.` });
    }
    const token = sign({ email: u.email.toLowerCase(), role: u.role, exp: Date.now() + TTL_MS });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: TTL_MS, secure: true });
    res.json({ user: publicProfile(u) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(COOKIE);
    res.json({ ok: true });
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

module.exports = { mountAuth, gateMiddleware, publicProfile };
