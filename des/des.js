/* ==============================================================
   des/des.js - shared by every DES back-end page

   - talks to /api/des
   - sends anyone who isn't logged in to the login page
   - draws the top bar clock and the side menu, showing only the
     sections the member's roles allow

   The side menu is only a convenience. Each back-end page and every
   back-end request also checks the member's roles on the server.

   CONTENTS
     1. THE MENU: every back-end section, who can open it, and its page
     2. HELPERS
     3. LOGIN CHECK, TOP BAR AND MENU
   ============================================================== */

window.DES = (function () {

  /* ---------- 1. THE MENU ----------
     roles: who sees it ('all' = every member). page: its address; a section
     without a page yet shows "Soon" with the update it comes in.
     count: shows a number next to it (e.g. new complaints waiting). */
  var MENU = [
    { id: 'dispatch', title: 'Dispatch Operations', items: [
      { name: 'CAD', roles: 'all', page: '/des/cad.html' },
      { name: 'Wanted List', roles: 'all', page: '/des/wanted-admin.html' },
    ] },
    { id: 'database', title: 'Department Database', items: [
      { name: 'Personnel Database', roles: 'all', page: '/des/personnel.html' },
      { name: 'Criminal Database', roles: 'all', page: '/des/criminal.html' },
      { name: 'Former Personnel', roles: ['supervisor', 'oia', 'local-admin', 'service-admin'], page: '/des/former.html' },
    ] },
    { id: 'administration', title: 'Department Administration', items: [
      { name: 'OIA: Officer Complaints', roles: ['oia', 'service-admin'], page: '/des/oia-officer.html', count: 'OFFICER.new' },
      { name: 'OIA: Department Complaints', roles: ['oia', 'service-admin'], page: '/des/oia-department.html', count: 'DEPARTMENT.new' },
      { name: 'OFI: Active Investigations', roles: ['ofi', 'service-admin'], page: '/des/ofi-active.html', count: 'FIRE.open' },
      { name: 'OFI: Reported Investigations', roles: ['ofi', 'service-admin'], page: '/des/ofi-reported.html', count: 'FIRE.new' },
      { name: 'OFI Database', roles: ['ofi', 'service-admin'], page: '/des/ofi-database.html' },
      { name: 'Local Admin', roles: ['local-admin', 'service-admin'], page: '/des/admin.html' },
      { name: 'Service Admin', roles: ['service-admin'], page: '/des/service-admin.html' },
    ] },
  ];

  var ROLE_NAMES = {
    'officer': 'Officer / Firefighter', 'dispatcher': 'Dispatcher', 'supervisor': 'Supervisor',
    'oia': 'Internal Affairs', 'ofi': 'Fire Investigations', 'local-admin': 'Local Admin', 'service-admin': 'Service Admin',
  };


  /* ---------- 2. HELPERS ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function post(action, data) {
    if (window.DES_PREVIEW && DES_PREVIEW.on()) return Promise.resolve(DES_PREVIEW.answer(action, data || {}));   /* TEMPORARY preview */
    var body = Object.assign({ action: action }, data || {});
    return fetch('/api/des', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  }

  function message(target, kind, text) {
    target.textContent = text || '';
    target.className = 'message' + (kind ? ' message-' + kind : '');
  }

  /* Only lets "next" go to a back-end page on this site */
  function safeNext(value) {
    var next = String(value || '');
    return /^\/des\/[A-Za-z0-9_\-\/.]*(#[A-Za-z0-9_-]*)?$/.test(next) && next.indexOf('..') === -1 ? next : '/des/index.html';
  }

  function canSee(item, roles) {
    if (item.roles === 'all') return true;
    return item.roles.some(function (r) { return roles.indexOf(r) !== -1; });
  }

  function initials(name) { return String(name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(); }

  /* 2026-10-24 style dates, and "1 year, 3 months" style lengths of service */
  function day(value) { return value ? new Date(value).toISOString().slice(0, 10) : '—'; }
  function service(from, to) {
    if (!from) return '—';
    var start = new Date(from), end = to ? new Date(to) : new Date();
    var months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() - (end.getDate() < start.getDate() ? 1 : 0);
    if (months < 1) { var days = Math.max(0, Math.floor((end - start) / 86400000)); return days + (days === 1 ? ' day' : ' days'); }
    var y = Math.floor(months / 12), m = months % 12, parts = [];
    if (y) parts.push(y + (y === 1 ? ' year' : ' years'));
    if (m) parts.push(m + (m === 1 ? ' month' : ' months'));
    return parts.join(', ');
  }

  /* Roles an admin may give (the server checks this too) */
  var LOCAL_GRANTABLE = ['officer', 'dispatcher', 'supervisor', 'oia', 'ofi'];
  function grantableFor(member) {
    if (member.roles.indexOf('service-admin') !== -1) return Object.keys(ROLE_NAMES);
    if (member.roles.indexOf('local-admin') !== -1) return LOCAL_GRANTABLE;
    return [];
  }

  /* "You don't have access" in place of a page's content */
  function noAccess(main, text) {
    main.textContent = '';
    var box = el('section', 'panel panel-body');
    box.appendChild(el('h1', null, 'No access'));
    box.appendChild(el('p', null, text));
    var back = el('a', null, 'Back to the dashboard');
    back.href = '/des/index.html';
    box.appendChild(back);
    main.appendChild(box);
  }

  /* Calls a back-end action; sends the person to log in if their session ended */
  function act(action, data) {
    return post(action, data).then(function (answer) {
      if (answer.signedOut) {
        location.replace('/des/login.html?next=' + encodeURIComponent(location.pathname + location.search));
        return new Promise(function () {});
      }
      return answer;
    });
  }

  /* A button that asks for a second click instead of a pop-up */
  function confirmClick(button, confirmText, action) {
    var original = button.textContent, armed = false, timer;
    button.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        button.textContent = confirmText;
        button.classList.add('btn-armed');
        timer = setTimeout(function () { armed = false; button.textContent = original; button.classList.remove('btn-armed'); }, 4000);
        return;
      }
      clearTimeout(timer);
      armed = false;
      button.textContent = original;
      button.classList.remove('btn-armed');
      action();
    });
  }


  /* ---------- 3. LOGIN CHECK, TOP BAR AND MENU ---------- */

  /* Every back-end page calls this. Resolves with the member, or sends them to log in. */
  function requireMember() {
    return post('me').then(function (answer) {
      if (!answer.member) {
        location.replace('/des/login.html?next=' + encodeURIComponent(location.pathname + location.hash));
        return new Promise(function () {});   // never continues
      }
      drawShell(answer.member);
      return answer.member;
    });
  }

  function drawShell(member) {
    /* TEMPORARY preview: a banner so nobody mistakes sample data for real records */
    if (window.DES_PREVIEW && DES_PREVIEW.on() && !document.querySelector('.preview-banner')) {
      var banner = el('div', 'preview-banner', 'Backdoor preview: sample data only. Nothing here is real, and nothing is saved.');
      document.body.insertBefore(banner, document.body.firstChild);
    }

    /* Top bar: who is logged in */
    var who = document.querySelector('[data-des="who"]');
    if (who) {
      who.textContent = '';
      who.appendChild(el('span', 'who-badge', initials(member.username)));
      var text = el('div');
      text.appendChild(el('div', 'who-name', member.rank + ' ' + member.username));
      text.appendChild(el('div', 'who-sub', member.departmentShort + ' · Badge ' + member.badgeId));
      who.appendChild(text);
      var out = el('button', 'btn', 'Log out');
      out.type = 'button';
      out.style.height = '36px';
      out.addEventListener('click', function () {
        post('logout').then(function () { location.replace('/des/login.html'); });
      });
      who.appendChild(out);
    }

    /* Clock */
    var clock = document.querySelector('[data-des="clock"]');
    if (clock) {
      var tick = function () { clock.textContent = new Date().toTimeString().slice(0, 8); };
      tick();
      setInterval(tick, 1000);
    }

    /* Side menu */
    var nav = document.querySelector('[data-des="nav"]');
    if (nav) {
      nav.textContent = '';
      var home = el('a', location.pathname.replace(/\.html$/, '').replace(/\/$/, '/index') === '/des/index' ? 'current' : '', 'Dashboard');
      home.href = '/des/index.html';
      nav.appendChild(home);
      MENU.forEach(function (section) {
        var items = section.items.filter(function (item) { return canSee(item, member.roles); });
        if (!items.length) return;
        nav.appendChild(el('h2', 'label', section.title));
        var list = el('ul');
        items.forEach(function (item) {
          var li = el('li');
          if (item.page) {
            var here = location.pathname.replace(/\.html$/, '') === item.page.replace(/\.html$/, '');
            var link = el('a', here ? 'current' : '', item.name);
            link.href = item.page;
            if (item.count) link.setAttribute('data-count', item.count);
            li.appendChild(link);
          } else {
            var soon = el('span', 'soon', item.name);
            soon.appendChild(el('span', 'soon-tag', item.soon));
            li.appendChild(soon);
          }
          list.appendChild(li);
        });
        nav.appendChild(list);
      });
      drawCounts(nav, member);
    }
  }

  /* Numbers in the side menu: new complaints and fire reports waiting (OIA/OFI only) */
  function drawCounts(nav, member) {
    if (!nav.querySelector('[data-count]') || !hasRole(member, 'oia', 'ofi', 'service-admin')) return;
    post('case-counts').then(function (answer) {
      if (!answer.success || !answer.counts) return;
      Array.prototype.forEach.call(nav.querySelectorAll('[data-count]'), function (link) {
        var parts = link.getAttribute('data-count').split('.');
        var n = answer.counts[parts[0]] ? answer.counts[parts[0]][parts[1]] : 0;
        if (n) link.appendChild(el('span', 'nav-count', String(n)));
      });
    });
  }

  function hasRole(member) {
    var wanted = Array.prototype.slice.call(arguments, 1);
    return member.roles.some(function (r) { return wanted.indexOf(r) !== -1; });
  }

  return { MENU: MENU, ROLE_NAMES: ROLE_NAMES, el: el, post: post, act: act, message: message, safeNext: safeNext, canSee: canSee,
    requireMember: requireMember, day: day, service: service, grantableFor: grantableFor, noAccess: noAccess, confirmClick: confirmClick, hasRole: hasRole };
})();
