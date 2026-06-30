/*
 * LearnEU — Feature 019: Unified three-column app shell (all apps).
 *
 * Progressive enhancement + OPT-IN (off by default, so it never disturbs the live demo):
 *   enable with  ?shell=1   or   localStorage.setItem('learneu_shell','on')
 *   disable with ?shell=0.
 * When active, body.has-appshell turns the page into:
 *   left navigation rail | center content (existing page) | right profile panel.
 * Built additively from the existing markup + /api/auth/me; reuses the 8 theme vars
 * and the Feature 014 age themes. Reduced-motion + responsive drawers + ARIA landmarks.
 * Paired with /shell/shell.css. Presentation-only.
 */
(function () {
  var FLAG = 'learneu_shell';
  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }

  function enabled() {
    try {
      var qs = new URLSearchParams(window.location.search);
      if (qs.get('shell') === '1') { try { localStorage.setItem(FLAG,'on'); } catch(e){} return true; }
      if (qs.get('shell') === '0') { try { localStorage.setItem(FLAG,'off'); } catch(e){} return false; }
    } catch(e){}
    return ls(FLAG) === 'on';
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // Find a section's tab button across the apps' differing conventions:
  // teacher/learner/parent use [data-tab-btn]; admin uses .tabbar button[data-tab].
  function findTab(id) {
    return document.querySelector('[data-tab-btn="' + id + '"]') ||
      document.querySelector('.tabbar [data-tab="' + id + '"]') ||
      document.querySelector('.tabbar button[onclick*="setTab(\'' + id + '\')"]');
  }
  function activeTabId() {
    var a = document.querySelector('[data-tab-btn].active') ||
      document.querySelector('.tabbar .tab-btn.active') ||
      document.querySelector('.tabbar [role="tab"].active') ||
      document.querySelector('.tabbar button.active');
    return a ? (a.getAttribute('data-tab-btn') || a.getAttribute('data-tab')) : null;
  }

  // --- Favorites: pin pages from the left rail; they appear in the right panel. ---
  var favListEl = null;
  var shellUser = null;
  function favKey() { return 'learneu_fav_' + (window.LEARNEU_APP || location.host); }
  function favItemKey(item) { return item.tab ? ('tab:' + item.tab) : ('href:' + (item.href || '')); }
  function loadFavs() { try { return JSON.parse(localStorage.getItem(favKey()) || '[]'); } catch (e) { return []; } }
  function saveFavs(arr) { try { localStorage.setItem(favKey(), JSON.stringify(arr)); } catch (e) {} }
  function toggleFav(item) {
    var k = favItemKey(item); var arr = loadFavs(); var idx = -1;
    for (var j = 0; j < arr.length; j++) { if (arr[j].key === k) { idx = j; break; } }
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push({ key: k, label: item.label, icon: item.icon || '', tab: item.tab || null, href: item.href || null });
    saveFavs(arr); renderFavorites(); syncPinStates();
    return idx < 0;
  }
  function renderFavorites() {
    if (!favListEl) return;
    favListEl.innerHTML = '';
    var favs = loadFavs();
    if (!favs.length) {
      favListEl.appendChild(el('li', 'appshell-fav-empty', 'Pin a page from the menu (📌) to add it here.'));
      return;
    }
    favs.forEach(function (item) {
      var li = el('li');
      var a = el('a', null, (item.icon ? '<span class="appshell-ico" aria-hidden="true">' + item.icon + '</span>' : '') + '<span>' + item.label + '</span>');
      a.href = item.tab ? (findTab(item.tab) ? '#' : ('/?tab=' + encodeURIComponent(item.tab))) : (item.href || '#');
      if (item.tab) a.addEventListener('click', function (ev) { var b = findTab(item.tab); if (b) { ev.preventDefault(); b.click(); document.body.classList.remove('appshell-panel-open'); } });
      var unpin = el('button', 'appshell-fav-x', '×'); unpin.type = 'button'; unpin.title = 'Remove from favorites'; unpin.setAttribute('aria-label', 'Remove from favorites');
      (function (it) { unpin.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); toggleFav(it); }); })(item);
      li.appendChild(a); li.appendChild(unpin);
      favListEl.appendChild(li);
    });
  }
  function syncPinStates() {
    var favs = loadFavs();
    document.querySelectorAll('.appshell-pin').forEach(function (btn) {
      var k = btn.getAttribute('data-favkey');
      var on = favs.some(function (f) { return f.key === k; });
      btn.classList.toggle('pinned', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Unpin from favorites' : 'Pin to favorites';
    });
  }

  function buildRail() {
    var rail = el('nav', 'appshell-rail');
    rail.setAttribute('aria-label', 'Primary');
    // Brand from the existing top nav (logo img or first heading), else text.
    var brand = el('div', 'appshell-brand');
    var logo = document.querySelector('nav.top img');
    var img;
    if (logo) { img = logo.cloneNode(true); img.removeAttribute('height'); }
    else { img = document.createElement('img'); img.src = '/logo.svg'; img.alt = 'LearnEU'; }
    brand.appendChild(img);
    // App/portal name on top of the menu (Coursue-style brand header).
    var appName = window.LEARNEU_APP || ((document.querySelector('.hero .pill') || {}).textContent || '').trim();
    if (appName) brand.appendChild(el('span', 'appshell-brand-name', appName));
    rail.appendChild(brand);

    // Primary menu — prefer the in-page workspace sections (the .tabbar tabs) so the
    // left rail navigates the app's real sections (Coursue-style). Falls back to the
    // top-nav links when there are no tabs (e.g. parent/admin pages without a tabbar).
    var tabs = document.querySelectorAll('.tabbar .tab-btn, .tabbar [role="tab"]');
    var navCfg = (window.LEARNEU_NAV && window.LEARNEU_NAV.length) ? window.LEARNEU_NAV : null;
    var logoutA = null;

    if (navCfg) {
      // Single canonical menu (window.LEARNEU_NAV) used on EVERY page so the dashboard
      // and the standalone sub-pages share ONE identical rail. Section items (with a
      // `tab`) switch the in-page section on the dashboard, or deep-link to it from a
      // sub-page (/?tab=…). Page items (with `href`) navigate.
      rail.appendChild(el('div', 'appshell-group', 'Overview'));
      var menuC = el('ul', 'appshell-menu');
      var railSync = function () {
        var id = activeTabId();
        menuC.querySelectorAll('a[data-railtab]').forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('data-railtab') === id);
        });
      };
      navCfg.forEach(function (item) {
        if (!item || !item.label) return;
        var li = el('li');
        var link = el('a');
        if (item.tab) {
          var tabBtn = findTab(item.tab);
          link.setAttribute('data-railtab', item.tab);
          link.href = tabBtn ? '#' : ('/?tab=' + encodeURIComponent(item.tab));
          if (tabBtn && tabBtn.classList.contains('active')) link.className = 'active';
          if (tabBtn) link.addEventListener('click', function (ev) {
            ev.preventDefault(); tabBtn.click(); railSync(); document.body.classList.remove('appshell-rail-open');
          });
        } else {
          link.href = item.href || '#';
          var base = String(item.href || '').split('?')[0].split('#')[0];
          var here = location.pathname;
          if (base && (base === here || (base === '/' && (here === '/' || here === '/index.html')))) link.className = 'active';
        }
        link.innerHTML = (item.icon ? '<span class="appshell-ico" aria-hidden="true">' + item.icon + '</span>' : '') + '<span>' + item.label + '</span>';
        li.appendChild(link);
        // Pin toggle — adds/removes this page from the right-column Favorites.
        var pin = el('button', 'appshell-pin', '<span aria-hidden="true">📌</span>');
        pin.type = 'button';
        pin.setAttribute('data-favkey', favItemKey(item));
        pin.setAttribute('aria-label', 'Pin to favorites');
        (function (it) { pin.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); toggleFav(it); }); })(item);
        li.appendChild(pin);
        menuC.appendChild(li);
      });
      rail.appendChild(menuC);
      logoutA = document.querySelector('nav.top #logoutBtn');
    } else if (tabs.length) {
      rail.appendChild(el('div', 'appshell-group', 'Overview'));
      var menu = el('ul', 'appshell-menu');
      tabs.forEach(function (btn) {
        var icoEl = btn.querySelector('.ico');
        var ico = icoEl ? (icoEl.textContent || '').trim() : '';
        var label = (btn.textContent || '').trim();
        if (ico) label = label.replace(ico, '').trim();
        if (!label) return;
        var li = el('li');
        var link = el('a', btn.classList.contains('active') ? 'active' : '');
        link.href = '#';
        link.innerHTML = (ico ? '<span class="appshell-ico" aria-hidden="true">' + ico + '</span>' : '') + '<span>' + label + '</span>';
        link.addEventListener('click', function (ev) {
          ev.preventDefault();
          btn.click();
          menu.querySelectorAll('a').forEach(function (x) { x.classList.remove('active'); });
          link.classList.add('active');
          document.body.classList.remove('appshell-rail-open');
        });
        li.appendChild(link);
        menu.appendChild(li);
      });
      rail.appendChild(menu);

      // Append the remaining app-local utility links from the top nav INTO the same
      // Overview menu (no separate group). Cross-app portal links + logout are excluded.
      var extras = document.querySelectorAll('nav.top .links a');
      extras.forEach(function (a) {
        var label = (a.textContent || '').trim();
        if (!label) return;
        if (a.id === 'logoutBtn' || /logout|déconnex|sign out/i.test(label)) { logoutA = a; return; }
        // Drop the cross-app portal links (keep app-local ones like Moderation, Sharing…).
        if (/^for\s+(schools|families|educators)$/i.test(label)) return;
        var li = el('li');
        var link = el('a');
        link.href = a.getAttribute('href') || '#';
        link.textContent = label;
        link.addEventListener('click', function (ev) {
          if (link.getAttribute('href') === '#' || !link.getAttribute('href')) { ev.preventDefault(); a.click(); }
        });
        li.appendChild(link);
        menu.appendChild(li);
      });
    } else {
      // Fallback: primary menu = the existing top-nav links.
      var menu0 = el('ul', 'appshell-menu');
      document.querySelectorAll('nav.top .links a').forEach(function (a) {
        var label = (a.textContent || '').trim();
        if (!label) return;
        if (a.id === 'logoutBtn' || /logout|déconnex|sign out/i.test(label)) { logoutA = a; return; }
        var li = el('li');
        var link = el('a', a.classList.contains('active') ? 'active' : '');
        link.href = a.getAttribute('href') || '#';
        link.textContent = label;
        link.addEventListener('click', function (ev) {
          if (link.getAttribute('href') === '#' || !link.getAttribute('href')) { ev.preventDefault(); a.click(); }
        });
        li.appendChild(link);
        menu0.appendChild(li);
      });
      rail.appendChild(menu0);
    }

    // Pinned footer: compliance mention, a separator, then a Sign out button.
    var pinned = el('div', 'appshell-pinned');
    pinned.appendChild(el('p', 'appshell-legal', 'EU-region inference, GDPR Art. 8 minimisation, and a child-safe interface — powered by ONNX Runtime Web and the EdTech Group LearnEU stack.'));
    pinned.appendChild(el('div', 'appshell-sep'));
    var lo = el('button', 'appshell-logout', 'Sign out');
    lo.type = 'button';
    lo.addEventListener('click', function () {
      if (logoutA) { logoutA.click(); return; }
      // Standalone pages have no top-nav logout control: sign out directly.
      try {
        window.fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .then(function () { location.href = '/login.html'; })
          .catch(function () { location.href = '/login.html'; });
      } catch (e) { location.href = '/login.html'; }
    });
    pinned.appendChild(lo);
    rail.appendChild(pinned);
    return rail;
  }

  function buildPanel() {
    var panel = el('aside', 'appshell-panel');
    panel.setAttribute('aria-label', 'Profile');
    var bars = [38, 62, 45, 80, 55, 70, 90].map(function (h) { return '<span style="height:' + h + '%"></span>'; }).join('');
    panel.innerHTML = '<div class="appshell-panel-head"><div class="appshell-avatar" id="appshellAvatar">·</div>' +
      '<div class="appshell-greet"><strong id="appshellName">Your profile</strong><span id="appshellRole"></span></div></div>' +
      '<div class="appshell-panel-sub" id="appshellGreetLine">Continue your learning journey.</div>' +
      '<div class="appshell-actions"><a href="/" title="Home" aria-label="Home">⌂</a>' +
      '<a href="#" id="appshellPanelClose" class="appshell-mobileonly" title="Close" aria-label="Close panel">✕</a></div>' +
      '<div class="appshell-panel-section"><div class="appshell-subtitle">This week</div>' +
      '<div class="appshell-chart" id="appshellChart" aria-hidden="true">' + bars + '</div></div>' +
      '<div class="appshell-panel-section"><div class="appshell-subtitle">Favorites</div>' +
      '<ul class="appshell-quick" id="appshellFav"></ul></div>';
    // Real weekly activity (7 days, old→new). Falls back to the static bars on error/empty.
    try {
      window.fetch('/api/activity/week', { credentials: 'same-origin' })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) {
          var c = d && d.counts; if (!c || !c.length) return;
          var max = Math.max.apply(null, c.concat([1]));
          var chart = panel.querySelector('#appshellChart');
          if (chart) chart.innerHTML = c.map(function (v) { return '<span style="height:' + Math.max(6, Math.round((v / max) * 100)) + '%"></span>'; }).join('');
        }).catch(function () {});
    } catch (e) {}
    // Mobile close.
    var close = panel.querySelector('#appshellPanelClose');
    if (close) close.addEventListener('click', function (ev) { ev.preventDefault(); document.body.classList.remove('appshell-panel-open'); });
    // Universal profile affordance: the panel identity header is ALWAYS the profile
    // control on EVERY page (not just pages whose legacy top bar has an avatar). If the
    // page exposes openProfile(), it opens the modal; otherwise it navigates to the main
    // app workspace where the profile is available.
    try {
      var headEl = panel.querySelector('.appshell-panel-head');
      if (headEl) {
        headEl.classList.add('appshell-head-clickable');
        headEl.setAttribute('role', 'button');
        headEl.setAttribute('title', 'Open profile');
        headEl.addEventListener('click', function () {
          if (typeof window.openProfile === 'function') { window.openProfile(); return; }
          var topAvatar = document.querySelector('nav.top .avatar');
          if (topAvatar && /openprofile/i.test(topAvatar.getAttribute('onclick') || '')) { topAvatar.click(); return; }
          showShellProfile();
        });
      }
    } catch (e) {}
    // Favorites — pages the user pinned from the left rail (📌). Persisted per app.
    favListEl = panel.querySelector('#appshellFav');
    renderFavorites();
    // Populate identity from /api/auth/me (best-effort).
    try {
      window.fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.user) return;
          var u = d.user;
          var name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.email || 'Learner';
          var nm = panel.querySelector('#appshellName'); if (nm) nm.textContent = name;
          var rl = panel.querySelector('#appshellRole'); if (rl) rl.textContent = u.role || '';
          var gl = panel.querySelector('#appshellGreetLine');
          if (gl) { var h = new Date().getHours(); var part = h < 12 ? 'Good morning' : (h < 18 ? 'Good afternoon' : 'Good evening'); gl.textContent = part + ', ' + (u.firstName || name.split(' ')[0]) + '.'; }
          var av = panel.querySelector('#appshellAvatar');
          if (av) { av.textContent = (name[0] || '·').toUpperCase(); if (u.role) av.className = 'appshell-avatar role-' + u.role; }
          shellUser = { name: name, email: u.email || '', role: u.role || '', language: u.language || '' };
        }).catch(function(){});
    } catch (e) {}
    return panel;
  }

  // Lightweight shell-native profile popup. Used on pages that do NOT define their own
  // openProfile() (e.g. home/landing pages), so the profile works in place rather than
  // redirecting elsewhere.
  function showShellProfile() {
    var existing = document.getElementById('appshellProfilePop');
    if (existing) { existing.parentNode.removeChild(existing); return; }
    var u = shellUser || { name: 'Your profile', email: '', role: '', language: '' };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
    var ov = el('div'); ov.id = 'appshellProfilePop';
    ov.setAttribute('style', 'position:fixed;inset:0;z-index:2000;background:rgba(15,27,45,0.35);display:flex;align-items:center;justify-content:center;');
    ov.innerHTML = '<div role="dialog" aria-label="Profile" style="background:#fff;border-radius:14px;min-width:300px;max-width:380px;padding:1.3rem 1.4rem;box-shadow:0 18px 50px rgba(15,27,45,0.3);font-family:Inter,system-ui,sans-serif;">' +
      '<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.9rem;">' +
      '<div class="appshell-avatar role-' + esc(u.role) + '" style="width:46px;height:46px;">' + esc((u.name[0] || '·').toUpperCase()) + '</div>' +
      '<div><strong style="font-family:Poppins,sans-serif;color:#0F1B2D;display:block;">' + esc(u.name) + '</strong>' +
      '<span style="font-size:.82rem;color:#5a6675;text-transform:capitalize;">' + esc(u.role) + '</span></div></div>' +
      '<div style="font-size:.85rem;color:#3F4A5A;line-height:1.7;border-top:1px solid #e3e7ee;padding-top:.7rem;">' +
      (u.email ? '<div><strong>Email:</strong> ' + esc(u.email) + '</div>' : '') +
      (u.language ? '<div><strong>Language:</strong> ' + esc(u.language) + '</div>' : '') +
      '<div style="margin-top:.4rem;color:#5a6675;">Data stays in West Europe · GDPR Art. 8</div></div>' +
      '<div style="display:flex;gap:.5rem;margin-top:1.1rem;">' +
      '<button id="appshellProfileClose" style="flex:1;padding:.55rem;border:1px solid #e3e7ee;border-radius:9px;background:#fff;font:inherit;cursor:pointer;">Close</button>' +
      '<button id="appshellProfileLogout" style="flex:1;padding:.55rem;border:0;border-radius:9px;background:#0F1B2D;color:#fff;font:inherit;font-weight:600;cursor:pointer;">Sign out</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    var done = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    ov.addEventListener('click', function (e) { if (e.target === ov) done(); });
    var cb = ov.querySelector('#appshellProfileClose'); if (cb) cb.addEventListener('click', done);
    var lb = ov.querySelector('#appshellProfileLogout');
    if (lb) lb.addEventListener('click', function () {
      window.fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
        .then(function () { location.href = '/login.html'; })
        .catch(function () { location.href = '/login.html'; });
    });
  }

  function build() {
    if (document.body.classList.contains('has-appshell')) return;
    if (!document.querySelector('link[data-appshell]')) {
      var lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = '/shell/shell.css?v=020h'; lk.setAttribute('data-appshell', '1'); document.head.appendChild(lk);
    }
    // Center top bar: drop a search field into the existing top nav (Coursue-style).
    // CSS then hides the now-redundant brand + cross-app links in that nav, keeping
    // its action buttons (status / sheets / profile) intact with their handlers.
    try {
      var topWrap = document.querySelector('nav.top .wrap') || document.querySelector('nav.top');
      if (topWrap && !topWrap.querySelector('.appshell-search')) {
        var search = el('div', 'appshell-search');
        search.innerHTML = '<span class="appshell-search-ico" aria-hidden="true">⌕</span>' +
          '<input type="search" placeholder="Search…" aria-label="Search">';
        topWrap.insertBefore(search, topWrap.firstChild);
      }
    } catch (e) {}
    var rail = buildRail();
    var panel = buildPanel();

    // Mobile toggles (rail + panel become off-canvas drawers).
    var bar = el('div', 'appshell-mobilebar');
    var navBtn = el('button', 'appshell-iconbtn', '☰'); navBtn.type = 'button'; navBtn.setAttribute('aria-label', 'Menu');
    var proBtn = el('button', 'appshell-iconbtn', '◑'); proBtn.type = 'button'; proBtn.setAttribute('aria-label', 'Profile');
    navBtn.addEventListener('click', function () { document.body.classList.toggle('appshell-rail-open'); });
    proBtn.addEventListener('click', function () { document.body.classList.toggle('appshell-panel-open'); });
    var scrim = el('div', 'appshell-scrim');
    scrim.addEventListener('click', function () { document.body.classList.remove('appshell-rail-open', 'appshell-panel-open'); });
    bar.appendChild(navBtn);
    var sp = el('span', 'appshell-mobilebrand', 'LearnEU'); bar.appendChild(sp);
    bar.appendChild(proBtn);

    document.body.appendChild(rail);
    document.body.appendChild(panel);
    document.body.appendChild(bar);
    document.body.appendChild(scrim);
    document.body.classList.add('has-appshell');
    // Reflect any already-pinned favorites on the rail pin buttons.
    try { syncPinStates(); } catch (e) {}

    // Relocate the page footer out of the centre column and pin it to the bottom
    // of the right profile panel (consistent across every app).
    try {
      var pageFooter = document.querySelector('body > footer, main ~ footer, footer');
      if (pageFooter && !rail.contains(pageFooter) && !panel.contains(pageFooter)) {
        panel.appendChild(pageFooter);
      }
    } catch (e) {}

    // Gather the top-nav action controls (profile / sheets / status) into the right
    // (3rd) column. The profile button + its icon live in the panel header; the
    // remaining utilities sit in the panel actions row. Top bar keeps only search.
    try {
      var actions = panel.querySelector('.appshell-actions');
      var head = panel.querySelector('.appshell-panel-head');
      var avatarBtn = document.querySelector('nav.top .avatar');
      if (avatarBtn) {
        // The panel identity header is now the universal profile control (works on every
        // page, opens the app modal or the shell popup). The legacy top-bar avatar would
        // duplicate it in the actions row, so hide it for a consistent layout everywhere.
        avatarBtn.classList.add('appshell-hidden-top');
      }
      var statusWrap = document.querySelector('nav.top .status-wrap');
      var sheetsBtn = document.querySelector('nav.top #sheetsBtn, nav.top .nav-icon');
      if (actions) {
        if (statusWrap) { statusWrap.classList.add('appshell-moved'); actions.appendChild(statusWrap); }
        if (sheetsBtn) { sheetsBtn.classList.add('appshell-moved'); actions.appendChild(sheetsBtn); }
      }
    } catch (e) {}

    // Deep-link: if we arrived via /?tab=<id> from another page, open that section
    // and reflect it in the rail's active state.
    try {
      var qtab = new URLSearchParams(location.search).get('tab');
      if (qtab) {
        var qb = findTab(qtab);
        if (qb) {
          qb.click();
          document.querySelectorAll('.appshell-rail .appshell-menu a[data-railtab]').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('data-railtab') === qtab);
          });
        }
      }
    } catch (e) {}
  }

  function start() {
    if (!enabled()) return;        // dormant unless explicitly enabled
    try { build(); } catch (e) { /* fail safe: leave page untouched */ }
  }
  // Expose a tiny API to flip the shell.
  window.LearnEUShell = {
    enable: function () { try { localStorage.setItem(FLAG, 'on'); } catch(e){} location.reload(); },
    disable: function () { try { localStorage.setItem(FLAG, 'off'); } catch(e){} location.reload(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
