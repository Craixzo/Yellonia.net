/* ==============================================================
   des/service-admin.js - Service Admin (service-admin.html)

   The audit log: every login, failed login, lock, password change and
   member change, newest first (the last 300). Type a Badge ID to see
   one member's entries. Members are managed on the Local Admin page.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('service-admin');

  DES.requireMember().then(function (me) {
    if (!DES.hasRole(me, 'service-admin')) return DES.noAccess(main, 'This page is for Service Admins.');
    main.textContent = '';

    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Department Administration'));
    titles.appendChild(el('h1', null, 'Service Admin'));
    head.appendChild(titles);
    var manage = el('a', 'btn', 'Manage members');
    manage.href = '/des/admin.html';
    head.appendChild(manage);
    main.appendChild(head);

    var bar = el('form', 'toolbar');
    var wrap = el('label', 'tool');
    wrap.appendChild(el('span', 'label', 'Badge ID'));
    var badge = el('input', 'mono');
    badge.placeholder = 'All members';
    wrap.appendChild(badge);
    bar.appendChild(wrap);
    var wrap2 = el('label', 'tool');
    wrap2.appendChild(el('span', 'label', 'Show'));
    var kind = el('select');
    [['', 'Everything'], ['Log', 'Logins and failures'], ['Member', 'Member changes'], ['Password', 'Passwords and locks']].forEach(function (o) {
      var opt = el('option', null, o[1]); opt.value = o[0]; kind.appendChild(opt);
    });
    wrap2.appendChild(kind);
    bar.appendChild(wrap2);
    var go = el('button', 'btn', 'Show');
    go.type = 'submit';
    bar.appendChild(go);
    main.appendChild(bar);

    var panel = el('section', 'panel');
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'data-table');
    var thead = el('thead');
    var tr = el('tr');
    ['When', 'What', 'By', 'Badge', 'Details'].forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    table.appendChild(tbody);
    scroll.appendChild(table);
    panel.appendChild(scroll);
    main.appendChild(panel);

    var entries = [];
    function load() {
      DES.act('audit', { badge: badge.value.trim() }).then(function (a) {
        if (!a.success) return DES.noAccess(main, a.msg);
        entries = a.entries;
        draw();
      });
    }
    function draw() {
      tbody.textContent = '';
      var f = kind.value;
      var list = entries.filter(function (e) {
        if (!f) return true;
        if (f === 'Log') return /Log(ged)? ?in|Login/.test(e.action);
        if (f === 'Member') return /Member|reinstated|Signed out/.test(e.action);
        return /Password|lock/i.test(e.action);
      });
      if (!list.length) {
        var row = el('tr');
        var td = el('td', 'table-empty', 'Nothing recorded yet.');
        td.colSpan = 5;
        row.appendChild(td);
        tbody.appendChild(row);
      }
      list.forEach(function (e) {
        var row = el('tr');
        row.appendChild(el('td', 'mono dim', new Date(e.at).toLocaleString()));
        row.appendChild(el('td', /fail|lock|refused|removed/i.test(e.action) ? 'warn' : null, e.action));
        row.appendChild(el('td', null, e.by));
        row.appendChild(el('td', 'mono', e.target || '—'));
        row.appendChild(el('td', 'dim wrap', e.detail || ''));
        tbody.appendChild(row);
      });
    }
    bar.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    kind.addEventListener('change', draw);
    load();
  });
})();
