# Learner Web

The learner surface now ships as two experiences:

- the existing desktop web app in `public/index.html`
- the mobile-first PWA shell in `public/mobile.html`

Both surfaces share the same learner APIs, consent gating, and auth/session flow. The mobile entrypoint registers `public/sw.js`, consumes `public/manifest.webmanifest`, and keeps the web app available through the header and login screen.
