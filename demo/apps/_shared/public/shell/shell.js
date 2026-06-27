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
        link.innerHTML = '<span class="appshell-ico" aria-hidden="true">' + (ico || '•') + '</span><span>' + label + '</span>';
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

      // Secondary section — the cross-app / utility links from the top nav.
      var extras = document.querySelectorAll('nav.top .links a');
      var menu2 = el('ul', 'appshell-menu');
      extras.forEach(function (a) {
        var label = (a.textContent || '').trim();
        if (!label) return;
        if (a.id === 'logoutBtn' || /logout|déconnex|sign out/i.test(label)) { logoutA = a; return; }
        var li = el('li');
        var link = el('a');
        link.href = a.getAttribute('href') || '#';
        link.textContent = label;
        link.addEventListener('click', function (ev) {
          if (link.getAttribute('href') === '#' || !link.getAttribute('href')) { ev.preventDefault(); a.click(); }
        });
        li.appendChild(link);
        menu2.appendChild(li);
      });
      if (menu2.children.length) { rail.appendChild(el('div', 'appshell-group', 'Shortcuts')); rail.appendChild(menu2); }
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
    panel.innerHTML = '<div class="appshell-panel-head"><div class="appshell-avatar" id="appshellAvatar">·</div>' +
      '<div class="appshell-greet"><strong id="appshellName">Your profile</strong><span id="appshellRole"></span></div></div>' +
      '<div class="appshell-panel-section"><div class="appshell-actions">' +
      '<a href="/" title="Home">⌂</a><a href="#" id="appshellThemeBtn" title="Theme">◐</a></div></div>' +
      '<div class="appshell-panel-section" id="appshellContext"><div class="appshell-muted">Welcome back.</div></div>';
    // Theme toggle hook (reuses the editorial dongle if present).
    var tBtn = panel.querySelector('#appshellThemeBtn');
    if (tBtn) tBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      var sw = document.getElementById('themeToggle'); if (sw) sw.click();
    });
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
          var av = panel.querySelector('#appshellAvatar');
          if (av) { av.textContent = (name[0] || '·').toUpperCase(); if (u.role) av.className = 'appshell-avatar role-' + u.role; }
        }).catch(function(){});
    } catch (e) {}
    return panel;
  }

  function build() {
    if (document.body.classList.contains('has-appshell')) return;
    if (!document.querySelector('link[data-appshell]')) {
      var lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = '/shell/shell.css?v=020b'; lk.setAttribute('data-appshell', '1'); document.head.appendChild(lk);
    }
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
