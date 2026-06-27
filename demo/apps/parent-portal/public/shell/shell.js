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

  function buildRail() {
    var rail = el('nav', 'appshell-rail');
    rail.setAttribute('aria-label', 'Primary');
    // Brand from the existing top nav (logo img or first heading), else text.
    var brand = el('div', 'appshell-brand');
    var logo = document.querySelector('nav.top img');
    if (logo) { var i = logo.cloneNode(true); i.removeAttribute('height'); brand.appendChild(i); }
    else { brand.textContent = 'LearnEU'; }
    rail.appendChild(brand);

    // Primary menu — prefer the in-page workspace sections (the .tabbar tabs) so the
    // left rail navigates the app's real sections (Coursue-style). Falls back to the
    // top-nav links when there are no tabs (e.g. parent/admin pages without a tabbar).
    var tabs = document.querySelectorAll('.tabbar .tab-btn, .tabbar [role="tab"]');
    var navCfg = (window.LEARNEU_NAV && window.LEARNEU_NAV.length) ? window.LEARNEU_NAV : null;
    var logoutA = null;

    if (tabs.length) {
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
    } else if (navCfg) {
      // Standalone sub-pages (no in-page tabs): build a consistent rail from the
      // app-provided window.LEARNEU_NAV so the menu never disappears between pages.
      rail.appendChild(el('div', 'appshell-group', 'Overview'));
      var menuC = el('ul', 'appshell-menu');
      navCfg.forEach(function (item) {
        if (!item || !item.label) return;
        var li = el('li');
        var link = el('a');
        link.href = item.href || '#';
        var base = String(item.href || '').split('?')[0].split('#')[0];
        var here = location.pathname;
        var isActive = item.active === true ||
          (base && (base === here || (base === '/' && (here === '/' || here === '/index.html'))));
        if (isActive) link.className = 'active';
        link.innerHTML = (item.icon ? '<span class="appshell-ico" aria-hidden="true">' + item.icon + '</span>' : '') + '<span>' + item.label + '</span>';
        li.appendChild(link);
        menuC.appendChild(li);
      });
      rail.appendChild(menuC);
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

    // Pinned section (Settings/Logout-style) at the bottom.
    var pinned = el('div', 'appshell-pinned');
    if (logoutA) {
      var lo = el('button', 'appshell-logout', 'Logout');
      lo.type = 'button';
      lo.addEventListener('click', function () { logoutA.click(); });
      pinned.appendChild(lo);
    }
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
      '<div class="appshell-chart" aria-hidden="true">' + bars + '</div></div>' +
      '<div class="appshell-panel-section"><div class="appshell-subtitle">Quick links</div>' +
      '<ul class="appshell-quick" id="appshellQuick"></ul></div>';
    // Mobile close.
    var close = panel.querySelector('#appshellPanelClose');
    if (close) close.addEventListener('click', function (ev) { ev.preventDefault(); document.body.classList.remove('appshell-panel-open'); });
    // Quick links mirror the workspace sections (click switches the section).
    try {
      var quick = panel.querySelector('#appshellQuick');
      var tabs = document.querySelectorAll('.tabbar .tab-btn, .tabbar [role="tab"]');
      if (tabs.length) {
        tabs.forEach(function (btn) {
          var icoEl = btn.querySelector('.ico');
          var ico = icoEl ? (icoEl.textContent || '').trim() : '';
          var label = (btn.textContent || '').trim();
          if (ico) label = label.replace(ico, '').trim();
          if (!label) return;
          var li = el('li');
          var a = el('a', null, (ico ? '<span class="appshell-ico" aria-hidden="true">' + ico + '</span>' : '') + '<span>' + label + '</span>');
          a.href = '#';
          a.addEventListener('click', function (ev) { ev.preventDefault(); btn.click(); document.body.classList.remove('appshell-panel-open'); });
          li.appendChild(a);
          quick.appendChild(li);
        });
      } else if (window.LEARNEU_NAV && window.LEARNEU_NAV.length) {
        // Standalone sub-pages: mirror the declarative nav as real links.
        window.LEARNEU_NAV.forEach(function (item) {
          if (!item || !item.label) return;
          var li = el('li');
          var a = el('a', null, (item.icon ? '<span class="appshell-ico" aria-hidden="true">' + item.icon + '</span>' : '') + '<span>' + item.label + '</span>');
          a.href = item.href || '#';
          li.appendChild(a);
          quick.appendChild(li);
        });
      }
    } catch (e) {}
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
        }).catch(function(){});
    } catch (e) {}
    return panel;
  }

  function build() {
    if (document.body.classList.contains('has-appshell')) return;
    if (!document.querySelector('link[data-appshell]')) {
      var lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = '/shell/shell.css?v=020c'; lk.setAttribute('data-appshell', '1'); document.head.appendChild(lk);
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
