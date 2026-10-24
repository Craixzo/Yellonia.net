/* ==============================================================
   des/recruitment.js - Recruitment: the list of applications

   Applications come from the public form (apply.html). Supervisors and
   local admins see their own department's; Service Admins see all.
   Click one to open it on application.html.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('recruitment');
  var STATUS_CHIP = { PENDING: 'chip-amber', REVIEW: 'chip-lime', ACCEPTED: 'chip-green', DECLINED: 'chip-red', WITHDRAWN: '' };

  DES.requireMember().then(function (member) {
    if (!DES.hasRole(member, 'supervisor', 'local-admin', 'service-admin')) {
      DES.noAccess(main, 'Only supervisors and admins can see applications.');
      return;
    }
    build();
  });

  function build() {
    main.textContent = '';
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Department Administration'));
    titles.appendChild(el('h1', null, 'Recruitment'));
    head.appendChild(titles);
    var form = el('a', 'btn', 'Open the application form');
    form.href = '/apply.html';
    form.target = '_blank';
    form.rel = 'noopener';
    head.appendChild(form);
    main.appendChild(head);
    var openNote = el('p', 'dim case-intro');
    main.appendChild(openNote);

    var state = { scope: 'open' };
    var tabs = el('div', 'case-tabs');
    [['open', 'Open'], ['decided', 'Decided'], ['all', 'All']].forEach(function (t) {
      var b = el('button', 'case-tab', t[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', t[0] === state.scope ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.scope = t[0];
        Array.prototype.forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        run();
      });
      tabs.appendChild(b);
    });
    main.appendChild(tabs);

    var bar = el('form', 'toolbar');
    var wrap = el('label', 'tool');
    wrap.appendChild(el('span', 'label', 'Search'));
    var search = el('input');
    search.type = 'search';
    search.placeholder = 'Number, Roblox or Discord name';
    wrap.appendChild(search);
    bar.appendChild(wrap);
    main.appendChild(bar);

    var results = el('section', 'panel');
    main.appendChild(results);

    var timer;
    function run() {
      DES.act('applications', { scope: state.scope, q: search.value.trim() }).then(function (answer) {
        results.textContent = '';
        if (!answer.success) { results.appendChild(el('p', 'panel-body', answer.msg)); return; }
        var closed = Object.keys(answer.open).filter(function (k) { return !answer.open[k]; });
        openNote.textContent = closed.length ? 'Not taking applications right now: ' + closed.join(', ') + ' (change this in Centurion\'s settings.ts).' : 'Applications are open for every department.';
        drawTable(results, answer.applications);
      });
    }
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
    bar.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  function drawTable(panel, apps) {
    var h = el('div', 'panel-head');
    h.appendChild(el('h2', null, 'Applications'));
    h.appendChild(el('span', 'label', apps.length + (apps.length === 1 ? ' application' : ' applications')));
    panel.appendChild(h);
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'data-table');
    var tr = el('tr');
    ['Number', 'Roblox', 'Discord', 'Department', 'Status', 'Applied'].forEach(function (x) { tr.appendChild(el('th', null, x)); });
    var thead = el('thead');
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    if (!apps.length) {
      var none = el('tr');
      var td = el('td', 'table-empty', 'No applications here.');
      td.colSpan = 6;
      none.appendChild(td);
      tbody.appendChild(none);
    }
    apps.forEach(function (a) {
      var row = el('tr');
      var first = el('td');
      var link = el('a', 'row-link mono', a.number);
      link.href = '/des/application.html?id=' + encodeURIComponent(a.id);
      first.appendChild(link);
      row.appendChild(first);
      row.appendChild(el('td', null, a.robloxUsername));
      row.appendChild(el('td', null, a.discordName));
      row.appendChild(el('td', null, a.departmentShort));
      var st = el('td');
      st.appendChild(el('span', 'chip ' + (STATUS_CHIP[a.status] || ''), a.statusName));
      row.appendChild(st);
      row.appendChild(el('td', 'mono', DES.day(a.createdAt)));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    panel.appendChild(scroll);
  }
})();
