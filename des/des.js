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
     without a page yet shows "Soon" with the update it comes in. */
  var MENU = [
    { id: 'dispatch', title: 'Dispatch Operations', items: [
      { name: 'CAD', roles: 'all', soon: 'Phase 4' },
      { name: 'Wanted List', roles: 'all', soon: 'Phase 3' },
    ] },
    { id: 'database', title: 'Department Database', items: [
      { name: 'Personnel Database', roles: 'all', soon: 'Phase 2' },
      { name: 'Criminal Database', roles: 'all', soon: 'Phase 3' },
      { name: 'Former Personnel', roles: ['supervisor', 'oia', 'local-admin', 'service-admin'], soon: 'Phase 2' },
    ] },
    { id: 'administration', title: 'Department Administration', items: [
      { name: 'OIA: Officer Complaints', roles: ['oia', 'service-admin'], soon: 'Phase 5' },
      { name: 'OIA: Department Complaints', roles: ['oia', 'service-admin'], soon: 'Phase 5' },
      { name: 'OFI: Active Investigations', roles: ['ofi', 'service-admin'], soon: 'Phase 5' },
      { name: 'OFI: Reported Investigations', roles: ['ofi', 'service-admin'], soon: 'Phase 5' },
      { name: 'OFI Database', roles: ['ofi', 'service-admin'], soon: 'Phase 5' },
      { name: 'Local Admin', roles: ['local-admin', 'service-admin'], soon: 'Phase 2' },
      { name: 'Service Admin', roles: ['service-admin'], soon: 'Phase 2' },
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
            var link = el('a', location.pathname === item.page ? 'current' : '', item.name);
            link.href = item.page;
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
    }
  }

  return { MENU: MENU, ROLE_NAMES: ROLE_NAMES, el: el, post: post, message: message, safeNext: safeNext, canSee: canSee, requireMember: requireMember };
})();
